
// src/ocpp/ocppSender.js
import  connectedChargers  from "./centralSystem.js";
import { v4 as uuidv4 } from "uuid";

export function sendRemoteStart(chargerName, idTag = "ADMIN", connectorId = 1) {
    const ws = connectedChargers.get(chargerName);
    if (!ws) return false;

    const uid = uuidv4();
    const msg = [2, uid, "RemoteStartTransaction", { connectorId, idTag }];
    ws.send(JSON.stringify(msg));

    console.log(`➡️ Sent RemoteStartTransaction to ${chargerName}`);
    return true;
}

export function sendRemoteStop(chargerName, transactionId) {
    const ws = connectedChargers.get(chargerName);
    if (!ws) return false;

    const uid = uuidv4();
    const msg = [2, uid, "RemoteStopTransaction", { transactionId }];
    ws.send(JSON.stringify(msg));

    console.log(`➡️ Sent RemoteStopTransaction to ${chargerName}`);
    return true;
}