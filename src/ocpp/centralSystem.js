// src/ocpp/centralSystem.js
import { WebSocketServer } from "ws";
import { handleOcppRequest } from "./ocppHandlers.js";
import { setChargerUnavailable } from "../controllers/ocppController.js";
import { broadcastToFrontend, sendToUser } from "../websocket/frontendws.js";
import { pool } from "../config/db.js";
import * as walletService from "../services/wallet.service.js";

const PORT = 8080;

const connectedChargers = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 OCPP Server running on ws://localhost:${PORT}`);

// When a charger connects
wss.on("connection", (ws, req) => {
    const urlParts = req.url.split("/");
    const chargePointId = urlParts.pop();
    ws.isAlive = true;
    console.log(`🔌 Charger connected: ${chargePointId}`);

    connectedChargers.set(chargePointId, ws);

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on("message", async (msg) => {
        try {
            const message = JSON.parse(msg.toString());
            const [msgType, uid, action, payload] = message;

            if (msgType === 2) {
                await handleOcppRequest({
                    ws,
                    uid,
                    action,
                    payload,
                    chargePointId
                });
            }
        } catch (err) {
            console.error("❌ Invalid OCPP message:", err);
        }
    });

    ws.on("close", () => {
        console.log(`❌ Charger disconnected: ${chargePointId}`);

        // Handle  CHARGING sessions due to power cut / internet loss
        handleUnplannedCharges(chargePointId);

        broadcastToFrontend({
            type: "connector_status_updated",
            chargerId: chargePointId,
            connectorId: null, // connectorId null means all connectors of this charger
            status: "UNAVAILABLE"
        });
        setChargerUnavailable(chargePointId);
        connectedChargers.delete(chargePointId);
    });
});


const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log(`⚠️ Charger ${ws.chargePointId} missed pong. Terminating connection.`);
            return ws.terminate(); // මේකෙන් කෙළින්ම 'close' event එක ට්‍රිගර් වෙනවා
        }

        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // හැම තත්පර 30කට සැරයක්ම චෙක් කරනවා

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

// Handle CHARGING sessions left unplanned by charger disconnect
// Completes them, calculates final cost, deducts wallet, and credits agent
async function handleUnplannedCharges(chargePointId) {
    const connection = await pool.getConnection();
    try {
        // Find all CHARGING charges for the disconnected charger
        const [chargingCharges] = await connection.query(
            `SELECT 
                ch.id,
                ch.customer_id,
                ch.connector_id,
                ch.meter_start,
                ch.meter_stop,
                ch.charger_id,
                c.price_per_kwh,
                c.user_id AS charger_owner_id
             FROM charges ch
             JOIN chargers c ON ch.charger_id = c.id
             WHERE ch.charger_id = ? AND ch.status = 'CHARGING'`,
            [chargePointId]
        );

        if (chargingCharges.length === 0) {
            return; // No orphaned charges
        }

        console.log(`[UNPLANNED] Found ${chargingCharges.length} unplanned CHARGING session(s) for charger ${chargePointId}`);

        for (const charge of chargingCharges) {
            try {
                await connection.beginTransaction();

                // Calculate final cost using last recorded meter reading
                const meterStop = charge.meter_stop ?? charge.meter_start ?? 0;
                const energyUsed = meterStop - (charge.meter_start ?? 0);
                const cost = Math.max(0, energyUsed * (charge.price_per_kwh ?? 0));

                // Update charge to COMPLETED with calculated amount
                await connection.query(
                    `UPDATE charges 
                     SET status = 'COMPLETED', amount = ?, end_time = NOW(), 
                         note = 'Auto-completed due to charger disconnection'
                     WHERE id = ?`,
                    [cost, charge.id]
                );

                console.log(`[UNPLANNED] Completed charge ${charge.id}: cost=${cost.toFixed(2)}, energyUsed=${energyUsed.toFixed(2)}kWh`);

                // Deduct from customer wallet and credit agent commission
                if (charge.customer_id && cost > 0) {
                    const [userRows] = await connection.query(
                        "SELECT role FROM users WHERE id = ?",
                        [charge.customer_id]
                    );

                    if (userRows[0]?.role === "CUSTOMER") {
                        await walletService.deductBalance(
                            charge.customer_id,
                            charge.id,
                            cost,
                            chargePointId
                        );
                        console.log(`[UNPLANNED] Wallet deducted for customer ${charge.customer_id}: ${cost.toFixed(2)} LKR`);
                    }
                }

                await connection.commit();

                // Notify customer about the auto-completion
                if (charge.customer_id) {
                    sendToUser(charge.customer_id, {
                        type: "charging_stopped",
                        message: "Charging session ended due to charger disconnection (power loss / internet loss)",
                        chargerId: charge.charger_id,
                        connectorId: charge.connector_id,
                        chargeId: charge.id,
                        amount: cost,
                        energyUsed: energyUsed,
                        status: "COMPLETED",
                        reason: "charger_disconnect"
                    });
                }

                // Notify charger owner if they have a frontend session
                if (charge.charger_owner_id) {
                    sendToUser(charge.charger_owner_id, {
                        type: "charge_auto_completed",
                        message: "A charging session was auto-completed due to charger disconnection",
                        chargerId: charge.charger_id,
                        chargeId: charge.id,
                        amount: cost,
                        energyUsed: energyUsed,
                        reason: "charger_disconnect"
                    });
                }
            } catch (chargeErr) {
                await connection.rollback();
                console.error(`[UNPLANNED] Error processing charge ${charge.id}:`, chargeErr);
            }
        }
    } catch (err) {
        console.error("[UNPLANNED] Error handling unplanned charges:", err);
    } finally {
        connection.release();
    }
}

export default connectedChargers;
