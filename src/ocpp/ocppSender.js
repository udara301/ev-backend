
// src/ocpp/ocppSender.js
import  connectedChargers  from "./centralSystem.js";
import { v4 as uuidv4 } from "uuid";
import { writeOcppLog } from "../controllers/ocppLogController.js";

export function sendRemoteStart(chargePointId, idTag = "ADMIN", connectorId) {
    const ws = connectedChargers.get(chargePointId);
    console.log(ws);
    if (!ws) return false;

    const uid = uuidv4();
    const msg = [2, uid, "RemoteStartTransaction", { connectorId, idTag }];
    ws.send(JSON.stringify(msg));
    writeOcppLog(chargePointId, "RemoteStartTransaction", "OUTGOING", { connectorId, idTag });

    console.log(`➡️ Sent RemoteStartTransaction to ${chargePointId} for connector ${connectorId}`);
    return true;
}

export function sendRemoteStop(chargePointId, transactionId) {
    const ws = connectedChargers.get(chargePointId);
    if (!ws) return false;

    const uid = uuidv4();
    const msg = [2, uid, "RemoteStopTransaction", { transactionId }];
    ws.send(JSON.stringify(msg));
    writeOcppLog(chargePointId, "RemoteStopTransaction", "OUTGOING", { transactionId });

    console.log(`➡️ Sent RemoteStopTransaction to ${chargePointId} for transaction ${transactionId}`);
    return true;
}