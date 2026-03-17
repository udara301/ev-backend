import { pool } from "../config/db.js";

// 1. Create Unit
export const addVehicleUnit = async (req, res) => {
    try {
        const { model_id, plate_number } = req.body;
        const owner_id = req.user.id;
        await pool.query("INSERT INTO vehicles (model_id, plate_number, owner_id) VALUES (?, ?, ?)",
            [model_id, plate_number, owner_id]);
        res.status(201).json({ message: "Vehicle unit added" });
    } catch (err) {
        // console.log(err);
        res.status(500).json({ message: "Server error" });
    }
};

// 2. Read Units (Get all vehicles and model details)
export const getAllVehicles = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.*, m.model_name, m.brand 
            FROM vehicles v 
            JOIN vehicle_models m ON v.model_id = m.model_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};


// 3. Update Vehicle Status (Maintenance දාන්න වගේ)
export const updateVehicleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'available', 'maintenance', 'rented'
        await pool.query("UPDATE vehicles SET current_status = ? WHERE vehicle_id = ?", [status, id]);
        res.json({ message: "Vehicle status updated" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

// 4. Delete Unit
export const deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM vehicles WHERE vehicle_id = ?", [id]);
        res.json({ message: "Vehicle deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};