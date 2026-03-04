import { pool } from "../config/db.js";

// CREATE - Add new community charger
export const createCharger = async (req, res) => {
  try {
    const {
      place_name,
      description,
      latitude,
      longitude,
      connector_type,
      image_url
    } = req.body;

    const submitted_by = req.user.id; // from auth middleware

    await pool.query(
      `INSERT INTO community_chargers 
      (submitted_by, place_name, description, latitude, longitude, connector_type, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [submitted_by, place_name, description, latitude, longitude, connector_type, image_url]
    );

    res.status(201).json({ message: "Community charger added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// READ - Get all chargers
export const getAllChargers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cc.*, u.name AS submitted_by_name
      FROM community_chargers cc
      JOIN users u ON cc.submitted_by = u.id
      ORDER BY cc.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// READ - Get single charger by ID
export const getChargerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT cc.*, u.name AS submitted_by_name
       FROM community_chargers cc
       JOIN users u ON cc.submitted_by = u.id
       WHERE cc.id = ?`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Charger not found" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE - Update charger (only owner or admin should be allowed - check in middleware)
export const updateCharger = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      place_name,
      description,
      latitude,
      longitude,
      connector_type,
      image_url
    } = req.body;

    const [result] = await pool.query(
      `UPDATE community_chargers 
       SET place_name=?, description=?, latitude=?, longitude=?, 
           connector_type=?, image_url=? 
       WHERE id=?`,
      [
        place_name,
        description,
        latitude,
        longitude,
        connector_type,
        image_url,
        id
      ]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Charger not found" });

    res.json({ message: "Charger updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE - Delete charger
export const deleteCharger = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM community_chargers WHERE id=?",
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Charger not found" });

    res.json({ message: "Charger deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// VERIFY - Admin verifies charger
export const verifyCharger = async (req, res) => {
  try {
    const { id } = req.params;
    // need to check whether user is an admin

    const [result] = await pool.query(
      "UPDATE community_chargers SET is_verified = TRUE WHERE id=?",
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Charger not found" });

    res.json({ message: "Charger verified successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};