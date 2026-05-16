import express from "express";
import getAgentEarnings, { getAgentEarningById, createAgentEarning, deleteAgentEarning } from "../controllers/agentEarningsController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/agent-earnings:
 *   get:
 *     summary: List all agent earnings
 *     tags: [Agent Earnings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agent earnings
 *       401:
 *         description: Unauthorized
 */
router.get("/", verifyToken, getAgentEarnings);

/**
 * @swagger
 * /api/v1/agent-earnings/{id}:
 *   get:
 *     summary: Get agent earning by ID
 *     tags: [Agent Earnings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agent earning details
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", verifyToken, getAgentEarningById);

/**
 * @swagger
 * /api/v1/agent-earnings:
 *   post:
 *     summary: Create agent earning
 *     tags: [Agent Earnings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *               - charge_id
 *               - total_amount
 *               - commission_amount
 *             properties:
 *               agent_id:
 *                 type: integer
 *               charge_id:
 *                 type: integer
 *               total_amount:
 *                 type: number
 *               commission_amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Agent earning created
 *       500:
 *         description: Error
 */
router.post("/", verifyToken, createAgentEarning);

/**
 * @swagger
 * /api/v1/agent-earnings/{id}:
 *   delete:
 *     summary: Delete agent earning
 *     tags: [Agent Earnings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agent earning deleted
 *       404:
 *         description: Not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", verifyToken, deleteAgentEarning);

export default router;
