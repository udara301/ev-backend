import cron from "node-cron";
import { pool } from "../config/db.js";

// Runs every 10 minutes:
// Sets chargers to UNAVAILABLE when updated_at is older than 8 minutes.
export const startMarkStaleChargersUnavailableCron = () => {
    cron.schedule("*/10 * * * *", async () => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [staleChargers] = await connection.query(
                `SELECT id
                 FROM chargers
                 WHERE status = 'AVAILABLE'
                 AND updated_at < NOW() - INTERVAL 8 MINUTE`
            );

            if (staleChargers.length > 0) {
                const chargerIds = staleChargers.map((row) => row.id);

                const [chargerResult] = await connection.query(
                    `UPDATE chargers
                     SET status = 'UNAVAILABLE'
                     WHERE id IN (?)
                     AND status = 'AVAILABLE'`,
                    [chargerIds]
                );

                const [connectorResult] = await connection.query(
                    `UPDATE connectors
                     SET status = 'UNAVAILABLE'
                     WHERE charger_id IN (?)
                     AND status <> 'UNAVAILABLE'`,
                    [chargerIds]
                );

                console.log(
                    `[CRON] Marked ${chargerResult.affectedRows} stale charger(s) and ${connectorResult.affectedRows} connector(s) as UNAVAILABLE`
                );
            }

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            console.error("[CRON] Error marking stale chargers as UNAVAILABLE:", err);
        } finally {
            connection.release();
        }
    });

    console.log(
        "[CRON] Stale charger monitor job started (runs every 10 minutes, threshold: 8 minutes)"
    );
};
