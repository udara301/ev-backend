// src/ocpp/ocppHandlers.js
import * as chargerService from "../services/charger.service.js";
import * as chargeController from "../controllers/charges.controller.js";
import { sendToUser } from "../websocket/frontendws.js";
import { setChargerIdle, updateStatus } from "../controllers/ocppController.js";
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
            console.log(`📡 ${chargePointId} status: ${chargerStatus}`);
            // updateStatus(chargePointId, chargerStatus); ---> some status are not available in the table. Need to update or check before update
            ws.send(JSON.stringify([3, uid, {}]));
            break;

        // ------------------------------
        // 4. StartTransaction 
        // ------------------------------
        case "StartTransaction":
            try {
                console.log(`⚡ StartTransaction from ${chargePointId}`, payload);

                const { connectorId, idTag, meterStart, timestamp, transactionId } = payload;
                let charge = await chargeController.findPendingByCharger(chargePointId);
                const dbTxId = charge ? charge.id : Math.floor(Math.random() * 100000);

                // If there is a charging session available in the charger
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
                        charger_id: chargePointId,
                        customer_id: null,
                        start_time: new Date(timestamp) || new Date(),
                        end_time: null,
                        amount: null,
                        status: "CHARGING",
                        note: "UNKOWN - Started via OCPP without pending session",
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

                // make charger status to CHARGING and set active charge Id to the current charge Id
                await chargeController.setActiveChargeAndStatus(chargePointId, charge.id, "CHARGING", 0);

                ws.send(JSON.stringify([
                    3,
                    uid,
                    {
                        transactionId: charge.id,
                        idTagInfo: { status: "Accepted" }
                    }
                ]));

                // Sending the status to frontend via websocket
                const charger = await chargerService.getChargerById(chargePointId);
                if (charger && charger.user_id) {
                    sendToUser(charger.user_id, {
                        type: "charging_started",
                        chargerId: chargePointId,
                        chargeId: charge.id,
                        startTime: charge.start_time,
                        status: "CHARGING",
                        meterStart: meterStart
                    });
                }

                console.log(`StartTransaction handled: charger=${chargePointId}, charge=${charge.id}, tx=${dbTxId}`);

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
                    // const durationMs = new Date(timestamp) - new Date(charge.start_time);
                    // const durationHours = durationMs / (1000 * 60 * 60);
                    const energyUsed = meterStop - (charge.meter_start || 0);

                    const charger = await chargerService.getChargerById(chargePointId);
                    const cost = energyUsed * (charger?.price_per_kwh || 0);

                    await chargeController.stopChargeWithChargeId(charge.id, {
                        end_time: new Date(timestamp),
                        meter_stop: meterStop,
                        amount: cost,
                        status: "COMPLETED"
                    });
                    // Update charger status to IDLE and clear active charge status to IDLE and active charge Id to null
                    await chargeController.setActiveChargeAndStatus(chargePointId, null, "IDLE", cost);
                    
                    if (charge.customer_id && cost > 0) {
                        await walletService.deductBalance(charge.customer_id, charge.id, cost);
                        console.log(`💰 Deducted ${cost} from user ${charge.customer_id}'s wallet.`);
                    }

                    if (charger && charger.user_id) {
                        sendToUser(charger.user_id, {
                            type: "charging_stopped",
                            chargerId: chargePointId,
                            chargeId: charge.id,
                            amount: cost,
                            energyUsed: energyUsed,
                            endTime: charge.end_time,
                            status: "COMPLETED",
                            meterStop: charge.meter_stop
                        });
                    }
                    console.log(`StopTransaction handled: charger=${chargePointId}, charge=${charge.id}, tx=${transactionId}`);
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
            const meterValue = payload.meterValue[0].sampledValue.find(v => v.measurand === "Energy.Active.Import.Register");
            const timestamp = payload.timestamp;
            if (meterValue) {
                const currentReading = parseFloat(meterValue.value);
                await chargeController.updateMeterReadings(txId, currentReading);
                // console.log(meterValue);
                const charger = await chargerService.getChargerById(chargePointId);
                const charge = await chargeController.findByOcppTransactionId(txId);

                if (charger && charger.user_id && charge) {
                    // 1. Energy Calculation (kWh)
                    const energyConsumedKwh = currentReading - charge.meter_start;

                    // 2. Cost Calculation
                    const currentCost = energyConsumedKwh * (charger?.price_per_kwh || 0);

                    if (charge && charge.customer_id) {
                        const currentBalance = await walletService.getBalance(charge.customer_id);
                        const estimatedCost = energyConsumedKwh * (charger?.price_per_kwh || 0);

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

                    // 3. Duration Calculation (in seconds)
                    const startTime = new Date(charge.start_time).getTime();
                    const currentTime = new Date().getTime();
                    const durationSeconds = Math.floor((currentTime - startTime) / 1000);

                    sendToUser(charger.user_id, {
                        type: "meter_update",
                        chargerId: chargePointId,
                        chargeId: charger.active_charge_id,
                        amount: currentCost,
                        durationSeconds: durationSeconds,
                        energyUsed: energyConsumedKwh,
                        timestamp: timestamp
                    });
                }


                // Wallet Balance Check
                // TO BE IMPLEMENTED: Check user's wallet balance and send alert/stop charging if balance is low or negative.


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
