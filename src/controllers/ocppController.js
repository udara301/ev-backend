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

export const setChargerIdle = (name) => updateStatus(name, "IDLE");
export const setChargerUnavailable = (name) => {updateStatus(name, "UNAVAILABLE")};