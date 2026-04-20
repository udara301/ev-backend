import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import { startCharging, stopCharging, getActiveChargingSession } from "../controllers/charges.controller.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/charges/agent/{chargerId}/{connectorId}/start:
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
 *       - in: path
 *         name: connectorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: OCPP connector ID (1, 2, 3...)
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
router.post("/agent/:chargerId/:connectorId/start", startCharging);

/**
 * @swagger
 * /api/v1/charges/agent/{chargerId}/{connectorId}/stop:
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
 *       - in: path
 *         name: connectorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: OCPP connector ID (1, 2, 3...)
 *     responses:
 *       200:
 *         description: Charging session stopped successfully
 *       400:
 *         description: No active charging session
 *       404:
 *         description: Charger not found
 */
router.post("/agent/:chargerId/:connectorId/stop", stopCharging);

/**
 * @swagger
 * /api/v1/charges/active-session:
 *   get:
 *     summary: Get active charging session for logged-in user
 *     description: Returns the current PENDING or CHARGING session for the authenticated user, or null if none exists.
 *     tags: [Charges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active session details or null
 *       401:
 *         description: Unauthorized
 */
router.get("/active-session", getActiveChargingSession);

export default router;