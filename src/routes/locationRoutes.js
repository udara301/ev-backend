import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
	addLocation,
	getAllLocations,
	getLocationById,
	updateLocation,
	deleteLocation,
} from "../controllers/locationController.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/locations:
 *   post:
 *     summary: Create a new pickup location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location_name
 *             properties:
 *               location_name:
 *                 type: string
 *                 example: Colombo City Center
 *               price:
 *                 type: integer
 *                 nullable: true
 *                 example: 1500
 *     responses:
 *       201:
 *         description: Location created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Location created successfully
 *                 id:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Location name is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/", verifyToken, addLocation);

/**
 * @swagger
 * /api/v1/locations:
 *   get:
 *     summary: Get all pickup locations
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: List of pickup locations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   location_id:
 *                     type: integer
 *                     example: 1
 *                   location_name:
 *                     type: string
 *                     example: Colombo City Center
 *                   price:
 *                     type: integer
 *                     nullable: true
 *                     example: 1500
 *       500:
 *         description: Server error
 */
router.get("/", getAllLocations);

/**
 * @swagger
 * /api/v1/locations/{id}:
 *   get:
 *     summary: Get pickup location by ID
 *     tags: [Locations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pickup location ID
 *     responses:
 *       200:
 *         description: Pickup location details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 location_id:
 *                   type: integer
 *                   example: 1
 *                 location_name:
 *                   type: string
 *                   example: Colombo City Center
 *                 price:
 *                   type: integer
 *                   nullable: true
 *                   example: 1500
 *       404:
 *         description: Location not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getLocationById);

/**
 * @swagger
 * /api/v1/locations/{id}:
 *   put:
 *     summary: Update pickup location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pickup location ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location_name
 *             properties:
 *               location_name:
 *                 type: string
 *                 example: Kandy Downtown
 *               price:
 *                 type: integer
 *                 nullable: true
 *                 example: 1800
 *     responses:
 *       200:
 *         description: Location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Location updated successfully
 *       400:
 *         description: Location name is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Location not found
 *       500:
 *         description: Server error
 */
router.put("/:id", verifyToken, updateLocation);

/**
 * @swagger
 * /api/v1/locations/{id}:
 *   delete:
 *     summary: Delete pickup location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pickup location ID
 *     responses:
 *       200:
 *         description: Location deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Location deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Location not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", verifyToken, deleteLocation);

export default router;
