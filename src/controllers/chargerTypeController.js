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
            rated_power,
            datasheet,
            brand,
            number_of_ports,
            current_type,
            description,
            connector_data,
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
      (model, rated_power, number_of_ports, current_type, description, datasheet, brand, connector_data) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                model,
                rated_power,
                number_of_ports,
                current_type,
                description,
                datasheet,
                brand,
                JSON.stringify(connector_data),
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
            rated_power,
            datasheet,
            brand,
            current_type,

            description
        } = req.body;

        const [result] = await pool.query(
            `UPDATE charger_types 
       SET model=?, rated_power=?, datasheet=?, brand=?, current_type=?, description=?
       WHERE id=?`,
            [
                model,
                rated_power,
                datasheet,
                brand,
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
        if (err.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({ message: "Cannot delete charger type. It is currently assigned to one or more chargers." });
        }
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
