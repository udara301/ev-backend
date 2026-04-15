import { pool } from "../config/db.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

// =====================================================
// Get wallet balance for logged-in user
// =====================================================
export const getWalletBalance = async (req, res) => {
    try {
        const userId = req.user.id;

        const [wallets] = await pool.query(
            "SELECT id, balance, updated_at FROM wallets WHERE customer_id = ?",
            [userId]
        );

        if (wallets.length === 0) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        res.json(wallets[0]);
    } catch (err) {
        console.error("Error fetching wallet balance:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// =====================================================
// Initiate top-up (creates PENDING transaction + returns PayHere hash)
// =====================================================
export const initiateTopUp = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        if (!amount || typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({ message: "Invalid top-up amount" });
        }

        await connection.beginTransaction();

        // Get or create wallet
        let [wallets] = await connection.query(
            "SELECT id FROM wallets WHERE customer_id = ?",
            [userId]
        );

        let walletId;
        if (wallets.length === 0) {
            const [result] = await connection.query(
                "INSERT INTO wallets (customer_id, balance) VALUES (?, 0)",
                [userId]
            );
            walletId = result.insertId;
        } else {
            walletId = wallets[0].id;
        }

        // Create PENDING transaction
        const [txResult] = await connection.query(
            `INSERT INTO wallet_transactions (wallet_id, amount, type, status) 
             VALUES (?, ?, 'TOPUP', 'PENDING')`,
            [walletId, amount]
        );

        const transactionId = txResult.insertId;

        await connection.commit();

        // Generate PayHere hash
        const merchant_id = process.env.PAYHERE_MERCHANT_ID;
        const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET;
        const order_id = `WTOP_${transactionId}`;
        const currency = "LKR";
        const amountFormatted = parseFloat(amount).toFixed(2);

        const hashedSecret = crypto.createHash("md5")
            .update(merchant_secret)
            .digest("hex")
            .toUpperCase();

        const hash = crypto.createHash("md5")
            .update(merchant_id + order_id + amountFormatted + currency + hashedSecret)
            .digest("hex")
            .toUpperCase();

        const paymentObject = {
            merchant_id,
            order_id,
            amount: amountFormatted,
            currency,
            hash,

            return_url: "http://localhost:4200/success",
            cancel_url: "http://localhost:4200/cancel",
            notify_url: "https://your-domain.com/api/v1/payhere/notify",

            first_name: req.user.first_name || "Test",
            last_name: req.user.last_name || "User",
            email: req.user.email || "test@test.com",
            phone: req.user.phone || "0771234567",
            address: "Colombo",
            city: "Colombo",
            country: "Sri Lanka",

            items: "Wallet Topup"
        };

        console.log("PAYLOAD", paymentObject);

        res.json(paymentObject);

    } catch (err) {
        await connection.rollback();
        console.error("Error initiating top-up:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        connection.release();
    }
};

// =====================================================
// PayHere webhook — verify signature, credit wallet
// (No auth token — called server-to-server by PayHere)
// =====================================================
export const handleTopUpNotify = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            payment_id,
        } = req.body;

        // 1. Verify PayHere signature
        const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET;
        const hashedSecret = crypto.createHash("md5")
            .update(merchant_secret)
            .digest("hex")
            .toUpperCase();

        const localSig = crypto.createHash("md5")
            .update(
                merchant_id +
                order_id +
                payhere_amount +
                payhere_currency +
                status_code +
                hashedSecret
            )
            .digest("hex")
            .toUpperCase();

        if (localSig !== md5sig) {
            console.error("Invalid PayHere signature for order:", order_id);
            return res.status(403).send("Invalid signature");
        }

        // 2. Verify merchant_id matches
        if (merchant_id !== process.env.PAYHERE_MERCHANT_ID) {
            console.error("Merchant ID mismatch for order:", order_id);
            return res.status(403).send("Invalid merchant");
        }

        // 3. Extract transaction ID from order_id (format: WTOP_<id>)
        const txId = parseInt(order_id.replace("WTOP_", ""), 10);
        if (isNaN(txId)) {
            return res.status(400).send("Invalid order_id format");
        }

        await connection.beginTransaction();

        // 4. Get the pending transaction (lock row to prevent double-credit)
        const [txRows] = await connection.query(
            "SELECT * FROM wallet_transactions WHERE id = ? AND status = 'PENDING' FOR UPDATE",
            [txId]
        );

        if (txRows.length === 0) {
            await connection.rollback();
            return res.status(200).send("Already processed");
        }

        const tx = txRows[0];

        // 5. Verify amount matches what we stored
        if (parseFloat(tx.amount).toFixed(2) !== parseFloat(payhere_amount).toFixed(2)) {
            await connection.query(
                "UPDATE wallet_transactions SET status = 'FAILED', reference_id = ? WHERE id = ?",
                [payment_id || null, txId]
            );
            await connection.commit();
            console.error("Amount mismatch for transaction:", txId);
            return res.status(400).send("Amount mismatch");
        }

        // 6. Process based on PayHere status (2 = success)
        if (status_code === "2") {
            await connection.query(
                "UPDATE wallets SET balance = balance + ? WHERE id = ?",
                [tx.amount, tx.wallet_id]
            );
            await connection.query(
                "UPDATE wallet_transactions SET status = 'COMPLETED', reference_id = ? WHERE id = ?",
                [payment_id || null, txId]
            );
        } else {
            await connection.query(
                "UPDATE wallet_transactions SET status = 'FAILED', reference_id = ? WHERE id = ?",
                [payment_id || null, txId]
            );
        }

        await connection.commit();
        res.status(200).send("OK");
    } catch (err) {
        await connection.rollback();
        console.error("Error in top-up notify:", err);
        res.status(500).send("Error");
    } finally {
        connection.release();
    }
};

// =====================================================
// Get wallet transaction history
// =====================================================
export const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const [wallets] = await pool.query(
            "SELECT id FROM wallets WHERE customer_id = ?",
            [userId]
        );

        if (wallets.length === 0) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        const walletId = wallets[0].id;

        const [transactions] = await pool.query(
            `SELECT wt.id, wt.amount, wt.type, wt.status, wt.reference_id, wt.charge_id, wt.created_at
             FROM wallet_transactions wt
             WHERE wt.wallet_id = ?
             ORDER BY wt.created_at DESC`,
            [walletId]
        );

        res.json(transactions);
    } catch (err) {
        console.error("Error fetching transaction history:", err);
        res.status(500).json({ message: "Server error" });
    }
};
