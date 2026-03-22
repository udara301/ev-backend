import { pool } from "../config/db.js";

// 1. Create Model
export const addVehicleModel = async (req, res) => {
    try {
        const { model_name, brand, battery_capacity, range_per_charge, base_price_per_day, image_url, description } = req.body;
        const [result] = await pool.query(
            "INSERT INTO vehicle_models (model_name, brand, battery_capacity, range_per_charge, base_price_per_day, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [model_name, brand, battery_capacity, range_per_charge, base_price_per_day, image_url, description]
        );
        res.status(201).json({ message: "Model created", id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// 2. Read All Models
export const getAllModels = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM vehicle_models");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

// 3. Update Model
export const updateModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { model_name, brand, base_price_per_day, image_url, description, battery_capacity, range_per_charge } = req.body;
        await pool.query(
            "UPDATE vehicle_models SET model_name=?, brand=?, base_price_per_day=?, image_url=?, description=?, battery_capacity=?, range_per_charge=? WHERE model_id=?",
            [model_name, brand, base_price_per_day, image_url, description, battery_capacity, range_per_charge, id]
        );
        res.json({ message: "Model updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

// 4. get Single Model by ID
export const getModelById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query("SELECT * FROM vehicle_models WHERE model_id = ?", [id]);

        if (!rows.length) {
            return res.status(404).json({ message: "Model not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

// 5. Delete Model
export const deleteModel = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM vehicle_models WHERE model_id = ?", [id]);
        res.json({ message: "Model deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};