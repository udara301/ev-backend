
import { pool } from "../config/db.js";
import crypto from 'crypto';
import dotenv from "dotenv";
dotenv.config();

export const completeAgentPayout = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { agentId, amount, receiptUrl } = req.body;

        await connection.beginTransaction();

        // 1. Payout record set as "PAID" with current timestamp and receipt URL
        await connection.query(
            `INSERT INTO payouts (agent_id, amount, status, paid_at, receipt_url) 
             VALUES (?, ?, 'PAID', NOW(), ?)`,
            [agentId, amount, receiptUrl]
        );

        // 2. Deduct the paid amount from the agent's payable_balance
        // This is the most crucial step!
        const [result] = await connection.query(
            "UPDATE agents SET payable_balance = payable_balance - ? WHERE id = ?",
            [amount, agentId]
        );

        if (result.affectedRows === 0) {
            throw new Error("Agent not found or update failed");
        }

        await connection.commit();
        res.json({ message: "Payout recorded and agent balance updated successfully" });

    } catch (err) {
        await connection.rollback();
        console.error("❌ Payout Error:", err);
        res.status(500).json({ message: "Error processing payout" });
    } finally {
        connection.release();
    }
};

export const revertAgentPayout = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { payoutId } = req.body;
        await connection.beginTransaction();

        // 1. Find the payout record
        const [payoutRows] = await connection.query(
            "SELECT agent_id, amount, status FROM payouts WHERE id = ? FOR UPDATE",
            [payoutId]
        );
        if (payoutRows.length === 0) {
            throw new Error("Payout not found");
        }
        const { agent_id, amount, status } = payoutRows[0];
        if (status !== 'PAID') {
            throw new Error("Only PAID payouts can be reverted");
        }

        // 2. Update payout status to REVERTED
        await connection.query(
            "UPDATE payouts SET status = 'REVERTED', reverted_at = NOW() WHERE id = ?",
            [payoutId]
        );

        // 3. Restore the agent's payable_balance
        const [result] = await connection.query(
            "UPDATE agents SET payable_balance = payable_balance + ? WHERE id = ?",
            [amount, agent_id]
        );
        if (result.affectedRows === 0) {
            throw new Error("Agent not found or update failed");
        }

        await connection.commit();
        res.json({ message: "Payout reverted and agent balance restored" });
    } catch (err) {
        await connection.rollback();
        console.error("❌ Revert Payout Error:", err);
        res.status(500).json({ message: err.message || "Error reverting payout" });
    } finally {
        connection.release();
    }
};
// Get all payouts with agent name (admin)
export const getAllPayoutsWithAgentName = async (req, res) => {
    try {
        // Only allow admin roles (optional: adjust as needed)
        if (req.user.role !== "COMPANY_ADMIN") {
            return res.status(403).json({ message: "Forbidden" });
        }
        const [rows] = await pool.query(`
            SELECT p.*, a.contact_person AS agent_name, u.name AS user_name, u.email AS agent_email
            FROM payouts p
            JOIN agents a ON p.agent_id = a.id
            JOIN users u ON a.user_id = u.id
            ORDER BY p.paid_at DESC, p.id DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("❌ Get All Payouts Error:", err);
        res.status(500).json({ message: "Error fetching payouts" });
    }
};