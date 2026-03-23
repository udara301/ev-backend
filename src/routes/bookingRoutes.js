import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import {
    searchAvailableVehicles,
    placeBooking,
    createBooking,
    getMyBookings,
} from "../controllers/bookingController.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/bookings/search:
 *   get:
 *     summary: Search available vehicles by category and dates
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Vehicle category filter (e.g., Hatchback, SUV, or 'all' for no filter)
 *       - in: query
 *         name: pickup_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Pickup date in YYYY-MM-DD format
 *       - in: query
 *         name: dropoff_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Dropoff date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: List of available vehicles
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
 *                   category:
 *                     type: string
 *                     example: Hatchback
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
 *                   vehicle_id:
 *                     type: integer
 *                     example: 5
 *                   plate_number:
 *                     type: string
 *                     example: ABC-1234
 *       500:
 *         description: Server error
 */
router.get("/search", searchAvailableVehicles);

/**
 * @swagger
 * /api/v1/bookings/place:
 *   post:
 *     summary: Place a new booking with predefined total price
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicle_id
 *               - pickup_date
 *               - dropoff_date
 *               - total_price
 *             properties:
 *               vehicle_id:
 *                 type: integer
 *                 example: 5
 *               pickup_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-04-01
 *               dropoff_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-04-05
 *               total_price:
 *                 type: number
 *                 format: float
 *                 example: 48000
 *     responses:
 *       201:
 *         description: Booking placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Booking placed successfully
 *                 bookingId:
 *                   type: integer
 *                   example: 15
 *       400:
 *         description: Vehicle already booked for selected dates
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/place", verifyToken, placeBooking);

/**
 * @swagger
 * /api/v1/bookings/create:
 *   post:
 *     summary: Create a new booking with automatic price calculation
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicle_id
 *               - pickup_date
 *               - dropoff_date
 *             properties:
 *               vehicle_id:
 *                 type: integer
 *                 example: 5
 *               pickup_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-04-01
 *               dropoff_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-04-05
 *     responses:
 *       201:
 *         description: Booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Booking successful
 *                 bookingId:
 *                   type: integer
 *                   example: 15
 *                 total_price:
 *                   type: number
 *                   format: float
 *                   example: 48000
 *       400:
 *         description: Vehicle already booked for selected dates
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/create", verifyToken, createBooking);

/**
 * @swagger
 * /api/v1/bookings/my-bookings:
 *   get:
 *     summary: Get all bookings for the authenticated user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   booking_id:
 *                     type: integer
 *                     example: 15
 *                   user_id:
 *                     type: integer
 *                     example: 1
 *                   vehicle_id:
 *                     type: integer
 *                     example: 5
 *                   pickup_date:
 *                     type: string
 *                     format: date
 *                     example: 2026-04-01
 *                   dropoff_date:
 *                     type: string
 *                     format: date
 *                     example: 2026-04-05
 *                   total_price:
 *                     type: number
 *                     format: float
 *                     example: 48000
 *                   booking_status:
 *                     type: string
 *                     example: pending
 *                   model_name:
 *                     type: string
 *                     example: Nissan Leaf 40kWh
 *                   plate_number:
 *                     type: string
 *                     example: ABC-1234
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/my-bookings", verifyToken, getMyBookings);

export default router;
