// src/services/wallet.service.js
import { pool } from "../config/db.js";

export const getBalance = async (customerId) => {
    const [rows] = await pool.query("SELECT balance FROM wallets WHERE customer_id = ?", [customerId]);
    return rows.length ? parseFloat(rows[0].balance) : 0;
};

export const deductBalance = async (customerId, chargeId, amount, chargerId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Wallet ID and remainig balance 
        const [wallets] = await conn.query("SELECT id, balance FROM wallets WHERE customer_id = ? FOR UPDATE", [customerId]);
        if (wallets.length === 0) throw new Error("Wallet not found");

        const walletId = wallets[0].id;
        const newBalance = parseFloat(wallets[0].balance) - amount;

        // 2. update the balance from customer
        await conn.query("UPDATE wallets SET balance = ? WHERE id = ?", [newBalance, walletId]);

        // 3. record transaction
        await conn.query(
            `INSERT INTO wallet_transactions (wallet_id, charge_id, amount, type) 
             VALUES (?, ?, ?, 'PAYMENT')`,
            [walletId, chargeId, amount]
        );

        // 4. get Agent commission rate
        const [agentData] = await conn.query(
            `SELECT a.id, a.commission_percentage 
             FROM agents a
             JOIN chargers c ON c.agent_id = a.id
             WHERE c.id = ?`,
            [chargerId]
        );

        if (agentData.length > 0) {
            const agentId = agentData[0].id;
            const commPercentage = agentData[0].commission_percentage;
            const agentEarnings = (amount * commPercentage) / 100;

            console.log(`Agent ID: ${agentId}, Commission Percentage: ${commPercentage}%, Agent Earnings: ${agentEarnings}`);
            // Increasing the balance for agent
            await conn.query(
                "UPDATE agents SET payable_balance = payable_balance + ? WHERE id = ?",
                [agentEarnings, agentId]
            );

            // Record the agent's earnings in the agent_earnings table for audit purposes
            await conn.query(
                `INSERT INTO agent_earnings (agent_id, charge_id, total_amount, commission_amount) 
                 VALUES (?, ?, ?, ?)`,
                [agentId, chargeId, amount, agentEarnings]
            );
        }

        await conn.commit();
        return newBalance;
    } catch (error) {
        await conn.rollback();
        console.error("Wallet Deduction Error:", error);
        throw error;
    } finally {
        conn.release();
    }
};