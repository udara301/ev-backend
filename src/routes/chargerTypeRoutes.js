import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import {
    addChargerType,
    getChargerTypes,
    deleteChargerType,
    getChargerTypeById,
    updateChargerType,
    getChargerTypesNames,
} from "../controllers/chargerTypeController.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/charger-types:
 *   post:
 *     summary: Create a new charger type
 *     tags: [Charger Types]
 *     security:
 *       - bearerAuth: []
 *     description: Only COMPANY_ADMIN users can create charger types.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model
 *               - input_voltage
 *               - number_of_ports
 *               - current_type
 *             properties:
 *               model:
 *                 type: string
 *                 example: CHY4442
 *               input_voltage:
 *                 type: string
 *                 example: 400V AC
 *               number_of_ports:
 *                 type: integer
 *                 example: 2
 *               current_type:
 *                 type: string
 *                 enum: [AC, DC]
 *                 example: DC
 *               description:
 *                 type: string
 *                 example: Fast DC charger suitable for highway charging stations
 *     responses:
 *       200:
 *         description: Charger type added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Charger type added successfully
 *       400:
 *         description: Charger type already exists or invalid input
 *       403:
 *         description: Forbidden - Only COMPANY_ADMIN can perform this action
 *       500:
 *         description: Server error
 */
router.post("/", addChargerType);

/**
 * @swagger
 * /api/v1/charger-types:
 *   get:
 *     summary: List all charger types
 *     tags: [Charger Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of charger types
 *       401:
 *         description: Unauthorized
 */
router.get("/", getChargerTypes);

/**
 * @swagger
 * /api/v1/charger-types/names:
 *   get:
 *     summary: Get charger type names
 *     tags: [Charger Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of charger type names
 *       401:
 *         description: Unauthorized
 */
router.get("/names", getChargerTypesNames);

/**
 * @swagger
 * /api/v1/charger-types/{chargerTypeId}:
 *   put:
 *     summary: Update charger type
 *     tags: [Charger Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargerTypeId
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
 *               power:
 *                 type: number
 *               connector:
 *                 type: string
 *     responses:
 *       200:
 *         description: Charger type updated successfully
 *       404:
 *         description: Charger type not found
 */
router.put("/:chargerTypeId", updateChargerType);

/**
 * @swagger
 * /api/v1/charger-types/{chargerTypeId}:
 *   get:
 *     summary: Get charger type by ID
 *     tags: [Charger Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargerTypeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Charger type details
 *       404:
 *         description: Charger type not found
 */
router.get("/:chargerTypeId", getChargerTypeById);

/**
 * @swagger
 * /api/v1/charger-types/{chargerTypeId}:
 *   delete:
 *     summary: Delete charger type
 *     tags: [Charger Types]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chargerTypeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Charger type deleted successfully
 *       404:
 *         description: Charger type not found
 */
router.delete("/:chargerTypeId", deleteChargerType);

export default router;
