// src/ocpp/ocppHandlers.js
import { pool } from "../config/db.js";
import * as chargerService from "../services/charger.service.js";
import * as chargeController from "../controllers/charges.controller.js";
import { sendToUser } from "../websocket/frontendws.js";
import { setChargerIdle, updateConnectorStatus } from "../controllers/ocppController.js";
import * as walletService from "../services/wallet.service.js";
import { sendRemoteStop } from "./ocppSender.js";

// chargerPointId refers to the charger name here.
export async function handleOcppRequest({ ws, uid, action, payload, chargePointId }) {
    console.log("OCPP ACTION:", action);

    switch (action) {
        // ------------------------------
        // 1. BootNotification
        // ------------------------------
        case "BootNotification":
            console.log(`✅ ${chargePointId} booted`, payload);
            await setChargerIdle(chargePointId);
            ws.send(JSON.stringify([3, uid, {
                status: "Accepted",
                currentTime: new Date().toISOString(),
                interval: 300
            }]));
            break;

        // ------------------------------
        // 2. Heartbeat
        // ------------------------------
        case "Heartbeat":
            ws.send(JSON.stringify([3, uid, { currentTime: new Date().toISOString() }]));
            break;

        // ------------------------------
        // 3. StatusNotification
        // ------------------------------
        case "StatusNotification":
            const chargerStatus = payload.status;
            const statusConnectorId = payload.connectorId;
            console.log(`📡 ${chargePointId} connector ${statusConnectorId} status: ${chargerStatus}`);
            if (statusConnectorId && statusConnectorId > 0) {
                // Update specific connector status
                console.log(`💠💠💠Changing status of charger ${chargePointId} connector ${statusConnectorId} to ${chargerStatus}`);
                await updateConnectorStatus(chargePointId, statusConnectorId, chargerStatus);
            }
            ws.send(JSON.stringify([3, uid, {}]));
            break;

        // ------------------------------
        // 4. StartTransaction 
        // ------------------------------
        case "StartTransaction":
            try {
                console.log(`⚡ StartTransaction from ${chargePointId}`, payload);

                const { connectorId, idTag, meterStart, timestamp, transactionId } = payload;

                // Resolve charger DB record from ocpp_id
                const startCharger = await chargerService.getChargerById(chargePointId);
                if (!startCharger) {
                    console.error(`Charger not found for ocpp_id: ${chargePointId}`);
                    ws.send(JSON.stringify([4, uid, "InternalError", "Charger not found", {}]));
                    break;
                }

                let charge = await chargeController.findPendingByCharger(startCharger.id, connectorId);
                const dbTxId = charge ? charge.id : Math.floor(Math.random() * 100000);

                // If there is a charging session available for this connector
                if (charge) {
                    await chargeController.updateChargeWithOcppTx(charge.id, {
                        ocpp_transaction_id: dbTxId,
                        status: "CHARGING",
                        meter_start: meterStart ?? charge.meter_start,
                        start_time: new Date(timestamp) || charge.start_time || new Date()
                    });
                } else {
                    // No pending charge exists (maybe charger started manually), create new value
                    const newChargePayload = {
                        charger_id: startCharger.id,
                        connector_id: connectorId,
                        customer_id: null,
                        start_time: new Date(timestamp) || new Date(),
                        end_time: null,
                        amount: null,
                        status: "CHARGING",
                        note: "UNKNOWN - Started via OCPP without pending session",
                        vehicle_number: null,
                        ocpp_transaction_id: dbTxId,
                        meter_start: meterStart ?? null
                    };
                    charge = await chargeController.createCharge(newChargePayload);
                    await chargeController.updateChargeWithOcppTx(charge.id, {
                        ocpp_transaction_id: charge.id,
                        status: "CHARGING",
                        meter_start: meterStart ?? charge.meter_start,
                        start_time: new Date(timestamp) || charge.start_time || new Date()
                    });
                }

                // Update connector status to CHARGING and set active charge Id
                await chargeController.setActiveChargeAndStatus(startCharger.id, connectorId, charge.id, "CHARGING");

                ws.send(JSON.stringify([
                    3,
                    uid,
                    {
                        transactionId: charge.id,
                        idTagInfo: { status: "Accepted" }
                    }
                ]));

                // Sending the status to frontend via websocket
                if (startCharger.user_id) {
                    console.log(`Sending charging_started event to user ${startCharger.user_id} for charger ${chargePointId}, connector ${connectorId}`);
                    sendToUser(startCharger.user_id, {
                        type: "charging_started",
                        chargerId: startCharger.id,
                        connectorId: connectorId,
                        chargeId: charge.id,
                        startTime: charge.start_time,
                        status: "CHARGING",
                        meterStart: meterStart
                    });
                }

                console.log(`StartTransaction handled: charger=${chargePointId}, connector=${connectorId}, charge=${charge.id}, tx=${dbTxId}`);

            } catch (err) {
                console.log("Error handling StartTransaction:", err);
                ws.send(JSON.stringify([4, uid, "InternalError", "Error processing StartTransaction", {}]));
            }


            break;

        // ------------------------------
        // 5. StopTransaction 
        // ------------------------------
        case "StopTransaction":
            try {
                console.log(`🛑 StopTransaction from ${chargePointId}`, payload);
                const { transactionId, meterStop, timestamp, transactionData } = payload;
                const charge = await chargeController.findByOcppTransactionId(transactionId);
                console.log("Found pending charge for stop:", charge, chargePointId);
                if (charge) {
                    const energyUsed = meterStop - (charge.meter_start || 0);

                    const stopCharger = await chargerService.getChargerById(chargePointId);
                    const cost = energyUsed * (stopCharger?.price_per_kwh || 0);

                    await chargeController.stopChargeWithChargeId(charge.id, {
                        end_time: new Date(timestamp),
                        meter_stop: meterStop,
                        amount: cost,
                        status: "COMPLETED"
                    });
                    // Update connector status to IDLE and clear active charge
                    await chargeController.setActiveChargeAndStatus(charge.charger_id, charge.connector_id, null, "AVAILABLE");
                    
                    if (charge.customer_id && cost > 0) {
                        const [stopUserRows] = await pool.query("SELECT role FROM users WHERE id = ?", [charge.customer_id]);
                        if (stopUserRows[0]?.role === "CUSTOMER") {
                            await walletService.deductBalance(charge.customer_id, charge.id, cost);
                            console.log(`💰 Deducted ${cost} from user ${charge.customer_id}'s wallet.`);
                        }
                    }

                    if (stopCharger && stopCharger.user_id) {
                        sendToUser(stopCharger.user_id, {
                            type: "charging_stopped",
                            chargerId: charge.charger_id,
                            connectorId: charge.connector_id,
                            chargeId: charge.id,
                            amount: cost,
                            energyUsed: energyUsed,
                            endTime: charge.end_time,
                            status: "COMPLETED",
                            meterStop: charge.meter_stop
                        });
                    }
                    console.log(`StopTransaction handled: charger=${chargePointId}, connector=${charge.connector_id}, charge=${charge.id}, tx=${transactionId}`);
                }

                ws.send(JSON.stringify([
                    3,
                    uid,
                    { idTagInfo: { status: "Accepted" } }
                ]));
            } catch (err) {
                console.log("Error handling StopTransaction:", err);
                ws.send(JSON.stringify([4, uid, "InternalError", "Error processing StopTransaction", {}]));
            }

            break;

        // ------------------------------
        // 6. Meter Values
        // ------------------------------
        case "MeterValues":
            // console.log(`📊 MeterValues from ${chargePointId}`, JSON.stringify(payload, null, 2));
            const txId = payload.transactionId;
            const meterConnectorId = payload.connectorId;
            const meterValue = payload.meterValue[0].sampledValue.find(v => v.measurand === "Energy.Active.Import.Register");
            const timestamp = payload.timestamp;
            if (meterValue) {
                const currentReading = parseFloat(meterValue.value);
                await chargeController.updateMeterReadings(txId, currentReading);
                // console.log(meterValue);
                const meterCharger = await chargerService.getChargerById(chargePointId);
                const charge = await chargeController.findByOcppTransactionId(txId);

                if (meterCharger && meterCharger.user_id && charge) {
                    // 1. Energy Calculation (kWh)
                    const energyConsumedKwh = currentReading - charge.meter_start;

                    // 2. Cost Calculation
                    const currentCost = energyConsumedKwh * (meterCharger?.price_per_kwh || 0);
                    console.log(`Meter update for charger ${chargePointId}, connector ${meterConnectorId}: energy used = ${energyConsumedKwh} kWh, current cost = ${currentCost}`);

                    if (charge && charge.customer_id) {
                        // Check if user is a customer (not agent) before wallet check
                        const [userRows] = await pool.query("SELECT role FROM users WHERE id = ?", [charge.customer_id]);
                        const userRole = userRows[0]?.role;

                        if (userRole === "CUSTOMER") {
                            const currentBalance = await walletService.getBalance(charge.customer_id);
                            const estimatedCost = energyConsumedKwh * (meterCharger?.price_per_kwh || 0);

                            if (currentBalance - estimatedCost <= 10) {
                                console.warn(`⚠️ Insufficient balance for user ${charge.customer_id}. Sending Remote Stop.`);

                                // 1. send remote stop command to charger
                                sendRemoteStop(chargePointId, txId);

                                // 2. Send alert to user about insufficient balance
                                sendToUser(charge.customer_id, {
                                    type: "insufficient_balance",
                                    message: "Charging stopped due to insufficient wallet balance. Please recharge your wallet.",
                                    currentBalance: currentBalance,
                                    estimatedCost: estimatedCost
                                });
                            }
                        }
                    }

                    // 3. Duration Calculation (in seconds)
                    const startTime = new Date(charge.start_time).getTime();
                    const currentTime = new Date().getTime();
                    const durationSeconds = Math.floor((currentTime - startTime) / 1000);

                    sendToUser(meterCharger.user_id, {
                        type: "meter_update",
                        chargerId: meterCharger.id,
                        connectorId: meterConnectorId,
                        chargeId: charge.id,
                        amount: currentCost,
                        durationSeconds: durationSeconds,
                        energyUsed: energyConsumedKwh,
                        timestamp: timestamp
                    });
                }
            }
            ws.send(JSON.stringify([3, uid, {}])); // Accept without error
            break;
        // ------------------------------
        // UNKNOWN ACTION
        // ------------------------------
        default:
            ws.send(JSON.stringify([4, uid, "NotImplemented", "Unknown action", {}]));
    }
}
