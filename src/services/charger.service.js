import { pool } from "../config/db.js";


export const getChargerById = async (chargerId) => {
    const [rows] = await pool.query("SELECT * FROM chargers WHERE id = ?", [chargerId]);
    return rows[0];
};

export const getConnector = async (chargerId, connectorId) => {
    const [rows] = await pool.query(
        "SELECT * FROM connectors WHERE charger_id = ? AND connector_id = ?",
        [chargerId, connectorId]
    );
    return rows[0];
};

export const updateChargerStatus = async (chargerId, status) => {
    await pool.query("UPDATE chargers SET status = ? WHERE id = ?", [status, chargerId]);
};

export const updateConnectorStatus = async (chargerId, connectorId, status) => {
    await pool.query(
        "UPDATE connectors SET status = ? WHERE charger_id = ? AND connector_id = ?",
        [status, chargerId, connectorId]
    );
};