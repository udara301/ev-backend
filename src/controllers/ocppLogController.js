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
// Returns logs for a specific charge point within a date range
// =====================================================
export const getLogsByChargePoint = async (req, res) => {
    try {
        const { chargePointId } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                message: "startDate and endDate query parameters are required"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.status(400).json({
                message: "Invalid startDate or endDate format"
            });
        }

        if (start > end) {
            return res.status(400).json({
                message: "startDate must be before or equal to endDate"
            });
        }

        const [rows] = await pool.query(
            `SELECT id, charge_point_id, message_type, direction, payload, created_at
             FROM ocpp_logs
             WHERE charge_point_id = ?
               AND created_at BETWEEN ? AND ?
             ORDER BY created_at DESC
             `,
            [chargePointId, start, end]
        );

        res.json({
            charge_point_id: chargePointId,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            total: rows.length,
            logs: rows
        });
    } catch (err) {
        console.error("Error fetching OCPP logs:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
