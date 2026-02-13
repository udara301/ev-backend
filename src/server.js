import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import { swaggerUi, swaggerSpec } from './config/swagger.js';
import chargerRoutes from "./routes/chargerRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import chargerTypeRoutes from "./routes/chargerTypeRoutes.js";
import chargesRoute from "./routes/chargesRoute.js";
import "./ocpp/centralSystem.js";
import { startFrontendWSServer } from "./websocket/frontendWS.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chargers", chargerRoutes);
app.use("/api/v1/agents", agentRoutes);
app.use("/api/v1/charger-types", chargerTypeRoutes);
app.use("/api/v1/charges", chargesRoute);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("EV Charger System API is running...");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});

// ✅ Start WebSocket server ONCE
startFrontendWSServer(8081);