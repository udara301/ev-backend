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
import { startFrontendWSServer } from "./websocket/frontendws.js";
import communityChargerRoutes from "./routes/communityChargerRoutes.js";
import publicRoutes  from "./routes/publicRoutes.js";
import vehicleTypeRoutes from "./routes/vehicleTypeRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use("/api/v1/auth", authRoutes);  
app.use("/api/v1/chargers", chargerRoutes);
app.use("/api/v1/agents", agentRoutes);
app.use("/api/v1/charger-types", chargerTypeRoutes);
app.use("/api/v1/charges", chargesRoute);
app.use("/api/v1/public-chargers", communityChargerRoutes);
app.use("/api/v1/public", publicRoutes);
app.use("/api/v1/vehicle-models", vehicleTypeRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/wallet", walletRoutes);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/", (req, res) => {
  res.send("EV Charger System API is running...");
});

const PORT = process.env.PORT;
console.log(`Starting server on port ${PORT}...`);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ✅ Start WebSocket server ONCE
startFrontendWSServer(8081);