import { pool } from "../config/db.js";

//====================================================
// 1️⃣ Create Charger (Company Admin Only)
// =====================================================
export const createCharger = async (req, res) => {
  try {
    if (req.user.role !== "COMPANY_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { name, serial_number, charger_type_id, checksum } = req.body;

    if (!serial_number || !charger_type_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if serial already exists
    const [exists] = await pool.query(
      "SELECT id FROM chargers WHERE serial_number = ?",
      [serial_number]
    );
    if (exists.length > 0) {
      return res.status(400).json({ message: "Serial number already exists" });
    }

    const [result] = await pool.query(
      `INSERT INTO chargers (name, serial_number, checksum, charger_type_id)
       VALUES (?, ?, ?, ?)`,
      [name || null, serial_number, checksum, charger_type_id]
    );

    res.json({
      message: "Charger added to system successfully",
      chargerId: result.insertId,
    });
  } catch (err) {
    console.error("❌ Error creating charger:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//====================================================
// 2. Get Charger Types with all details (Company Admin Only)
// =====================================================
export const getChargersAdmin = async (req, res) => {
  try {
    if (req.user.role !== "COMPANY_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [rows] = await pool.query(`
      SELECT 
        c.id AS charger_id,
        c.serial_number,
        c.checksum,
        c.name,
        c.location,
        c.status,
        c.last_charge_start,
        c.last_charge_end,
        c.last_charge_amount,
        c.created_at AS charger_created_at,

        -- Charger Type Details
        ct.id AS type_id,
        ct.model AS type_model,
        ct.input_voltage,
        ct.output_voltage,
        ct.connector_type,
        ct.max_power_kw,
        ct.amperage,
        ct.current_type,
        ct.description,
        ct.created_at AS type_created_at,

        -- Agent Details (Optional)
        a.id AS agent_id,
        a.contact_person AS agent_contact_person,
        a.phone_number AS agent_phone,
        a.city AS agent_city,
        a.status AS agent_status

      FROM chargers c
      JOIN charger_types ct ON c.charger_type_id = ct.id
      LEFT JOIN agents a ON c.agent_id = a.id
      ORDER BY c.id DESC
    `);

    // Transform flat SQL result into nested JSON
    const chargers = rows.map(row => ({
      id: row.charger_id,
      serial_number: row.serial_number,
      checksum: row.checksum,
      name: row.name,
      location: row.location,
      status: row.status,
      last_charge_start: row.last_charge_start,
      last_charge_end: row.last_charge_end,
      last_charge_amount: row.last_charge_amount,
      created_at: row.charger_created_at,

      charger_type: {
        id: row.type_id,
        model: row.type_model,
        input_voltage: row.input_voltage,
        output_voltage: row.output_voltage,
        connector_type: row.connector_type,
        max_power_kw: row.max_power_kw,
        amperage: row.amperage,
        current_type: row.current_type,
        description: row.description,
        created_at: row.type_created_at
      },

      agent: row.agent_id
        ? {
          id: row.agent_id,
          contact_person: row.agent_contact_person,
          phone_number: row.agent_phone,
          city: row.agent_city,
          status: row.agent_status
        }
        : null
    }));

    res.json(chargers);
  } catch (err) {
    console.error("Error fetching chargers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//====================================================
// 3️⃣ Edit Charger (Company Admin Only)
//====================================================

export const updateCharger = async (req, res) => {
  try {
    if (req.user.role !== "COMPANY_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { chargerId } = req.params;
    const { name, serial_number, charger_type_id } = req.body;

    // Validate required fields
    if (!serial_number || !charger_type_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if charger exists
    const [charger] = await pool.query("SELECT * FROM chargers WHERE id = ?", [chargerId]);
    if (charger.length === 0) {
      return res.status(404).json({ message: "Charger not found" });
    }

    // Check if serial number is used by another charger
    const [duplicate] = await pool.query(
      "SELECT id FROM chargers WHERE serial_number = ? AND id != ?",
      [serial_number, chargerId]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({ message: "Serial number already exists" });
    }

    // Update charger (checksum is not updated)
    await pool.query(
      `UPDATE chargers
       SET name = ?, serial_number = ?, charger_type_id = ?
       WHERE id = ?`,
      [name || null, serial_number, charger_type_id, chargerId]
    );

    res.json({ message: "Charger updated successfully" });
  } catch (err) {
    console.error("❌ Error updating charger:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// =====================================================
// Delete a charger By Admin  (Admin only)
// =====================================================

export const deleteCharger = async (req, res) => {
  try {
    const { chargerId } = req.params;

    const [result] = await pool.query(
      "DELETE FROM chargers WHERE id=?",
      [chargerId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Charger not found" });
    res.json({ message: "Charger deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =====================================================
// Assign Charger to Agent  (Agent Endpoint)
// =====================================================

export const assignChargerToAgent = async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role !== "AGENT_ADMIN")
      return res.status(403).json({ message: "Forbidden" });

    // Step 1: Find agent ID linked to this user
    const [agentRows] = await pool.query(
      "SELECT id FROM agents WHERE user_id = ?",
      [userId]
    );

    if (agentRows.length === 0) {
      return res.status(403).json({ message: "Agent profile not found" });
    }

    const agentId = agentRows[0].id;

    // Step 2: Extract data from request
    const {
      id,              // Charger ID
      name,            // To verify
      checksum,        // To verify
      location,
      street_name,
      city,
      price_per_kwh,
      is_24hours_open,
      opening_time,
      closing_time,
      notes
    } = req.body;

    // Step 3: Verify charger details
    const [chargerRows] = await pool.query(
      "SELECT id, agent_id FROM chargers WHERE id = ? AND name = ? AND checksum = ?",
      [id, name, checksum]
    );


    if (chargerRows.length === 0) {
      return res.status(404).json({ message: "Charger not found or verification failed" });
    }

    const charger = chargerRows[0];

    // safeguard: prevent reassigning if already has agent
    if (charger.agent_id && charger.agent_id !== agentId) {
      return res.status(409).json({ message: "This charger is already assigned to another agent" });
    }

    // Step 4: Update charger with agent and new data
    const [result] = await pool.query(
      `
      UPDATE chargers
      SET
        agent_id = ?,
        location = ?,
        street_name = ?,
        city = ?,
        price_per_kwh = ?,
        is_24hours_open = ?,
        opening_time = ?,
        closing_time = ?,
        notes = ?
      WHERE id = ?
      `,
      [
        agentId,
        location,
        street_name,
        city,
        price_per_kwh,
        is_24hours_open,
        opening_time || null,
        closing_time || null,
        notes,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: "No updates were made" });
    }

    res.json({ message: "Charger successfully assigned to agent" });
  } catch (err) {
    console.error("Error assigning charger:", err);
    res.status(500).json({ message: "Server error" });
  }
  
};



// Get all chargers for logged-in agent
export const getChargersForAgent = async (req, res) => {
  try {
    const agentId = req.user.id;
    const [rows] = await pool.query("SELECT * FROM chargers WHERE agent_id=?", [agentId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};




// =====================================================
// Unassign Charger to Agent  (Agent Endpoint)
// =====================================================

export const unassignCharger = async (req, res) => {
  try {
    if (req.user.role !== "AGENT_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { charger_id } = req.params;
    console.log(charger_id)
    // Step 1️ - Check if charger exists
    const [charger] = await pool.query("SELECT * FROM chargers WHERE id = ?", [charger_id]);
    if (!charger || charger.length === 0) {
      return res.status(404).json({ message: "Charger not found" });
    }

    // Step 2️ - Reset all agent and location-related data
    await pool.query(
      `
      UPDATE chargers
      SET
        agent_id = NULL,
        location = NULL,
        street_name = NULL,
        city = NULL,
        price_per_kwh = NULL,
        is_24hours_open = NULL,
        opening_time = NULL,
        closing_time = NULL,
        notes = NULL
      WHERE id = ?
      `,
      [charger_id]
    );

    // Step 3 - Return response
    res.status(200).json({
      message: "Charger successfully unassigned and reset",
      charger: {
        id: charger_id,
        agent_id: null,
        location: null,
        street_name: null,
        city: null,
        price_per_kwh: null,
        is_24hours_open: null,
        opening_time: null,
        closing_time: null,
        notes: null
      }
    });
  } catch (error) {
    console.error("Error unassigning charger:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// // Update charger status
// export const updateChargerStatus = async (req, res) => {
//   try {
//     const agentId = req.user.id;
//     const { chargerId } = req.params;
//     const { status } = req.body;

//     const [result] = await pool.query(
//       "UPDATE chargers SET status=? WHERE id=? AND agent_id=?",
//       [status, chargerId, agentId]
//     );

//     if (result.affectedRows === 0)
//       return res.status(404).json({ message: "Charger not found" });

//     res.json({ message: "Charger status updated successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };




// Get charger report
export const getChargerReport = async (req, res) => {
  try {
    const agentId = req.user.id;
    const { chargerId } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM chargers WHERE id=? AND agent_id=?",
      [chargerId, agentId]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Charger not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};