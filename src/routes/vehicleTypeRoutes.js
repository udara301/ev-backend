import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import {
    addVehicleModel,
    getAllModels,
    updateModel,
    deleteModel,
} from "../controllers/vehicleModelsController.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/vehicle-models:
 *   post:
 *     summary: Create a new vehicle model
 *     tags: [Vehicle Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model_name
 *               - brand
 *               - base_price_per_day
 *             properties:
 *               model_name:
 *                 type: string
 *                 example: Nissan Leaf 40kWh
 *               brand:
 *                 type: string
 *                 example: Nissan
 *               battery_capacity:
 *                 type: string
 *                 example: 40 kWh
 *               range_per_charge:
 *                 type: integer
 *                 example: 270
 *               base_price_per_day:
 *                 type: number
 *                 format: float
 *                 example: 12000
 *               image_url:
 *                 type: string
 *                 example: https://example.com/images/nissan-leaf.jpg
 *               description:
 *                 type: string
 *                 example: Compact EV suited for daily rentals and city driving.
 *     responses:
 *       201:
 *         description: Vehicle model created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Model created
 *                 id:
 *                   type: integer
 *                   example: 12
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/", addVehicleModel);

/**
 * @swagger
 * /api/v1/vehicle-models:
 *   get:
 *     summary: List all vehicle models
 *     tags: [Vehicle Models]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicle models
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   model_id:
 *                     type: integer
 *                     example: 1
 *                   model_name:
 *                     type: string
 *                     example: Nissan Leaf 40kWh
 *                   brand:
 *                     type: string
 *                     example: Nissan
 *                   battery_capacity:
 *                     type: string
 *                     example: 40 kWh
 *                   range_per_charge:
 *                     type: integer
 *                     example: 270
 *                   base_price_per_day:
 *                     type: number
 *                     format: float
 *                     example: 12000
 *                   image_url:
 *                     type: string
 *                     example: https://example.com/images/nissan-leaf.jpg
 *                   description:
 *                     type: string
 *                     example: Compact EV suited for daily rentals and city driving.
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", getAllModels);

/**
 * @swagger
 * /api/v1/vehicle-models/{id}:
 *   put:
 *     summary: Update a vehicle model
 *     tags: [Vehicle Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle model ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model_name:
 *                 type: string
 *                 example: BYD Dolphin
 *               brand:
 *                 type: string
 *                 example: BYD
 *               base_price_per_day:
 *                 type: number
 *                 format: float
 *                 example: 14500
 *     responses:
 *       200:
 *         description: Vehicle model updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Model updated successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put("/:id", updateModel);

/**
 * @swagger
 * /api/v1/vehicle-models/{id}:
 *   delete:
 *     summary: Delete a vehicle model
 *     tags: [Vehicle Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Vehicle model ID
 *     responses:
 *       200:
 *         description: Vehicle model deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Model deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete("/:id", deleteModel);

export default router;

