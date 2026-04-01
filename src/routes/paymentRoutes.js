import express from "express";
import {
  initiatePayment,
  handlePaymentNotify,
  generatePaymentHash,
} from "../controllers/PaymentController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/payments/initiate:
 *   post:
 *     summary: Initiate a payment for a booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - booking_id
 *               - amount
 *               - method
 *             properties:
 *               booking_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               method:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment initiated
 *       500:
 *         description: Server error
 */
router.post("/initiate", verifyToken, initiatePayment);

/**
 * @swagger
 * /api/v1/payments/notify:
 *   post:
 *     summary: Payment gateway notification webhook (PayHere)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_id:
 *                 type: string
 *               status_code:
 *                 type: string
 *               md5sig:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed
 *       500:
 *         description: Error
 */
router.post("/notify", handlePaymentNotify);

/**
 * @swagger
 * /api/v1/payments/hash:
 *   post:
 *     summary: Generate PayHere payment hash
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - amount
 *             properties:
 *               order_id:
 *                 type: string
 *                 description: The booking/order ID
 *               amount:
 *                 type: number
 *                 description: Payment amount in LKR
 *     responses:
 *       200:
 *         description: Hash generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hash:
 *                   type: string
 */
router.post("/hash", verifyToken, generatePaymentHash);

export default router;
