import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getLogsByChargePoint } from "../controllers/ocppLogController.js";

const router = express.Router();

router.use(verifyToken);

/**
 * @swagger
 * /api/v1/ocpp-logs/{chargePointId}:
 *   get:
 *     summary: Get OCPP logs for a specific charge point by date range
 *     tags: [OCPP Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargePointId
 *         required: true
 *         schema:
 *           type: string
 *         description: The charger's OCPP ID (charge_point_id)
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date/time (ISO 8601)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date/time (ISO 8601)
 *     responses:
 *       200:
 *         description: OCPP logs fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/:chargePointId", getLogsByChargePoint);

export default router;
