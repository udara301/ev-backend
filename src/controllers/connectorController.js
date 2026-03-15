import { pool } from "../config/db.js";

// =====================================================
// 1️⃣ Get Connectors for a specific Charger
// =====================================================
export const getConnectorsByCharger = async (req, res) => {
  try {
    const { chargerId } = req.params;

    const [rows] = await pool.query(
      `SELECT id, connector_id, status, active_charge_id 
       FROM connectors 
       WHERE charger_id = ? 
       ORDER BY connector_id ASC`,
      [chargerId]
    );

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching connectors:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =====================================================
// 2️⃣ Update Connector Status (Agent/Admin manually)
// =====================================================
export const updateConnectorStatus = async (req, res) => {
  try {
    const { connectorId } = req.params; // DB Primary Key ID
    const { status } = req.body; // e.g., 'AVAILABLE', 'UNAVAILABLE' (Out of order)

    const allowedManualStatus = ['AVAILABLE', 'UNAVAILABLE', 'FAULTED'];
    if (!allowedManualStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status update" });
    }

    const [result] = await pool.query(
      "UPDATE connectors SET status = ? WHERE id = ?",
      [status, connectorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Connector not found" });
    }

    res.json({ message: "Connector status updated successfully" });
  } catch (err) {
    console.error("❌ Error updating connector status:", err);
    res.status(500).json({ message: "Server error" });
  }
};  