// src/ocpp/ocppHandlers.js
import * as chargerService from "../services/charger.service.js";
import * as chargecController from "../controllers/charges.controller.js";

export async function handleOcppRequest({ ws, uid, action, payload, chargePointId }) {
    console.log("OCPP ACTION:", action);

    switch (action) {
        // ------------------------------
        // 1. BootNotification
        // ------------------------------
        case "BootNotification":
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
            ws.send(JSON.stringify([3, uid, {}]));
            break;

        // ------------------------------
        // 4. StartTransaction 
        // ------------------------------
        case "StartTransaction":
            try {
                console.log(`⚡ StartTransaction from ${chargePointId}`, payload);
                const { connectorId, idTag, meterStart, timestamp, transactionId } = payload;
                const ocppTransactionId = transactionId ?? Math.floor(Math.random() * 100000);

                let charge = await chargecController.findPendingByCharger(chargePointId);
                console.log("Found pending charge:", charge, chargePointId);
                if (charge) {
                    // Update charge with OCPP transaction ID and CHARGING status
                    await chargecController.updateChargeWithOcppTx(charge.id, {
                        ocpp_transaction_id: ocppTransactionId,
                        status: "CHARGING",
                        meter_start: meterStart ?? charge.meter_start,
                        start_time: timestamp || charge.start_time || new Date()
                    });
                } else {
                    // No pending charge exists (maybe charger started manually), create new
                    const newChargePayload = {
                        charger_id: chargePointId,
                        customer_id: null,
                        start_time: timestamp || new Date(),
                        end_time: null,
                        amount: null,
                        status: "CHARGING",
                        note: "UNKOWN - Started via OCPP without pending session",
                        vehicle_number: null,
                        ocpp_transaction_id: ocppTransactionId,
                        meter_start: meterStart ?? null
                    };
                    charge = await chargecController.createCharge(newChargePayload);
                }

                await chargecController.setActiveChargeAndStatus(chargePointId, charge.id, "CHARGING");

                ws.send(JSON.stringify([
                    3,
                    uid,
                    {
                        transactionId: ocppTransactionId,
                        idTagInfo: { status: "Accepted" }
                    }
                ]));
                console.log(`StartTransaction handled: charger=${chargePointId}, charge=${charge.id}, tx=${ocppTransactionId}`);
            } catch (err) {
                console.log("Error handling StartTransaction:", err);
                ws.send(JSON.stringify([4, uid, "InternalError", "Error processing StartTransaction", {}]));
            }


            break;

        // ------------------------------
        // 5. StopTransaction 
        // ------------------------------
        case "StopTransaction":
            console.log(`🛑 StopTransaction from ${chargePointId}`, payload);

            ws.send(JSON.stringify([
                3,
                uid,
                { idTagInfo: { status: "Accepted" } }
            ]));

            break;

        // ------------------------------
        // 6. Meter Values
        // ------------------------------
        case "MeterValues":
            console.log(`📊 MeterValues from ${chargePointId}`, JSON.stringify(payload, null, 2));
            ws.send(JSON.stringify([3, uid, {}])); // Accept without error
            break;
        // ------------------------------
        // UNKNOWN ACTION
        // ------------------------------
        default:
            ws.send(JSON.stringify([4, uid, "NotImplemented", "Unknown action", {}]));
    }
}
