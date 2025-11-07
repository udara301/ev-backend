import { pool } from "../config/db.js";


// ==========================
// Add a new charger type
// ==========================
export const addChargerType = async (req, res) => {
    try {
        if (req.user.role !== "COMPANY_ADMIN")
            return res.status(403).json({ message: "Forbidden" });

        const {
            model,
            input_voltage,
            output_voltage,
            connector_type,
            max_power_kw,
            amperage,
            current_type,
            description,
        } = req.body;

        // Check if model already exists
        const [exists] = await pool.query(
            "SELECT * FROM charger_types WHERE model=?",
            [model]
        );
        if (exists.length > 0)
            return res.status(400).json({ message: "Charger type already exists" });

        await pool.query(
            `INSERT INTO charger_types 
      (model, input_voltage, output_voltage, connector_type, max_power_kw, amperage, current_type, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                model,
                input_voltage,
                output_voltage,
                connector_type,
                max_power_kw,
                amperage,
                current_type,
                description,
            ]
        );

        res.json({ message: "Charger type added successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// Get all charger types
// ==========================
export const getChargerTypes = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM charger_types ORDER BY model ASC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// Get all charger types names only
// ==========================
export const getChargerTypesNames = async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, model FROM charger_types ORDER BY model ASC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};



// ==========================
// Get a single charger type by ID
// ==========================
export const getChargerTypeById = async (req, res) => {
    try {
        const { chargerTypeId } = req.params;       
        
        const [rows] = await pool.query("SELECT * FROM charger_types WHERE id=?", [
            chargerTypeId,
        ]);

        if (rows.length === 0)
            return res.status(404).json({ message: "Charger type not found" });

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// Update charger type
// ==========================
export const updateChargerType = async (req, res) => {
    try {
        if (req.user.role !== "COMPANY_ADMIN")
            return res.status(403).json({ message: "Forbidden" });

        const { chargerTypeId } = req.params;
        const {
            model,
            input_voltage,
            output_voltage,
            connector_type,
            max_power_kw,
            amperage,
            current_type,
            description,
        } = req.body;

        const [result] = await pool.query(
            `UPDATE charger_types 
       SET model=?, input_voltage=?, output_voltage=?, connector_type=?, 
           max_power_kw=?, amperage=?, current_type=?, description=? 
       WHERE id=?`,
            [
                model,
                input_voltage,
                output_voltage,
                connector_type,
                max_power_kw,
                amperage,
                current_type,
                description,
                chargerTypeId,
            ]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ message: "Charger type not found" });

        res.json({ message: "Charger type updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};


// ==========================
// Delete charger type
// ==========================
export const deleteChargerType = async (req, res) => {
    try {
        if (req.user.role !== "COMPANY_ADMIN")
            return res.status(403).json({ message: "Forbidden" });

        const { chargerTypeId } = req.params;

        const [result] = await pool.query("DELETE FROM charger_types WHERE id=?", [
            chargerTypeId,
        ]);

        if (result.affectedRows === 0)
            return res.status(404).json({ message: "Charger type not found" });

        res.json({ message: "Charger type deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
