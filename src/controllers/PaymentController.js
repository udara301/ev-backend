import { pool } from "../config/db.js";

// පේමන්ට් එකක් ආරම්භ කිරීම (පේමන්ට් ගේට්වේ එකට යන්න කලින්)
export const initiatePayment = async (req, res) => {
    try {
        const { booking_id, amount, method } = req.body;

        // මුලින්ම පේමන්ට් එක 'pending' විදිහට සේව් කරනවා
        const [result] = await pool.query(
            "INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, 'pending')",
            [booking_id, amount, method]
        );

        res.json({ message: "Payment initiated", paymentId: result.insertId });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

// පේමන්ට් එක සාර්ථක වුණාම (Web-hook/Notify logic)
export const handlePaymentNotify = async (req, res) => {
    try {
        const { order_id, status_code, md5sig } = req.body; 
        // PayHere වගේ එව්වොත් මේ විස්තර එවනවා

        if (status_code === "2") { // 2 කියන්නේ සාමාන්‍යයෙන් Success
            await pool.query("UPDATE payments SET payment_status = 'success' WHERE booking_id = ?", [order_id]);
            await pool.query("UPDATE bookings SET booking_status = 'confirmed' WHERE booking_id = ?", [order_id]);
            
            res.send("Payment Successful");
        }
    } catch (err) {
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