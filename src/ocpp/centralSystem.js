// src/ocpp/centralSystem.js
import { WebSocketServer } from "ws";
import { handleOcppRequest } from "./ocppHandlers.js";
import { setChargerUnavailable } from "../controllers/ocppController.js";

const PORT = 8080;

const connectedChargers = new Map();

const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 OCPP Server running on ws://localhost:${PORT}`);

// When a charger connects
wss.on("connection", (ws, req) => {
    const urlParts = req.url.split("/");
    const chargePointId = urlParts.pop();
    
    console.log(`🔌 Charger connected: ${chargePointId}`);

    connectedChargers.set(chargePointId, ws);

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
        setChargerUnavailable(chargePointId);
        connectedChargers.delete(chargePointId);
    });
});

export default connectedChargers;
