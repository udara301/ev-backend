import { pool } from "../config/db.js";

// 1. Create location
export const addLocation = async (req, res) => {
	try {
		const { location_name, price } = req.body;

		if (!location_name) {
			return res.status(400).json({ message: "Location name is required" });
		}

		const [result] = await pool.query(
			"INSERT INTO pickup_locations (location_name, price) VALUES (?, ?)",
			[location_name, price ?? null]
		);

		res.status(201).json({
			message: "Location created successfully",
			id: result.insertId,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server error" });
	}
};

// 2. Get all locations
export const getAllLocations = async (req, res) => {
	try {
		const [rows] = await pool.query(
			"SELECT * FROM pickup_locations ORDER BY location_name ASC"
		);

		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server error" });
	}
};

// 3. Get location by ID
export const getLocationById = async (req, res) => {
	try {
		const { id } = req.params;
		const [rows] = await pool.query(
			"SELECT * FROM pickup_locations WHERE location_id = ?",
			[id]
		);

		if (!rows.length) {
			return res.status(404).json({ message: "Location not found" });
		}

		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server error" });
	}
};

// 4. Update location
export const updateLocation = async (req, res) => {
	try {
		const { id } = req.params;
		const { location_name, price } = req.body;

		if (!location_name) {
			return res.status(400).json({ message: "Location name is required" });
		}

		const [result] = await pool.query(
			"UPDATE pickup_locations SET location_name = ?, price = ? WHERE location_id = ?",
			[location_name, price ?? null, id]
		);

		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Location not found" });
		}

		res.json({ message: "Location updated successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server error" });
	}
};

// 5. Delete location
export const deleteLocation = async (req, res) => {
	try {
		const { id } = req.params;
		const [result] = await pool.query(
			"DELETE FROM pickup_locations WHERE location_id = ?",
			[id]
		);

		if (result.affectedRows === 0) {
			return res.status(404).json({ message: "Location not found" });
		}

		res.json({ message: "Location deleted successfully" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Server error" });
	}
};
