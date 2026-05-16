import express from "express";
import { completeAgentPayout, revertAgentPayout, getAllPayoutsWithAgentName } from "../controllers/payoutController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/payouts/complete:
 *   post:
 *     summary: Complete agent payout
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *               - amount
 *               - receiptUrl
 *             properties:
 *               agentId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               receiptUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payout completed and agent balance updated
 *       500:
 *         description: Error processing payout
 */
router.post("/complete", verifyToken, completeAgentPayout);

/**
 * @swagger
 * /api/v1/payouts/revert:
 *   post:
 *     summary: Revert agent payout
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payoutId
 *             properties:
 *               payoutId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Payout reverted and agent balance restored
 *       404:
 *         description: Payout not found
 *       500:
 *         description: Error reverting payout
 */
router.post("/revert", verifyToken, revertAgentPayout);


/**
 * @swagger
 * /api/v1/payouts/all:
 *   get:
 *     summary: Get all payout details with agent name
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payouts with agent names
 *       401:
 *         description: Unauthorized
 */
router.get("/all", verifyToken, getAllPayoutsWithAgentName);


export default router;
