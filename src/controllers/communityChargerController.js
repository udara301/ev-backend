import { pool } from "../config/db.js";

// CREATE - Add new community charger with connectors
export const createCharger = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      place_name,
      description,
      latitude,
      longitude,
      charger_network,
      image_url,
      connectors // array of { connector_type, charger_capacity }
    } = req.body;

    const submitted_by = req.user.id;

    await connection.beginTransaction();

    const [chargerResult] = await connection.query(
      `INSERT INTO community_chargers 
      (submitted_by, place_name, description, latitude, longitude, charger_network, image_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [submitted_by, place_name, description, latitude, longitude, charger_network, image_url]
    );

    const chargerId = chargerResult.insertId;

    if (connectors && connectors.length > 0) {
      const values = connectors.map(c => [chargerId, c.connector_type, c.charger_capacity]);
      await connection.query(
        `INSERT INTO community_charger_connectors (charger_id, connector_type, charger_capacity) VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    res.status(201).json({ message: "Community charger added successfully", id: chargerId });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

// READ - Get all chargers with connectors
export const getAllChargers = async (req, res) => {
  try {
    const [chargers] = await pool.query(`
      SELECT cc.*, u.name AS submitted_by_name
      FROM community_chargers cc
      JOIN users u ON cc.submitted_by = u.id
      ORDER BY cc.created_at DESC
    `);

    if (chargers.length === 0) return res.json([]);

    const chargerIds = chargers.map(c => c.id);
    const [connectors] = await pool.query(
      `SELECT * FROM community_charger_connectors WHERE charger_id IN (?)`,
      [chargerIds]
    );

    const result = chargers.map(charger => ({
      ...charger,
      connectors: connectors.filter(c => c.charger_id === charger.id)
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// READ - Get single charger by ID with connectors
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

    const [connectors] = await pool.query(
      `SELECT * FROM community_charger_connectors WHERE charger_id = ?`,
      [id]
    );

    res.json({ ...rows[0], connectors });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE - Update charger with connectors
export const updateCharger = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const {
      place_name,
      description,
      latitude,
      longitude,
      charger_network,
      image_url,
      connectors // array of { connector_type, charger_capacity }
    } = req.body;

    await connection.beginTransaction();

    const [result] = await connection.query(
      `UPDATE community_chargers 
       SET place_name=?, description=?, latitude=?, longitude=?, 
           charger_network=?, image_url=? 
       WHERE id=?`,
      [place_name, description, latitude, longitude, charger_network, image_url, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Charger not found" });
    }

    // Replace connectors: delete old, insert new
    await connection.query(
      `DELETE FROM community_charger_connectors WHERE charger_id = ?`,
      [id]
    );

    if (connectors && connectors.length > 0) {
      const values = connectors.map(c => [id, c.connector_type, c.charger_capacity]);
      await connection.query(
        `INSERT INTO community_charger_connectors (charger_id, connector_type, charger_capacity) VALUES ?`,
        [values]
      );
    }

    await connection.commit();
    res.json({ message: "Charger updated successfully" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
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