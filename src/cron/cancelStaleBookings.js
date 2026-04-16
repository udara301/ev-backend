import cron from "node-cron";
import { pool } from "../config/db.js";

// Runs every 2 minutes — cancels bookings & payments that have been pending for more than 15 minutes
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

            if (staleBookings.length === 0) {
                await connection.commit();
                return;
            }

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

            await connection.commit();
            console.log(`[CRON] Successfully cancelled ${bookingIds.length} stale booking(s)`);
        } catch (err) {
            await connection.rollback();
            console.error("[CRON] Error cancelling stale bookings:", err);
        } finally {
            connection.release();
        }
    });

    console.log("[CRON] Stale booking cancellation job started (runs every minute)");
};
