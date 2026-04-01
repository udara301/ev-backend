import { pool } from "../config/db.js";


// Search for available vehicles based on category and date range
export const searchAvailableVehicles = async (req, res) => {
    try {
        const { category, pickup_date, dropoff_date } = req.query;

        // මූලික Query එක (Common parts)
        let query = `
            SELECT m.*, v.vehicle_id, v.plate_number 
            FROM vehicle_models m
            JOIN vehicles v ON m.model_id = v.model_id
            WHERE v.current_status = 'available'
            AND v.vehicle_id NOT IN (
                SELECT vehicle_id FROM bookings 
                WHERE booking_status != 'cancelled'
                AND NOT (dropoff_date <= ? OR pickup_date >= ?)
            )
        `;

        const queryParams = [pickup_date, dropoff_date];

        // කැටගරි එකක් තියෙනවා නම් සහ ඒක 'all' නෙවෙයි නම් විතරක් WHERE එකට එකතු කරනවා
        if (category && category !== 'all' && category !== '') {
            query += ` AND m.category = ?`;
            queryParams.push(category);
        }

        // අන්තිමට Group By එක දානවා
        query += ` GROUP BY m.model_id`;

        const [availableVehicles] = await pool.query(query, queryParams);
        res.json(availableVehicles);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error searching available vehicles" });
    }
};


// Customer: place a booking
export const placeBooking = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { vehicle_id, pickup_date, pickup_time, dropoff_date, dropoff_time, total_price } = req.body;
        const user_id = req.user.id;

        await connection.beginTransaction();

        // 1. Double check: Check if the vehicle is already booked for the selected dates
        const [isBooked] = await connection.query(
            `SELECT * FROM bookings 
             WHERE vehicle_id = ? AND booking_status != 'cancelled'
             AND NOT (dropoff_date <= ? OR pickup_date >= ?)`,
            [vehicle_id, pickup_date, dropoff_date]
        );

        if (isBooked.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Sorry, the vehicle is already booked for the selected dates." });
        }

        // 2. Save the booking
        const [booking] = await connection.query(
            "INSERT INTO bookings (user_id, vehicle_id, pickup_date, pickup_time, dropoff_date, dropoff_time, total_price, booking_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')",
            [user_id, vehicle_id, pickup_date, pickup_time, dropoff_date, dropoff_time, total_price]
        );

        await connection.commit();
        res.status(201).json({ message: "Booking placed successfully", bookingId: booking.insertId });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: "Booking error" });
    } finally {
        connection.release();
    }
};



// Customer: get their own bookings
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

// Admin: get all bookings
export const getAllBookingsForAdmin = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT b.*, u.name AS customer_name, u.email AS customer_email, m.model_name, v.plate_number
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN vehicles v ON b.vehicle_id = v.vehicle_id
             JOIN vehicle_models m ON v.model_id = m.model_id
             ORDER BY b.created_at DESC`
        );

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
