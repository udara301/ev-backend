import { pool } from "../config/db.js";
import crypto from 'crypto';
import dotenv from "dotenv";
dotenv.config();

// PAYMENT CONTROLLER is for rental bookings payments, not wallet top-ups. Wallet top-up logic is in walletController.js.

// initiate payment (called from Angular when user clicks "Confirm & Pay")
export const initiatePayment = async (req, res) => {
    try {
        const { booking_id, amount, method } = req.body;

        // Save the payment with status "pending"
        const [result] = await pool.query(
            "INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, 'pending')",
            [booking_id, amount, method]
        );

        res.json({ message: "Payment initiated", paymentId: result.insertId });
    } catch (err) {
        console.log("Initiate payment error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const handlePaymentNotify = async (req, res) => {
    console.log("===== PAYHERE NOTIFY HIT =====");
    console.log("Headers:", JSON.stringify(req.headers));
    console.log("Body:", JSON.stringify(req.body));
    console.log("Content-Type:", req.headers['content-type']);
    try {
        const { order_id, status_code, md5sig } = req.body;

        console.log("Parsed - order_id:", order_id, "status_code:", status_code, "md5sig:", md5sig);

        if (status_code === "2") {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();

                await connection.query(
                    "UPDATE payments SET payment_status = 'success' WHERE booking_id = ?",
                    [order_id]
                );

                const [[bookingRow]] = await connection.query(
                    `SELECT booking_id, user_id, applied_coupon_id, total_price_before_discount, total_price
                     FROM bookings
                     WHERE booking_id = ?
                     LIMIT 1`,
                    [order_id]
                );

                if (!bookingRow) {
                    await connection.rollback();
                    return res.status(404).send("Booking not found");
                }

                let affiliatePointsEarned = 0;

                if (bookingRow.applied_coupon_id) {
                    const [[couponOwnerProfile]] = await connection.query(
                        `SELECT ap.points_pct_charging
                         FROM coupons c
                         JOIN affiliate_profiles ap ON ap.id = c.affiliate_id
                         WHERE c.id = ?
                         LIMIT 1`,
                        [bookingRow.applied_coupon_id]
                    );

                    const pointsPctCharging = Number(couponOwnerProfile?.points_pct_charging ?? 0);
                    const totalBeforeDiscount = Number(
                        bookingRow.total_price_before_discount ?? bookingRow.total_price ?? 0
                    );

                    if (!Number.isNaN(pointsPctCharging) && !Number.isNaN(totalBeforeDiscount)) {
                        affiliatePointsEarned = Math.floor((totalBeforeDiscount * pointsPctCharging) / 100);
                    }

                    const [couponUsageColumns] = await connection.query(
                        `SELECT COLUMN_NAME
                         FROM INFORMATION_SCHEMA.COLUMNS
                         WHERE TABLE_SCHEMA = DATABASE()
                           AND TABLE_NAME = 'coupon_usages'`
                    );

                    const hasBookingId = couponUsageColumns.some(
                        (column) => column.COLUMN_NAME === "booking_id"
                    );
                    const hasChargeId = couponUsageColumns.some(
                        (column) => column.COLUMN_NAME === "charge_id"
                    );

                    try {
                        if (hasBookingId) {
                            const [existingUsage] = await connection.query(
                                `SELECT id
                                 FROM coupon_usages
                                 WHERE coupon_id = ? AND customer_id = ? AND booking_id = ?
                                 LIMIT 1`,
                                [bookingRow.applied_coupon_id, bookingRow.user_id, bookingRow.booking_id]
                            );

                            if (existingUsage.length === 0) {
                                await connection.query(
                                    `INSERT INTO coupon_usages (coupon_id, customer_id, booking_id)
                                     VALUES (?, ?, ?)`,
                                    [bookingRow.applied_coupon_id, bookingRow.user_id, bookingRow.booking_id]
                                );
                            }
                        } else if (hasChargeId) {
                            const [existingUsage] = await connection.query(
                                `SELECT id
                                 FROM coupon_usages
                                 WHERE coupon_id = ? AND customer_id = ? AND charge_id = ?
                                 LIMIT 1`,
                                [bookingRow.applied_coupon_id, bookingRow.user_id, bookingRow.booking_id]
                            );

                            if (existingUsage.length === 0) {
                                await connection.query(
                                    `INSERT INTO coupon_usages (coupon_id, customer_id, charge_id)
                                     VALUES (?, ?, ?)`,
                                    [bookingRow.applied_coupon_id, bookingRow.user_id, bookingRow.booking_id]
                                );
                            }
                        }
                    } catch (couponUsageErr) {
                        console.warn("Coupon usage insert skipped:", couponUsageErr.message);
                    }
                }

                await connection.query(
                    `UPDATE bookings
                     SET booking_status = 'confirmed',
                         affiliate_points_earned = ?
                     WHERE booking_id = ?`,
                    [affiliatePointsEarned, order_id]
                );

                await connection.commit();
            } catch (dbErr) {
                await connection.rollback();
                throw dbErr;
            } finally {
                connection.release();
            }

            // Send booking confirmation email after payment success
            // Get user email and booking/vehicle info
            const [[booking]] = await pool.query(
                `SELECT b.*, u.email, u.name, v.plate_number, m.model_name FROM bookings b
                 JOIN users u ON b.user_id = u.id
                 JOIN vehicles v ON b.vehicle_id = v.vehicle_id
                 JOIN vehicle_models m ON v.model_id = m.model_id
                 WHERE b.booking_id = ?`,
                [order_id]
            );
            if (booking && booking.email) {
                // Import sendBookingEmail if not already imported
                const { sendBookingEmail } = await import("../utils/mailer.js");
                await sendBookingEmail(booking.email, {
                    vehicle: `${booking.model_name} (${booking.plate_number})`,
                    pickup_date: booking.pickup_date,
                    pickup_time: booking.pickup_time,
                    dropoff_date: booking.dropoff_date,
                    dropoff_time: booking.dropoff_time,
                    total_price: booking.total_price
                });
            }
            console.log("Payment SUCCESS for order:", order_id);
            res.send("Payment Successful");
        } else {
            console.log("Payment NOT success. status_code:", status_code);
            res.send("Received");
        }
    } catch (err) {
        console.error("Notify error:", err);
        res.status(500).send("Error");
    }
};



// 1. Payment Flow (පියවරෙන් පියවර)
// Frontend (Angular): යූසර් "Confirm & Pay" බොත්තම එබුවාම, බුකින් විස්තර (Booking ID, Amount) Node.js backend එකට යවනවා.

// Backend (Node.js): Backend එකෙන් PayHere එකට අවශ්‍ය කරන hash අගය සහ අනෙකුත් විස්තර (Merchant ID, Order ID) හදලා ආපහු Angular එකට දෙනවා.

// Frontend (Angular): Angular එකෙන් යූසර්ව PayHere පේමන්ට් පේජ් එකට රීඩිරෙක්ට් කරනවා.

// Payment Gateway: යූසර් කාඩ් විස්තර දාලා පේමන්ට් එක කළාම, PayHere එකෙන් අපේ Backend එකේ Notify URL එකට "Success" කියලා මැසේජ් එකක් එවනවා.

// Backend (Node.js): මැසේජ් එක ආපු ගමන් අපි payments ටේබල් එක අප්ඩේට් කරලා, bookings ටේබල් එකේ status එක 'confirmed' කරනවා.

// 3. Database එකේ වෙන්න ඕනේ දේ
// පේමන්ට් එක සාර්ථක වුණාම ටේබල් දෙකක් අප්ඩේට් වෙනවා:

// payments table: මෙතන payment_status එක 'success' වෙනවා.

// bookings table: මෙතන booking_status එක 'confirmed' වෙනවා.

// 4. Angular පැත්තෙන් (PayHere Setup)
// Angular වලදී ඔයාට PayHere විසින් දෙන HTML Form එකක් පාවිච්චි කරන්න වෙනවා. යූසර් "Pay" බටන් එක එබුවාම මේ form එක submit කරන්න විතරයි තියෙන්නේ.

// HTML
// <form method="post" action="https://sandbox.payhere.lk/pay/checkout">   
//     <input type="hidden" name="merchant_id" value="YOUR_MERCHANT_ID">
//     <input type="hidden" name="order_id" [value]="bookingId">
//     <input type="hidden" name="items" value="EV Vehicle Rental">
//     <input type="hidden" name="currency" value="LKR">
//     <input type="hidden" name="amount" [value]="totalAmount">
//     <input type="submit" value="Buy Now">   
// </form>

// 2. Hash Generation Logic (Node.js Backend)
export const generatePaymentHash = (req, res) => {
    try {
        const { order_id, amount, currency } = req.body; // currency එකත් body එකෙන් ගන්න
        const merchant_id = process.env.PAYHERE_MERCHANT_ID;
        const merchant_secret = process.env.PAYHERE_MERCHANT_SECRET;        

        // 1. uppercase MD5 hash 
        const hashedSecret = crypto.createHash('md5')
            .update(merchant_secret)
            .digest('hex')
            .toUpperCase();

        const amountFormatted = parseFloat(amount).toFixed(2);

        // 3. Create the main string for hashing
        const mainString = merchant_id + order_id + amountFormatted + currency + hashedSecret;
        console.log("Main String for Hashing:", mainString); // Debugging
        const hash = crypto.createHash('md5')
            .update(mainString)
            .digest('hex')
            .toUpperCase();
        res.json({ hash });
    } catch (err) {
        res.status(500).json({ message: "Hash generation error" });
    }
};