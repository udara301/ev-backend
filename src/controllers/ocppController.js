import { pool } from "../config/db.js";

export async function updateStatus(chargePointName, status) {
    const conn = await pool.getConnection();
    try {
        await conn.query("UPDATE chargers SET status = ? WHERE name = ?", [status, chargePointName]);
        console.log(`Updated charger ${chargePointName} status to ${status}`);
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