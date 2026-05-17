import cron from "node-cron";
import { pool } from "../config/db.js";

// Runs every 2 minutes:
// 1) cancels bookings/payments that have been pending for more than 15 minutes
// 2) fails wallet transactions that have been pending for more than 5 minutes
export const startCancelStaleBookingsCron = () => {
    cron.schedule("*/2 * * * *", async () => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Find bookings that are pending for more than 15 minutes
            const [staleBookings] = await connection.query(
                `SELECT booking_id FROM bookings 
                 WHERE booking_status = 'pending' 
                 AND created_at < NOW() - INTERVAL 15 MINUTE`
            );

            if (staleBookings.length > 0) {
                const bookingIds = staleBookings.map((b) => b.booking_id);
                console.log(`[CRON] Cancelling ${bookingIds.length} stale booking(s):`, bookingIds);

                // Update bookings to cancelled
                await connection.query(
                    `UPDATE bookings SET booking_status = 'cancelled' 
                     WHERE booking_id IN (?) AND booking_status = 'pending'`,
                    [bookingIds]
                );

                // Update associated payments to failed
                await connection.query(
                    `UPDATE payments SET payment_status = 'failed' 
                     WHERE booking_id IN (?) AND payment_status = 'pending'`,
                    [bookingIds]
                );

                console.log(`[CRON] Successfully cancelled ${bookingIds.length} stale booking(s)`);
            }

            // Fail stale wallet transactions that are still pending for more than 5 minutes
            const [walletResult] = await connection.query(
                `UPDATE wallet_transactions
                 SET status = 'FAILED'
                 WHERE status = 'PENDING'
                 AND created_at < NOW() - INTERVAL 5 MINUTE`
            );

            if (walletResult.affectedRows > 0) {
                console.log(`[CRON] Marked ${walletResult.affectedRows} stale wallet transaction(s) as FAILED`);
            }

            await connection.commit();
        } catch (err) {
            await connection.rollback();
            console.error("[CRON] Error cancelling stale bookings:", err);
        } finally {
            connection.release();
        }
    });

    console.log("[CRON] Stale booking cancellation job started (runs every minute)");
};
