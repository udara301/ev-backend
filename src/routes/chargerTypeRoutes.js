import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import {
    addChargerType,
    getChargerTypes,
    deleteChargerType,
    getChargerTypeById,
    updateChargerType,
    getChargerTypesNames,
} from "../controllers/chargerTypeController.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);


router.post("/", addChargerType); // Add new charger type
router.get("/", getChargerTypes); // List all charger types
router.get("/names", getChargerTypesNames); // List all charger types
router.put("/:chargerTypeId", updateChargerType); // Update status
router.get("/:chargerTypeId", getChargerTypeById); // Get charger type by ID
router.delete("/:chargerTypeId", deleteChargerType); // Delete charger

export default router;
