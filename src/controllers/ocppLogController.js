import { pool } from "../config/db.js";

// =====================================================
// Write a log entry to ocpp_logs
// =====================================================
export async function writeOcppLog(chargePointId, messageType, direction, payload) {
    try {
        await pool.query(
            `INSERT INTO ocpp_logs (charge_point_id, message_type, direction, payload)
             VALUES (?, ?, ?, ?)`,
            [chargePointId, messageType, direction, JSON.stringify(payload)]
        );
    } catch (err) {
        // Log write failures should never crash the main OCPP flow
        console.error("[OCPP LOG] Failed to write log entry:", err.message);
    }
}

// =====================================================
// GET /api/v1/ocpp-logs/:chargePointId
// Returns paginated logs for a specific charge point
// =====================================================
export const getLogsByChargePoint = async (req, res) => {
    try {
        const { chargePointId } = req.params;
        const page  = Math.max(parseInt(req.query.page,  10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
        const offset = (page - 1) * limit;

        const [rows] = await pool.query(
            `SELECT id, charge_point_id, message_type, direction, payload, created_at
             FROM ocpp_logs
             WHERE charge_point_id = ?
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [chargePointId, limit, offset]
        );

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS total FROM ocpp_logs WHERE charge_point_id = ?`,
            [chargePointId]
        );

        const total = countRows[0]?.total || 0;

        res.json({
            charge_point_id: chargePointId,
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
            logs: rows
        });
    } catch (err) {
        console.error("Error fetching OCPP logs:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
