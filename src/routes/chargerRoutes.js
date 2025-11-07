import express from "express";
import {
  createCharger,
  getChargersForAgent,
  getChargersAdmin,
  assignChargerToAgent,
  deleteCharger,
  getChargerReport,
  updateCharger,
  unassignCharger

} from "../controllers/chargerController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);
// Admin endpoints
router.post("/", createCharger); // Add new charger
router.get("/chargers-admin", getChargersAdmin); // List all chargers
router.put("/:chargerId/admin", updateCharger); // Update status

// Agent endpoints
router.put("/:chargerId/agent", assignChargerToAgent); // Assign Charger to agent
router.get("/", getChargersForAgent); // List all chargers for agent
router.get("/:chargerId", getChargerReport); // Get report
router.delete("/agent/:charger_id", unassignCharger); // Delete charger

export default router;