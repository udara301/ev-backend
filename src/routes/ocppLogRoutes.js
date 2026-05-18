import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getLogsByChargePoint } from "../controllers/ocppLogController.js";

const router = express.Router();

router.use(verifyToken);

/**
 * @swagger
 * /api/v1/ocpp-logs/{chargePointId}:
 *   get:
 *     summary: Get OCPP logs for a specific charge point
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
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: OCPP logs fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/:chargePointId", getLogsByChargePoint);

export default router;
