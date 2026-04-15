import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { getWalletBalance, initiateTopUp, handleTopUpNotify, getTransactionHistory } from "../controllers/walletController.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/wallet/balance:
 *   get:
 *     summary: Get wallet balance for logged-in user
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *       404:
 *         description: Wallet not found
 */
router.get("/balance", verifyToken, getWalletBalance);

/**
 * @swagger
 * /api/v1/wallet/topup:
 *   post:
 *     summary: Initiate wallet top-up (returns PayHere hash)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to top up in LKR
 *     responses:
 *       200:
 *         description: Top-up initiated, returns PayHere payment details
 *       400:
 *         description: Invalid amount
 */
router.post("/topup", verifyToken, initiateTopUp);

/**
 * @swagger
 * /api/v1/wallet/topup/notify:
 *   post:
 *     summary: PayHere payment notification webhook (server-to-server)
 *     tags: [Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               merchant_id:
 *                 type: string
 *               order_id:
 *                 type: string
 *               payhere_amount:
 *                 type: string
 *               payhere_currency:
 *                 type: string
 *               status_code:
 *                 type: string
 *               md5sig:
 *                 type: string
 *               payment_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification processed
 *       403:
 *         description: Invalid signature
 */
router.post("/topup/notify", handleTopUpNotify);

/**
 * @swagger
 * /api/v1/wallet/transactions:
 *   get:
 *     summary: Get wallet transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *       404:
 *         description: Wallet not found
 */
router.get("/transactions", verifyToken, getTransactionHistory);

export default router;
