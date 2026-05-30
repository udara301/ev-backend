import { pool } from "../config/db.js";

export async function updateStatus(chargePointId, status) {
    const conn = await pool.getConnection();
    try {
        await conn.query("UPDATE chargers SET status = ? WHERE id = ?", [status, chargePointId]);
        console.log(`Updated charger ${chargePointId} status to ${status}`);
    } catch (error) {
        console.error("Error updating charger status:", error);
        throw error;
    }
    finally {
        conn.release();
    }
}

export async function updateConnectorStatus(chargePointId, connectorId, status) {
    const conn = await pool.getConnection();
    try {
        await conn.query(
            "UPDATE connectors SET status = ? WHERE charger_id = ? AND connector_id = ?",
            [status, chargePointId, connectorId]
        );
        console.log(`Updated connector ${connectorId} of charger ${chargePointId} status to ${status}`);
    } catch (error) {
        console.error("Error updating connector status:", error);
        throw error;
    } finally {
        conn.release();
    }
}

export async function updateConnectorHeartbeat(chargePointId) {
    const conn = await pool.getConnection();
    try {
        await conn.query(
            "UPDATE chargers SET updated_at = CURRENT_TIMESTAMP WHERE charger_id = ?",
            [chargePointId]
        );
        console.log(`Updated heartbeat for charger ${chargePointId}`);

        const [chargerRows] = await conn.query(
            "SELECT status FROM chargers WHERE id = ?",
            [chargePointId]
        );

        const chargerStatus = chargerRows[0]?.status;
        if (chargerStatus === "UNAVAILABLE") {
            await conn.query(
                "UPDATE chargers SET status = 'AVAILABLE' WHERE id = ?",
                [chargePointId]
            );
            await conn.query(
                "UPDATE connectors SET status = 'AVAILABLE' WHERE charger_id = ?",
                [chargePointId]
            );
            console.log(`Heartbeat recovery: charger ${chargePointId} and all connectors set to AVAILABLE`);
        }
    } catch (error) {
        console.error("Error updating charger heartbeat:", error);
        throw error;
    } finally {
        conn.release();
    }
}

export async function setAllConnectorsStatus(chargePointId, status) {
    const conn = await pool.getConnection();
    try {
        await conn.query(
            "UPDATE connectors SET status = ? WHERE charger_id = ?",
            [status, chargePointId]
        );
        console.log(`Set all connectors of charger ${chargePointId} to ${status}`);
    } catch (error) {
        console.error("Error setting all connector statuses:", error);
        throw error;
    } finally {
        conn.release();
    }
}

export const setChargerIdle = async (name) => {
    await updateStatus(name, "AVAILABLE");
    await setAllConnectorsStatus(name, "AVAILABLE");
};
export const setChargerUnavailable = async (name) => {
    await updateStatus(name, "UNAVAILABLE");
    await setAllConnectorsStatus(name, "UNAVAILABLE");
};