import cron from "node-cron";
import { pool } from "../config/db.js";

// Runs every day at midnight — deletes ocpp_logs older than 30 days
export const startPurgeOcppLogsCron = () => {
    cron.schedule("0 0 * * *", async () => {
        try {
            const [result] = await pool.query(
                `DELETE FROM ocpp_logs WHERE created_at < NOW() - INTERVAL 30 DAY`
            );
            console.log(`[CRON] Purged ${result.affectedRows} OCPP log(s) older than 30 days`);
        } catch (err) {
            console.error("[CRON] Error purging OCPP logs:", err);
        }
    });

    console.log("[CRON] OCPP log purge job started (runs daily at midnight)");
};
