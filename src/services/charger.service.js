import { pool } from "../config/db.js";


export const getChargerById = async (chargerId) => {
    const [rows] = await pool.query("SELECT * FROM chargers WHERE id = ?", [chargerId]);
    return rows[0];
};

export const updateChargerStatus = async (chargerId, status) => {
    await pool.query("UPDATE chargers SET status = ? WHERE id = ?", [status, chargerId]);
};