// // src/utils/ocppServer.js
// import WebSocket from "ws";
// import { v4 as uuidv4 } from "uuid";
// import { handleOcppRequest } from "../ocpp/ocppHandlers.js";
// import { updateStatus } from "../controllers/ocppController.js";

// const connectedChargers = new Map(); // chargerName → WebSocket
// const SERVER_PORT = 8080;

// // Start WebSocket server
// const wss = new WebSocket.Server({ port: SERVER_PORT });
// console.log(`🚀 OCPP Central System running on ws://localhost:${SERVER_PORT}`);

// // Handle new connections
// wss.on("connection", (ws, req) => {
//   const urlParts = req.url.split("/");
//   const chargerName = urlParts.pop();

//   console.log(`🔌 Charger connected: ${chargerName}`);
//   connectedChargers.set(chargerName, ws);

//   ws.on("message", (message) => {
//     try {
//       const msg = JSON.parse(message.toString());
//       const [msgType, uid, action, payload] = msg;
//       console.log("Handling occp message");

//       if (msgType === 2) handleOcppRequest({
//         ws,
//         uid,
//         action,
//         payload,
//         chargerName
//       });
//     } catch (err) {
//       console.error("Invalid OCPP message:", err.message);
//     }
//   });

//   ws.on("close", async () => {
//     connectedChargers.delete(chargerName);
//     try {
//       await updateStatus(chargerName, "UNAVAILABLE");
//       console.log(`✅ Set ${chargerName} as unavailable in DB`);
//     } catch (err) {
//       console.error(`Error setting charger unavailable for ${chargerName}:`, err);
//     }
//     console.log(`❌ Charger disconnected: ${chargerName}`);
//   });
// });

// // function handleChargerRequest(ws, uid, action, payload, id) {
// //   const response = [3, uid, {}]; // Generic CallResult

// //   switch (action) {
// //     case "BootNotification":
// //       console.log(`✅ ${id} booted`);
// //       ws.send(JSON.stringify([3, uid, { status: "Accepted", currentTime: new Date().toISOString(), interval: 300 }]));
// //       break;

// //     case "Heartbeat":
// //       ws.send(JSON.stringify([3, uid, { currentTime: new Date().toISOString() }]));
// //       break;

// //     case "StatusNotification":
// //       console.log(`📡 ${id} status: ${payload.status}`);
// //       ws.send(JSON.stringify(response));
// //       break;

// //     case "StartTransaction":
// //       console.log(`⚡ ${id} started transaction:`, payload);
// //       ws.send(JSON.stringify(response));
// //       break;

// //     case "StopTransaction":
// //       console.log(`🛑 ${id} stopped transaction:`, payload);
// //       ws.send(JSON.stringify(response));
// //       break;

// //     default:
// //       console.log(`❓ ${id} sent ${action}`);
// //       ws.send(JSON.stringify([4, uid, "NotImplemented", "Unsupported Action", {}]));
// //   }
// // }

// // Functions to send OCPP commands
// // export function sendRemoteStart(chargerName, idTag = "TESTUSER", connectorId = 1) {
// //   const ws = connectedChargers.get(chargerName);
// //   if (!ws) return console.log(`⚠️ ${chargerName} not connected`);
// //   const uid = uuidv4();
// //   const msg = [2, uid, "RemoteStartTransaction", { connectorId, idTag }];
// //   ws.send(JSON.stringify(msg));
// //   console.log(`➡️ Sent RemoteStartTransaction to ${chargerName}`);
// // }

// // export function sendRemoteStop(chargerName, transactionId = 1) {
// //   const ws = connectedChargers.get(chargerName);
// //   if (!ws) return console.log(`⚠️ ${chargerName} not connected`);
// //   const uid = uuidv4();
// //   const msg = [2, uid, "RemoteStopTransaction", { transactionId }];
// //   ws.send(JSON.stringify(msg));
// //   console.log(`➡️ Sent RemoteStopTransaction to ${chargerName}`);
// // }