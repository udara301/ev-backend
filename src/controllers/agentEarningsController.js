import { pool } from "../config/db.js";

// READ THIS CONTENT REGARDING AGENT EARNINGS CONTROLLER BEFORE MAKING ANY CHANGES TO THIS FILE:
// Agent earnings are recorded whenever a charge is made and an agent earns a commission from that charge. 
// This controller allows us to view those earnings (if needed), create manual records (if needed), and delete records (if needed). 
// Getting the earnings for an agent is not done through this controller - instead, it is done through the agentController.js getMyAgentDetails.
// **** The actual calculation and recording of earnings happens in with the charger stops when a payment is made.

export default async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM agent_earnings");
        res.json(rows);
    } catch (err) {
        console.error("❌ Get Agent Earnings Error:", err);
        res.status(500).json({ message: "Error fetching agent earnings" });
    }
};

export const getAgentEarningById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query("SELECT * FROM agent_earnings WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Agent earning not found" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("❌ Get Agent Earning By ID Error:", err);
        res.status(500).json({ message: "Error fetching agent earning" });
    }
};

export const createAgentEarning = async (req, res) => {
    try {
        const { agent_id, charge_id, total_amount, commission_amount } = req.body;
        const [result] = await pool.query(
            `INSERT INTO agent_earnings (agent_id, charge_id, total_amount, commission_amount) VALUES (?, ?, ?, ?)`,
            [agent_id, charge_id, total_amount, commission_amount]
        );
        res.status(201).json({ id: result.insertId, agent_id, charge_id, total_amount, commission_amount });
    } catch (err) {
        console.error("❌ Create Agent Earning Error:", err);
        res.status(500).json({ message: "Error creating agent earning" });
    }
};

export const deleteAgentEarning = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query("DELETE FROM agent_earnings WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Agent earning not found" });
        }
        res.json({ message: "Agent earning deleted" });
    } catch (err) {
        console.error("❌ Delete Agent Earning Error:", err);
        res.status(500).json({ message: "Error deleting agent earning" });
    }
};
