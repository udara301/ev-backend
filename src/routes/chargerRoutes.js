import express from "express";
import {
  createCharger,
  getChargersForAgent,
  getChargersAdmin,
  assignChargerToAgent,
  deleteCharger,
  getChargerReport,
  updateCharger,
  editChargerAgent,
  unassignCharger

} from "../controllers/chargerController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/chargers:
 *   post:
 *     summary: Create a new charger (Admin)
 *     tags: [Chargers]
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
 *               - location
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               location:
 *                 type: string
 *               type:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Charger created successfully
 *       400:
 *         description: Invalid input
 */
router.post("/", createCharger);

/**
 * @swagger
 * /api/v1/chargers/chargers-admin:
 *   get:
 *     summary: List all chargers (Admin only)
 *     tags: [Chargers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all chargers
 *       401:
 *         description: Unauthorized
 */
router.get("/chargers-admin", getChargersAdmin);

/**
 * @swagger
 * /api/v1/chargers/{chargerId}/admin:
 *   put:
 *     summary: Update charger status (Admin)
 *     tags: [Chargers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargerId
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
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *               location:
 *                 type: string
 *     responses:
 *       200:
 *         description: Charger updated successfully
 *       404:
 *         description: Charger not found
 */
router.put("/:chargerId/admin", updateCharger);

/**
 * @swagger
 * /api/v1/chargers/{chargerId}:
 *   delete:
 *     summary: Delete a charger
 *     tags: [Chargers]
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
 *         description: Charger deleted successfully
 *       404:
 *         description: Charger not found
 */
router.delete("/:chargerId", deleteCharger);

/**
 * @swagger
 * /api/v1/chargers/{chargerId}/agent:
 *   put:
 *     summary: Assign charger to agent
 *     tags: [Chargers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargerId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *             properties:
 *               agentId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Charger assigned successfully
 *       400:
 *         description: Invalid input
 */
router.put("/:chargerId/agent", assignChargerToAgent);

/**
 * @swagger
 * /api/v1/chargers/agent/update/{chargerId}:
 *   put:
 *     summary: Edit charger details by agent
 *     tags: [Chargers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargerId
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
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Charger updated successfully
 *       404:
 *         description: Charger not found
 */
router.put("/agent/update/:chargerId", editChargerAgent);

/**
 * @swagger
 * /api/v1/chargers:
 *   get:
 *     summary: List chargers for agent
 *     tags: [Chargers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of chargers assigned to agent
 *       401:
 *         description: Unauthorized
 */
router.get("/", getChargersForAgent);

/**
 * @swagger
 * /api/v1/chargers/{chargerId}:
 *   get:
 *     summary: Get charger report
 *     tags: [Chargers]
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
 *         description: Charger report details
 *       404:
 *         description: Charger not found
 */
router.get("/:chargerId", getChargerReport);

/**
 * @swagger
 * /api/v1/chargers/agent/{charger_id}:
 *   delete:
 *     summary: Unassign charger from agent
 *     tags: [Chargers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: charger_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Charger unassigned successfully
 *       404:
 *         description: Charger not found
 */
router.delete("/agent/:charger_id", unassignCharger);

export default router;