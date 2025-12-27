import { pool } from "../config/db.js";
import { sendRemoteStart, sendRemoteStop } from "../ocpp/ocppSender.js";
// =====================================================
// start charging session
// =====================================================

export const startCharging = async (req, res) => {
    if (req.user.role !== "AGENT_ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { chargerId } = req.params;
        const { vehicle_number } = req.body;

        // 1️⃣ Get charger
        const [chargers] = await connection.query("SELECT * FROM chargers WHERE id = ?", [chargerId]);
        if (chargers.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Charger not found" });
        }

        const charger = chargers[0];
        if (charger.status === "CHARGING") {
            await connection.rollback();
            return res.status(400).json({ message: "Charger is already in use" });
        }

        const started = sendRemoteStart(chargerId);

        if (!started) {
            await connection.rollback();
            return res.status(400).json({ message: "Charger is offline" });
        }

        // 2️⃣ Create charge session
        const [result] = await connection.query(
            `INSERT INTO charges (charger_id, start_time, status, vehicle_number)
       VALUES (?, NOW(), 'PENDING', ?)`,
            [chargerId, vehicle_number || null]
        );

        const chargeId = result.insertId;

        // 3️⃣ Update charger status
        await connection.query(
            `UPDATE chargers 
       SET status = 'PENDING', last_charge_start = NOW(),
        active_charge_id = ?
       WHERE id = ?`,
            [chargeId, chargerId]
        );

        await connection.commit();

        res.status(201).json({
            message: "Charging command sent successfully",
            charge_id: result.insertId,
            charger_id: chargerId,
            start_time: new Date(),
            status: "PENDING",
        });
    } catch (error) {
        console.error("Error starting charge:", error);
        await connection.rollback();
        res.status(500).json({ message: "Internal server error" });
    } finally {
        connection.release();
    }
};


// =====================================================
// handle remote start response
// =====================================================

export const updateChargeWithOcppTx = async (chargeId, { ocpp_transaction_id, status, meter_start, start_time }) => {
    const connection = await pool.getConnection();
     try {
        await connection.query(
            `UPDATE charges
             SET ocpp_transaction_id = ?, 
                 status = ?, 
                 meter_start = ?, 
                 start_time = ?
             WHERE id = ?`,
            [ocpp_transaction_id, status, meter_start, start_time, chargeId]
        );

        // Return the updated row
        const [rows] = await connection.query(
            `SELECT * FROM charges WHERE id = ?`,
            [chargeId]
        );

        return rows[0];
    } finally {
        connection.release();
    }

}

// =====================================================
// Find the latest pending or charging session by charger ID
// =====================================================
export async function findPendingByCharger(chargerId) {
    const connection = await pool.getConnection();

    try {
        const [rows] = await connection.query(
            `SELECT * 
             FROM charges
             WHERE charger_id = ? 
               AND status IN ('PENDING','CHARGING')
             ORDER BY created_at DESC
             LIMIT 1`,
            [chargerId]
        );

        return rows.length ? rows[0] : null;
    } finally {
        connection.release();
    }
}
// =====================================================
// create new carge record for manual start without frontend interaction (may be via tag)
// =====================================================

export async function createCharge(payload) {
    const connection = await pool.getConnection();

    try {
        const [result] = await connection.query(
            `INSERT INTO charges 
            (charger_id, customer_id, start_time, end_time, amount, status, vehicle_number, 
             ocpp_transaction_id, meter_start, meter_stop, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                payload.charger_id,
                payload.customer_id || null,
                payload.start_time,
                payload.end_time || null,
                payload.amount || null,
                payload.status || "PENDING",
                payload.vehicle_number || null,
                payload.ocpp_transaction_id || null,
                payload.meter_start || null,
                payload.meter_stop || null
            ]
        );

        // Return the inserted row
        const [rows] = await connection.query(
            `SELECT * FROM charges WHERE id = ?`,
            [result.insertId]
        );

        return rows[0];
    } finally {
        connection.release();
    }
}

// =====================================================
// update the active charge and charger status in charger table
// =====================================================

export async function setActiveChargeAndStatus(chargerId, chargeId, status) {
    const connection = await pool.getConnection();

    try {
        // Update charger table
        await connection.query(
            `UPDATE chargers
             SET active_charge_id = ?, status = ?
             WHERE id = ?`,
            [chargeId || null, status, chargerId]
        );

        // Return updated charger
        const [rows] = await connection.query(
            `SELECT * FROM chargers WHERE id = ?`,
            [chargerId]
        );

        return rows[0];
    } finally {
        connection.release();
    }
}

// =====================================================
// stop charging session
// =====================================================

export const stopCharging = async (req, res) => {
    if (req.user.role !== "AGENT_ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { chargerId } = req.params;
        const { energy_used_kwh } = req.body;

        // 1️⃣ Find active charge
        const [charges] = await connection.query(
            `SELECT * FROM charges 
       WHERE charger_id = ? AND status = 'CHARGING'
       ORDER BY id DESC LIMIT 1`,
            [chargerId]
        );

        if (charges.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "No active charging session found" });
        }

        sendRemoteStop(chargerId, charges[0].ocpp_transaction_id);

            const charge = charges[0];

            // 2️⃣ Get price per kWh
            const [chargers] = await connection.query(
                "SELECT price_per_kwh FROM chargers WHERE id = ?",
                [chargerId]
            );

            const pricePerKwh = chargers[0]?.price_per_kwh || 0;
            const amount = energy_used_kwh ? energy_used_kwh * pricePerKwh : 0;

            // 3️⃣ Update charge record
            await connection.query(
                `UPDATE charges 
        SET end_time = NOW(), amount = ?, status = 'COMPLETED'
        WHERE id = ?`,
                [amount, charge.id]
            );

            // 4️⃣ Update charger
            await connection.query(
                `UPDATE chargers 
        SET status = 'IDLE', 
            last_charge_end = NOW(), 
            last_charge_amount = ?
        WHERE id = ?`,
                [amount, chargerId]
            );

            await connection.commit();

            res.status(200).json({
                message: "Charging stopped successfully",
                charge_id: charge.id,
                amount,
                status: "COMPLETED",
            });
    } catch (error) {
        console.error("Error stopping charge:", error);
        await connection.rollback();
        res.status(500).json({ message: "Internal server error" });
    } finally {
        connection.release();
    }
};