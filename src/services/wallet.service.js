// src/services/wallet.service.js
import { pool } from "../config/db.js";

export const getBalance = async (customerId) => {
    const [rows] = await pool.query("SELECT balance FROM wallets WHERE customer_id = ?", [customerId]);
    return rows.length ? parseFloat(rows[0].balance) : 0;
};

export const deductBalance = async (customerId, chargeId, amount) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Wallet ID and remainig balance 
        const [wallets] = await conn.query("SELECT id, balance FROM wallets WHERE customer_id = ? FOR UPDATE", [customerId]);
        if (wallets.length === 0) throw new Error("Wallet not found");

        const walletId = wallets[0].id;
        const newBalance = parseFloat(wallets[0].balance) - amount;

        // 2. update the balance
        await conn.query("UPDATE wallets SET balance = ? WHERE id = ?", [newBalance, walletId]);

        // 3. record transaction
        await conn.query(
            `INSERT INTO wallet_transactions (wallet_id, charge_id, amount, type) 
             VALUES (?, ?, ?, 'PAYMENT')`,
            [walletId, chargeId, amount]
        );

        await conn.commit();
        return newBalance;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};