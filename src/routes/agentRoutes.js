import express from "express";
import {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
} from "../controllers/agentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/agents:
 *   post:
 *     summary: Create a new agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agent created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/", createAgent);

/**
 * @swagger
 * /api/v1/agents:
 *   get:
 *     summary: List all agents
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of agents
 *       401:
 *         description: Unauthorized
 */
router.get("/", getAgents);

/**
 * @swagger
 * /api/v1/agents/{agentId}:
 *   get:
 *     summary: Get single agent by ID
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agent details
 *       404:
 *         description: Agent not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:agentId", getAgentById);

/**
 * @swagger
 * /api/v1/agents/{agentId}:
 *   put:
 *     summary: Update agent details
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agent updated successfully
 *       404:
 *         description: Agent not found
 *       401:
 *         description: Unauthorized
 */
router.put("/:agentId", updateAgent);

/**
 * @swagger
 * /api/v1/agents/{agentId}:
 *   delete:
 *     summary: Delete an agent
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agent deleted successfully
 *       404:
 *         description: Agent not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:agentId", deleteAgent);

export default router;