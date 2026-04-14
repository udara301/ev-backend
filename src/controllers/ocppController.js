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