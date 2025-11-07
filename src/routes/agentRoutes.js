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

router.post("/", createAgent); // Add new agent
router.get("/", getAgents); // List all agents
router.get("/:agentId", getAgentById); // Get single agent
router.put("/:agentId", updateAgent); // Update agent
router.delete("/:agentId", deleteAgent); // Delete agent

export default router;