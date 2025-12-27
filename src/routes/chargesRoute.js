import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import { startCharging, stopCharging } from "../controllers/charges.controller.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);

router.post("/agent/:chargerId/start", startCharging);
router.post("/agent/:chargerId/stop", stopCharging);

export default router;