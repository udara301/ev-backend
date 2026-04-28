import { pool } from "../config/db.js";
import { sendRemoteStart, sendRemoteStop } from "../ocpp/ocppSender.js";
import { setChargerUnavailable, updateConnectorStatus } from "../controllers/ocppController.js";
import * as walletService from "../services/wallet.service.js";
// =====================================================
// start charging session
// =====================================================
// NEED TO WORK WITH START CHARGing 

export const startCharging = async (req, res) => {
    const userRole = req.user.role; // CUSTOMER, AGENT_ADMIN, etc.
    // if (req.user.role !== "AGENT_ADMIN" ) {
    //     // return res.status(403).json({ message: "Forbidden" });
    // }
    if (userRole === "CUSTOMER") {
        const userId = req.user.id;
        // 1️⃣ Wallet Balance check (Minimum 200 LKR)
        const balance = await walletService.getBalance(userId);
        const MIN_BALANCE = 200.00;
        if (balance < MIN_BALANCE) {
            return res.status(402).json({
                message: "Insufficient balance",
                required: MIN_BALANCE,
                current: balance
            });
        }
    }
    console.log("Starting charge for user:", req.user.id, "with role:", userRole);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { chargerId, connectorId } = req.params;
        const { vehicle_number } = req.body;

        // 1️⃣ Get charger
        const [chargers] = await connection.query("SELECT * FROM chargers WHERE id = ?", [chargerId]);
        if (chargers.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Charger not found" });
        }

        const charger = chargers[0];

        // 2️⃣ Get connector and check its status
        const [connectors] = await connection.query(
            "SELECT * FROM connectors WHERE charger_id = ? AND connector_id = ?",
            [chargerId, connectorId]
        );
        if (connectors.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Connector not found" });
        }

        const connector = connectors[0];
        if (connector.status === "CHARGING" || connector.status === "PENDING") {
            await connection.rollback();
            return res.status(400).json({ message: "Connector is already in use" });
        }

        // 3️⃣ Create charge session
        const [result] = await connection.query(
            `INSERT INTO charges (charger_id, connector_id, customer_id, start_time, status, vehicle_number)
       VALUES (?, ?, ?, NOW(), 'PENDING', ?)`,
            [chargerId, connectorId, req.user.id, vehicle_number || null]
        );

        const chargeId = result.insertId;

        // 4️⃣ Update connector status and active_charge_id
        await connection.query(
            `UPDATE connectors 
       SET status = 'PENDING',
        active_charge_id = ?
       WHERE charger_id = ? AND connector_id = ?`,
            [chargeId, chargerId, connectorId]
        );




        const started = sendRemoteStart(chargerId, "ADMIN", parseInt(connectorId));
        console.log("Remote start command sent. OCPP response:", started);
        if (!started) {
            // Mark charger and connector as offline
            await setChargerUnavailable(chargerId);
            await updateConnectorStatus(chargerId, connectorId, "OFFLINE");
            await connection.rollback();
            // Mark the charge session as FAILED (outside transaction)
            await pool.query(
                `UPDATE charges SET status = 'FAILED', end_time = NOW() WHERE id = ?`,
                [chargeId]
            );
            return res.status(400).json({ message: "Connector is offline" });
        }

        await connection.commit();

        res.status(201).json({
            message: "Charging command sent successfully",
            charge_id: result.insertId,
            charger_id: chargerId,
            connector_id: parseInt(connectorId),
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
    console.log("Updating charge:", chargeId, "with OCPP TX ID:", ocpp_transaction_id, "status:", status);
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
// Find the latest pending or charging session by charger ID and connector ID
// =====================================================
export async function findPendingByCharger(chargerId, connectorId) {
    const connection = await pool.getConnection();

    try {
        const [rows] = await connection.query(
            `SELECT * 
             FROM charges
             WHERE charger_id = ? 
               AND connector_id = ?
               AND status IN ('PENDING','CHARGING')
             ORDER BY created_at DESC
             LIMIT 1`,
            [chargerId, connectorId]
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
            (charger_id, connector_id, customer_id, start_time, end_time, amount, status, vehicle_number, 
             ocpp_transaction_id, meter_start, meter_stop, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                payload.charger_id,
                payload.connector_id || null,
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
// update the current meter readings while charging
// =====================================================

export async function updateMeterReadings(txId, meterStopValue) {
    const connection = await pool.getConnection();

    try {
        // Update meter_stop
        await connection.query(
            `UPDATE charges
             SET meter_stop = ?, 
                 updated_at = NOW()
             WHERE ocpp_transaction_id = ?`,
            [meterStopValue, txId]
        );
    } finally {
        connection.release();
    }
}

// =====================================================
// update the active charge and connector status
// =====================================================

export async function setActiveChargeAndStatus(chargerId, connectorId, chargeId, status) {
    const connection = await pool.getConnection();
    console.log("Updating connector:", connectorId, "of charger:", chargerId, "with charge:", chargeId, "status:", status);
    try {

        // Update connector table
        await connection.query(
            `UPDATE connectors
             SET active_charge_id = ?, status = ?
             WHERE charger_id = ? AND connector_id = ?`,
            [chargeId || null, status, chargerId, connectorId]
        );

        // Return updated charger
        const [rows] = await connection.query(
            `SELECT * FROM chargers WHERE id = ?`,
            [chargerId]
        );
        return rows[0];
    }
    catch (error) {
        console.error("Error updating connector:", error);
        throw error;
    } finally {
        connection.release();
    }
}

// =====================================================
// stop charging session
// =====================================================

export const stopCharging = async (req, res) => {
    // if (req.user.role !== "AGENT_ADMIN") {
    //     return res.status(403).json({ message: "Forbidden" });
    // }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { chargerId, connectorId } = req.params;

        // 1️⃣ Get charger (need ocpp_id for sendRemoteStop)
        const [chargers] = await connection.query("SELECT * FROM chargers WHERE id = ?", [chargerId]);
        if (chargers.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Charger not found" });
        }

        const charger = chargers[0];

        // 2️⃣ Find active charge on this connector
        const [charges] = await connection.query(
            `SELECT * FROM charges 
       WHERE charger_id = ? AND connector_id = ? AND status = 'CHARGING'
       ORDER BY id DESC LIMIT 1`,
            [chargerId, connectorId]
        );

        if (charges.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "No active charging session found on this connector" });
        }

        const stopped = sendRemoteStop(chargerId, charges[0].ocpp_transaction_id);

        if (!stopped) {
            // Mark charger and connector as offline
            await setChargerUnavailable(chargerId);
            await updateConnectorStatus(chargerId, connectorId, "UNAVAILABLE");
            await connection.rollback();
            // Mark the charge session as FAILED (outside transaction)
            await pool.query(
                `UPDATE charges SET status = 'FAILED', end_time = NOW() WHERE id = ?`,
                [charges[0].id]
            );
            return res.status(400).json({ message: "Charger is offline" });
        }

        await connection.commit();

        res.status(200).json({
            message: "Charging stop command sent successfully",
            charge_id: charges[0].id,
            connector_id: parseInt(connectorId),
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


// =====================================================
// stop charging session with OCPP (request) transaction ID
// =====================================================

export const stopChargeWithChargeId = async (chargeId, { end_time, meter_stop, amount, status }) => {
    console.log("Stopping charge:", chargeId, "with status:", status, "meter_stop:", meter_stop, "amount:", amount);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE charges
             SET 
                 status = ?, 
                 meter_stop = ?, 
                 end_time = ?,
                 amount = ?
             WHERE id = ?`,
            [status, meter_stop, end_time, amount, chargeId]
        );

        // Return the updated row
        const [rows] = await connection.query(
            `SELECT * FROM charges WHERE id = ?`,
            [chargeId]
        );

        await connection.commit();
        console.log("Updated charge:", rows[0]);
        return rows[0];
    } catch (error) {
        console.error("Error in stopChargeWithChargeId:", error);
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

};

export const findByOcppTransactionId = async (ocppTransactionId) => {
    const [rows] = await pool.query("SELECT * FROM charges WHERE ocpp_transaction_id = ?", [ocppTransactionId]);
    return rows[0];
};

// =====================================================
// Get active charging session for the logged-in user
// =====================================================
export const getActiveChargingSession = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(
            `SELECT 
                ch.id AS charge_id,
                ch.charger_id,
                ch.connector_id,
                ch.start_time,
                ch.meter_start,
                ch.meter_stop,
                ch.amount,
                ch.status,
                ch.vehicle_number,
                ch.ocpp_transaction_id,
                ch.note,
                TIMESTAMPDIFF(SECOND, ch.start_time, NOW()) / 3600 AS duration_hours,
                c.ocpp_id,
                c.location,
                c.street_name,
                c.city,
                c.price_per_kwh,
                ct.model AS charger_type_model,
                ct.current_type,
                con.connector_type,
                con.max_power_kw
            FROM charges ch
            JOIN chargers c ON ch.charger_id = c.id
            LEFT JOIN charger_types ct ON c.charger_type_id = ct.id
            LEFT JOIN connectors con ON con.charger_id = c.id AND con.connector_id = ch.connector_id
            WHERE ch.customer_id = ? AND ch.status IN ('PENDING', 'CHARGING')
            ORDER BY ch.created_at DESC
            LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return res.json({ active_session: null });
        }

        res.json({ active_session: rows[0] });
    } catch (err) {
        console.error("Error fetching active charging session:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};
