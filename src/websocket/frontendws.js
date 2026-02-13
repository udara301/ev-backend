// src/websocket/frontendWS.js
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const FRONTEND_WS_PORT = 8081;

const connectedClients = new Map(); // userId → { ws, userInfo }
let wss = null; // 👈 singleton instance

// Function to verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * ✅ Start WebSocket server explicitly (call ONCE)
 */
export function startFrontendWSServer(port = FRONTEND_WS_PORT) {
  if (wss) {
    console.warn("⚠️ Frontend WebSocket server already running");
    return wss;
  }

  wss = new WebSocketServer({ port });

  console.log(`🚀 Frontend WebSocket server running on ws://localhost:${port}`);

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.send(JSON.stringify({ type: "error", message: "No token provided" }));
      ws.close();
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid or expired token" }));
      ws.close();
      return;
    }

    const userId = decoded.id;
    const userInfo = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    // Optional: allow only one active connection per user
    if (connectedClients.has(userId)) {
      connectedClients.get(userId).ws.close();
    }

    connectedClients.set(userId, { ws, userInfo });

    console.log(`📱 Authenticated client connected: ${userId} (${decoded.email})`);

    ws.send(JSON.stringify({
      type: "connection_established",
      userId,
      userInfo,
      message: "Connected to EV Charger notifications"
    }));

    ws.on("close", () => {
      console.log(`❌ Client disconnected: ${userId}`);
      connectedClients.delete(userId);
    });

    ws.on("error", (err) => {
      console.error(`WebSocket error for ${userId}:`, err);
      connectedClients.delete(userId);
    });
  });

  return wss;
}

/**
 * ✅ Safe to import anywhere
 */
export function sendToUser(userId, message) {
  const client = connectedClients.get(userId);
  if (client && client.ws.readyState === client.ws.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
}

export function broadcastToFrontend(message) {
  connectedClients.forEach(({ ws }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

export function getConnectedUsers() {
  return Array.from(connectedClients.keys());
}
