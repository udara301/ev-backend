import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import { startCharging, stopCharging } from "../controllers/charges.controller.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/charges/agent/{chargerId}/start:
 *   post:
 *     summary: Start charging session
 *     tags: [Charges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargerId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicleId:
 *                 type: string
 *               energy:
 *                 type: number
 *                 description: Energy to charge in kWh
 *     responses:
 *       200:
 *         description: Charging session started successfully
 *       400:
 *         description: Invalid charger or charger not available
 *       404:
 *         description: Charger not found
 */
router.post("/agent/:chargerId/start", startCharging);

/**
 * @swagger
 * /api/v1/charges/agent/{chargerId}/stop:
 *   post:
 *     summary: Stop charging session
 *     tags: [Charges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Charging session stopped successfully
 *       400:
 *         description: No active charging session
 *       404:
 *         description: Charger not found
 */
router.post("/agent/:chargerId/stop", stopCharging);

export default router;