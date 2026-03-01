// src/ocpp/ocppHandlers.js
import * as chargerService from "../services/charger.service.js";
import * as chargeController from "../controllers/charges.controller.js";
import { sendToUser } from "../websocket/frontendws.js";
import { setChargerIdle, setChargerUnavailable } from "../controllers/ocppController.js";

// chargerPointId refers to the charger name here.
export async function handleOcppRequest({ ws, uid, action, payload, chargerName }) {
    console.log("OCPP ACTION:", action);

    switch (action) {
        // ------------------------------
        // 1. BootNotification
        // ------------------------------
        case "BootNotification":
            await setChargerIdle(chargerName);
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
                console.log(`⚡ StartTransaction from ${chargerName}`, payload);
                const { connectorId, idTag, meterStart, timestamp, transactionId } = payload;
                const ocppTransactionId = transactionId ?? Math.floor(Math.random() * 100000);
                let charge = await chargeController.findPendingByCharger(chargerName);
                console.log("Found pending charge to start:", charge, chargerName);
                if (charge) {
                    // Update charge with OCPP transaction ID and CHARGING status
                    await chargeController.updateChargeWithOcppTx(charge.id, {
                        ocpp_transaction_id: ocppTransactionId,
                        status: "CHARGING",
                        meter_start: meterStart ?? charge.meter_start,
                        start_time: new Date(timestamp) || charge.start_time || new Date()
                    });
                } else {
                    // No pending charge exists (maybe charger started manually), create new
                    const newChargePayload = {
                        charger_id: chargerName,
                        customer_id: null,
                        start_time: new Date(timestamp) || new Date(),
                        end_time: null,
                        amount: null,
                        status: "CHARGING",
                        note: "UNKOWN - Started via OCPP without pending session",
                        vehicle_number: null,
                        ocpp_transaction_id: ocppTransactionId,
                        meter_start: meterStart ?? null
                    };
                    charge = await chargeController.createCharge(newChargePayload);
                }

                await chargeController.setActiveChargeAndStatus(chargerName, charge.id, "CHARGING", 0);

                ws.send(JSON.stringify([
                    3,
                    uid,
                    {
                        transactionId: ocppTransactionId,
                        idTagInfo: { status: "Accepted" }
                    }
                ]));

                const charger = await chargerService.getChargerById(chargerName);
                if (charger && charger.user_id) {
                    sendToUser(charger.user_id, {
                        type: "charging_started",
                        chargerId: chargerName,
                        chargeId: charge.id,
                        startTime: charge.start_time,
                        status: "CHARGING",
                        meterStart: meterStart
                    });
                }
                console.log(`StartTransaction handled: charger=${chargerName}, charge=${charge.id}, tx=${ocppTransactionId}`);

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
                console.log(`🛑 StopTransaction from ${chargerName}`, payload);
                const { transactionId, meterStop, timestamp, transactionData } = payload;
                const charge = await chargeController.findByOcppTransactionId(transactionId);
                console.log("Found pending charge for stop:", charge, chargerName);
                if (charge) {
                    const durationMs = new Date(timestamp) - new Date(charge.start_time);
                    const durationHours = durationMs / (1000 * 60 * 60);
                    const energyUsed = meterStop - (charge.meter_start || 0);

                    const charger = await chargerService.getChargerById(chargerName);
                    const cost = energyUsed * (charger?.price_per_kwh || 0);

                    await chargeController.stopChargeWithOcppTx(charge.id, {
                        end_time: new Date(timestamp),
                        meter_stop: meterStop,
                        amount: cost,
                        status: "COMPLETED"
                    });
                    // Update charger status to IDLE and clear active charge status to IDLE and active charge Id to null
                    await chargeController.setActiveChargeAndStatus(chargerName, null, "IDLE", cost);

                    if (charger && charger.user_id) {
                        sendToUser(charger.user_id, {
                            type: "charging_stopped",
                            chargerId: chargerName,
                            chargeId: charge.id,
                            endTime: charge.end_time,
                            status: "COMPLETED",
                            meterStop: charge.meter_stop
                        });
                    }
                    console.log(`StopTransaction handled: charger=${chargerName}, charge=${charge.id}, tx=${transactionId}`);
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
            console.log(`📊 MeterValues from ${chargerName}`, JSON.stringify(payload, null, 2));
            const { meterValue = [] } = payload;
            meterValue.forEach((reading) => {
                reading.sampledValue.forEach(async (value) => {
                    if (value.measurand === "Energy.Active.Import.Register") {
                        const currentEnergy = parseFloat(value.value);
                        const timestamp = reading.timestamp;
                        chargeController.findPendingByCharger(chargerName).then(async (charge) => {
                            if (charge) {
                                const durationMs = new Date(timestamp) - new Date(charge.start_time);
                                const durationHours = durationMs / (1000 * 60 * 60);
                                const energyUsed = currentEnergy - (charge.meter_start || 0);
                                console.log(`-- Updating charge ${charge.id}: energy used ${energyUsed} Wh over ${durationHours.toFixed(2)} hours`);

                                const charger = await chargerService.getChargerById(chargerName);
                                const cost = energyUsed * (charger?.price_per_kwh || 0);

                                if (charger && charger.user_id) {
                                    sendToUser(charger.user_id, {
                                        type: "meter_update",
                                        chargerId: chargerName,
                                        chargeId: charge.id,
                                        amount: cost,
                                        durationMs: durationMs,
                                        energyUsed: energyUsed,
                                        timestamp: timestamp
                                    });
                                }
                            }
                        })


                    }
                })
            })
            ws.send(JSON.stringify([3, uid, {}])); // Accept without error
            break;
        // ------------------------------
        // UNKNOWN ACTION
        // ------------------------------
        default:
            ws.send(JSON.stringify([4, uid, "NotImplemented", "Unknown action", {}]));
    }
}
