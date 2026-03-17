import { pool } from "../config/db.js";

export const createBooking = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { vehicle_id, pickup_date, dropoff_date } = req.body;
        const user_id = req.user.id; // ලොග් වී සිටින යූසර්

        await connection.beginTransaction();

        // 1. වාහනය එම දිනවලට "Available" ද කියා බැලීම (Date Overlap Logic)
        const [overlap] = await connection.query(
            `SELECT * FROM bookings 
             WHERE vehicle_id = ? 
             AND booking_status NOT IN ('cancelled')
             AND (
                (pickup_date <= ? AND dropoff_date >= ?) -- නව බුකින් එක මැදට පරණ එකක් ඒම
                OR (pickup_date <= ? AND dropoff_date >= ?) -- පරණ එක මැදට නව එක ඒම
             )`,
            [vehicle_id, dropoff_date, pickup_date, pickup_date, pickup_date]
        );

        if (overlap.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "මෙම දිනයන් සඳහා වාහනය දැනටමත් වෙන්කර ඇත (Already Booked)" });
        }

        // 2. මිල ගණනය කිරීම
        const [vehicle] = await connection.query(
            "SELECT m.base_price_per_day FROM vehicles v JOIN vehicle_models m ON v.model_id = m.model_id WHERE v.vehicle_id = ?",
            [vehicle_id]
        );

        const date1 = new Date(pickup_date);
        const date2 = new Date(dropoff_date);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // අවම දින 1යි
        const total_price = diffDays * vehicle[0].base_price_per_day;

        // 3. බුකින් එක ඇතුළත් කිරීම
        const [bookingResult] = await connection.query(
            "INSERT INTO bookings (user_id, vehicle_id, pickup_date, dropoff_date, total_price) VALUES (?, ?, ?, ?, ?)",
            [user_id, vehicle_id, pickup_date, dropoff_date, total_price]
        );

        await connection.commit();
        res.status(201).json({
            message: "Booking successful",
            bookingId: bookingResult.insertId,
            total_price
        });

    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        connection.release();
    }
};

// යූසර්ට තමන්ගේ බුකින් විස්තර බැලීම
export const getMyBookings = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT b.*, m.model_name, v.plate_number 
             FROM bookings b 
             JOIN vehicles v ON b.vehicle_id = v.vehicle_id 
             JOIN vehicle_models m ON v.model_id = m.model_id 
             WHERE b.user_id = ?`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};