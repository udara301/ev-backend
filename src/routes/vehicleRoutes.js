import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
	addVehicleUnit,
	getAllVehicles,
	getVehicleById,
	updateVehicleStatus,
	deleteVehicle
} from "../controllers/vehicleController.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/vehicles:
 *   post:
 *     summary: Create a new vehicle unit
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     description: Creates a vehicle record linked to the authenticated user as the owner.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model_id
 *               - plate_number
 *             properties:
 *               model_id:
 *                 type: integer
 *                 example: 3
 *               plate_number:
 *                 type: string
 *                 example: CAA-4587
 *     responses:
 *       201:
 *         description: Vehicle unit added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Vehicle unit added
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/", verifyToken, addVehicleUnit);

/**
 * @swagger
 * /api/v1/vehicles:
 *   get:
 *     summary: List all vehicles with model details
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: List of vehicles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   vehicle_id:
 *                     type: integer
 *                     example: 7
 *                   model_id:
 *                     type: integer
 *                     example: 3
 *                   plate_number:
 *                     type: string
 *                     example: CAA-4587
 *                   current_status:
 *                     type: string
 *                     enum: [available, maintenance, rented]
 *                     example: available
 *                   last_service_date:
 *                     type: string
 *                     format: date
 *                     nullable: true
 *                   owner_id:
 *                     type: integer
 *                     nullable: true
 *                     example: 21
 *                   model_name:
 *                     type: string
 *                     example: Nissan Leaf 40kWh
 *                   brand:
 *                     type: string
 *                     example: Nissan
 *       500:
 *         description: Server error
 */
router.get("/", getAllVehicles);

/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID with model details
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicle_id:
 *                   type: integer
 *                   example: 7
 *                 model_id:
 *                   type: integer
 *                   example: 3
 *                 plate_number:
 *                   type: string
 *                   example: CAA-4587
 *                 current_status:
 *                   type: string
 *                   enum: [available, maintenance, rented]
 *                   example: available
 *                 last_service_date:
 *                   type: string
 *                   format: date
 *                   nullable: true
 *                 owner_id:
 *                   type: integer
 *                   nullable: true
 *                   example: 21
 *                 model_name:
 *                   type: string
 *                   example: Nissan Leaf 40kWh
 *                 brand:
 *                   type: string
 *                   example: Nissan
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.get("/:id", verifyToken, getVehicleById);

/**
 * @swagger
 * /api/v1/vehicles/{id}/status:
 *   put:
 *     summary: Update vehicle status
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, maintenance, rented]
 *                 example: maintenance
 *     responses:
 *       200:
 *         description: Vehicle status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Vehicle status updated
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put("/:id/status", verifyToken, updateVehicleStatus);



/**
 * @swagger
 * /api/v1/vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Vehicle deleted
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete("/:id", verifyToken, deleteVehicle);



export default router;
