import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import {
    addVehicleModel,
    getAllModels,
    updateModel,
    getModelById,
    deleteModel,
} from "../controllers/vehicleModelsController.js";
import { upload } from "../middleware/upload.js";

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
 *         multipart/form-data:
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
 *               charging_time:
 *                 type: string
 *                 example: 45 min (20-80%)
 *               passenger_count:
 *                 type: integer
 *                 example: 5
 *               is_featured:
 *                 type: boolean
 *                 example: true
 *               category:
 *                 type: string
 *                 example: Hatchback
 *               base_price_per_day:
 *                 type: number
 *                 format: float
 *                 example: 12000
 *               motor_power:
 *                 type: string
 *                 example: 110 kW
 *               ac_connector_type:
 *                 type: string
 *                 example: Type 2
 *               dc_connector_type:
 *                 type: string
 *                 example: CCS2
 *               image:
 *                 type: string
 *                 format: binary
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
router.post("/", upload.single('image'), addVehicleModel);

/**
 * @swagger
 * /api/v1/vehicle-models:
 *   get:
 *     summary: List all vehicle modelsp
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
 *                   charging_time:
 *                     type: string
 *                     example: 45 min (20-80%)
 *                   passenger_count:
 *                     type: integer
 *                     example: 5
 *                   is_featured:
 *                     type: boolean
 *                     example: true
 *                   category:
 *                     type: string
 *                     example: Hatchback
 *                   base_price_per_day:
 *                     type: number
 *                     format: float
 *                     example: 12000
 *                   motor_power:
 *                     type: string
 *                     example: 110 kW
 *                   ac_connector_type:
 *                     type: string
 *                     example: Type 2
 *                   dc_connector_type:
 *                     type: string
 *                     example: CCS2
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
 *   get:
 *     summary: Get a single vehicle model
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
 *         description: Vehicle model details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 model_id:
 *                   type: integer
 *                   example: 1
 *                 model_name:
 *                   type: string
 *                   example: Nissan Leaf 40kWh
 *                 brand:
 *                   type: string
 *                   example: Nissan
 *                 battery_capacity:
 *                   type: string
 *                   example: 40 kWh
 *                 range_per_charge:
 *                   type: integer
 *                   example: 270
 *                 charging_time:
 *                   type: string
 *                   example: 45 min (20-80%)
 *                 passenger_count:
 *                   type: integer
 *                   example: 5
 *                 is_featured:
 *                   type: boolean
 *                   example: true
 *                 category:
 *                   type: string
 *                   example: Hatchback
 *                 base_price_per_day:
 *                   type: number
 *                   format: float
 *                   example: 12000
 *                 motor_power:
 *                   type: string
 *                   example: 110 kW
 *                 ac_connector_type:
 *                   type: string
 *                   example: Type 2
 *                 dc_connector_type:
 *                   type: string
 *                   example: CCS2
 *                 image_url:
 *                   type: string
 *                   example: https://example.com/images/nissan-leaf.jpg
 *                 description:
 *                   type: string
 *                   example: Compact EV suited for daily rentals and city driving.
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Model not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getModelById);

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
 *               image_url:
 *                 type: string
 *                 example: https://example.com/images/byd-dolphin.jpg
 *               description:
 *                 type: string
 *                 example: Compact EV with efficient city range.
 *               battery_capacity:
 *                 type: string
 *                 example: 44.9 kWh
 *               range_per_charge:
 *                 type: integer
 *                 example: 340
 *               charging_time:
 *                 type: string
 *                 example: 30 min (30-80%)
 *               passenger_count:
 *                 type: integer
 *                 example: 5
 *               is_featured:
 *                 type: boolean
 *                 example: false
 *               category:
 *                 type: string
 *                 example: Hatchback
 *               motor_power:
 *                 type: string
 *                 example: 70 kW
 *               ac_connector_type:
 *                 type: string
 *                 example: Type 2
 *               dc_connector_type:
 *                 type: string
 *                 example: CCS2
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

router.put("/:id", upload.single('image'), updateModel);

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

