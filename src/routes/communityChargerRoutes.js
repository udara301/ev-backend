import express from "express";
import {
  createCharger,
  getAllChargers,
  getChargerById,
  updateCharger,
  deleteCharger,
  verifyCharger
} from "../controllers/communityChargerController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/public-chargers:
 *   get:
 *     summary: Get all community chargers
 *     tags: [Community Chargers]
 *     responses:
 *       200:
 *         description: List of community chargers
 */
router.get("/", getAllChargers);

// All routes below are protected
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/public-chargers:
 *   post:
 *     summary: Submit a new community charger (Customer)
 *     tags: [Community Chargers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - place_name
 *               - latitude
 *               - longitude
 *             properties:
 *               place_name:
 *                 type: string
 *               description:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               connector_type:
 *                 type: string
 *               image_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Community charger added successfully
 *       400:
 *         description: Invalid input
 */
router.post("/", createCharger);

/**
 * @swagger
 * /api/v1/public-chargers/{id}:
 *   get:
 *     summary: Get community charger by ID
 *     tags: [Community Chargers]
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
 *         description: Charger details
 *       404:
 *         description: Charger not found
 */
router.get("/:id", getChargerById);

/**
 * @swagger
 * /api/v1/public-chargers/{id}:
 *   put:
 *     summary: Update community charger (Owner or Admin)
 *     tags: [Community Chargers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               place_name:
 *                 type: string
 *               description:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               connector_type:
 *                 type: string
 *               image_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Charger updated successfully
 *       404:
 *         description: Charger not found
 */
router.put("/:id", updateCharger);

/**
 * @swagger
 * /api/v1/public-chargers/{id}:
 *   delete:
 *     summary: Delete community charger (Admin only)
 *     tags: [Community Chargers]
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
 *         description: Charger deleted successfully
 *       404:
 *         description: Charger not found
 */
router.delete("/:id", deleteCharger);

/**
 * @swagger
 * /api/v1/public-chargers/{id}/verify:
 *   patch:
 *     summary: Verify a community charger (Admin only)
 *     tags: [Community Chargers]
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
 *         description: Charger verified successfully
 *       404:
 *         description: Charger not found
 */
router.patch("/:id/verify", verifyCharger);

export default router;