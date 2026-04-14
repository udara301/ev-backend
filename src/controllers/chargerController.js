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

    // Check if ocpp_id (name) already exists
    if (name) {
      const [ocppExists] = await pool.query(
        "SELECT id FROM chargers WHERE ocpp_id = ?",
        [name]
      );
      if (ocppExists.length > 0) {
        return res.status(400).json({ message: "OCPP ID already exists" });
      }
    }

    const [typeRows] = await pool.query(
      "SELECT number_of_ports, connector_data FROM charger_types WHERE id = ?",
      [charger_type_id]
    );
    const chargerType = typeRows[0];
    const portCount = chargerType?.number_of_ports || 1;

    const [result] = await pool.query(
      `INSERT INTO chargers (ocpp_id, serial_number, checksum, charger_type_id)
       VALUES (?, ?, ?, ?)`,
      [name || null, serial_number, checksum, charger_type_id]
    );

    // Parse connector_data from charger type if available
    let connectorData = [];
    if (chargerType?.connector_data) {
      try {
        connectorData = typeof chargerType.connector_data === "string"
          ? JSON.parse(chargerType.connector_data)
          : chargerType.connector_data;
      } catch (e) {
        connectorData = [];
      }
    }

    for (let i = 1; i <= portCount; i++) {
      const cd = connectorData[i - 1];
      if (cd) {
        await pool.query(
          `INSERT INTO connectors (charger_id, connector_id, status, connector_type, max_power_kw, output_voltage, amperage)
           VALUES (?, ?, 'UNAVAILABLE', ?, ?, ?, ?)`,
          [result.insertId, i, cd.connector_type || null, cd.power_kw || null, cd.output_voltage || null, cd.amperage || null]
        );
      } else {
        await pool.query(
          "INSERT INTO connectors (charger_id, connector_id, status) VALUES (?, ?, 'UNAVAILABLE')",
          [result.insertId, i]
        );
      }
    }
    
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
        c.ocpp_id,
        c.location,
        c.status,
        c.created_at AS charger_created_at,
        -- Charger Type Details
        ct.id AS type_id,
        ct.model AS type_model,
        ct.input_voltage,
        ct.current_type,
        ct.description,
        ct.connector_data,
        ct.created_at AS type_created_at,

        -- Agent Details (Optional)
        a.id AS agent_id,
        a.contact_person AS agent_contact_person,
        a.phone_number AS agent_phone,
        a.city AS agent_city,
        a.status AS agent_status,

        -- User Details (Optional)
        u.id AS user_id,
        u.name AS agent_name,
        u.email AS agent_email

      FROM chargers c
      JOIN charger_types ct ON c.charger_type_id = ct.id
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.id DESC
    `);

    // Transform flat SQL result into nested JSON
    const chargers = rows.map(row => ({
      id: row.charger_id,
      serial_number: row.serial_number,
      checksum: row.checksum,
      name: row.ocpp_id,
      location: row.location,
      created_at: row.charger_created_at,
      status: row.status,

      charger_type: {
        id: row.type_id,
        model: row.type_model,
        input_voltage: row.input_voltage,
        current_type: row.current_type,
        description: row.description,
        connector_data: row.connector_data ? JSON.parse(row.connector_data) : [],
        created_at: row.type_created_at
      },

      agent: row.agent_id
        ? {
          id: row.agent_id,
          name: row.agent_name,
          email: row.agent_email,
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

    // Check if ocpp_id (name) is used by another charger
    if (name) {
      const [ocppDuplicate] = await pool.query(
        "SELECT id FROM chargers WHERE ocpp_id = ? AND id != ?",
        [name, chargerId]
      );
      if (ocppDuplicate.length > 0) {
        return res.status(400).json({ message: "OCPP ID already exists" });
      }
    }

    // Update charger (checksum is not updated)
    await pool.query(
      `UPDATE chargers
       SET ocpp_id = ?, serial_number = ?, charger_type_id = ?
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
      "SELECT id, agent_id FROM chargers WHERE id = ? AND ocpp_id = ? AND checksum = ?",
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
        user_id = ?,
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
        userId,
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
    const userId = req.user.id;

    const [agentRows] = await pool.query(
      "SELECT id FROM agents WHERE user_id = ?",
      [userId]
    );

    if (agentRows.length === 0) {
      return res.status(403).json({ message: "Agent profile not found" });
    }

    const agentId = agentRows[0].id;

    const [rows] = await pool.query(`
      SELECT 
        c.*,
        ct.model as charger_type_model,
        ct.current_type,
        con.id as connector_db_id,
        con.connector_id,
        con.status as connector_status,
        con.connector_type,
        con.max_power_kw,
        con.output_voltage,
        con.amperage,
        con.active_charge_id,
        ch.id as charge_id,
        ch.start_time as charge_start_time,
        ch.end_time as charge_end_time,
        ch.meter_start,
        ch.meter_stop,
        ch.amount as charge_amount,
        ch.status as charge_status,
        ch.vehicle_number,
        ch.ocpp_transaction_id,
        ch.note as charge_note,
        TIMESTAMPDIFF(SECOND, ch.start_time, NOW()) / 3600 as charge_duration_hours,
        (ch.meter_stop - ch.meter_start) as energy_used_kwh,
        u.name as customer_name,
        u.email as customer_email
      FROM chargers c
      LEFT JOIN charger_types ct ON c.charger_type_id = ct.id
      LEFT JOIN connectors con ON con.charger_id = c.id
      LEFT JOIN charges ch ON con.active_charge_id = ch.id
      LEFT JOIN users u ON ch.customer_id = u.id
      WHERE c.agent_id = ?
      ORDER BY c.created_at DESC, con.connector_id ASC
    `, [agentId]);

    // Group rows by charger, nesting connectors as an array
    const chargerMap = new Map();
    for (const row of rows) {
      if (!chargerMap.has(row.id)) {
        chargerMap.set(row.id, {
          id: row.id,
          ocpp_id: row.ocpp_id,
          serial_number: row.serial_number,
          checksum: row.checksum,
          charger_type_id: row.charger_type_id,
          agent_id: row.agent_id,
          user_id: row.user_id,
          location: row.location,
          street_name: row.street_name,
          city: row.city,
          price_per_kwh: row.price_per_kwh,
          is_24hours_open: row.is_24hours_open,
          opening_time: row.opening_time,
          closing_time: row.closing_time,
          notes: row.notes,
          created_at: row.created_at,
          charger_type_model: row.charger_type_model,
          current_type: row.current_type,
          connectors: [],
          status: row.status,
        });
      }

      if (row.connector_db_id) {
        chargerMap.get(row.id).connectors.push({
          id: row.connector_db_id,
          connector_id: row.connector_id,
          status: row.connector_status,
          connector_type: row.connector_type,
          max_power_kw: row.max_power_kw,
          output_voltage: row.output_voltage,
          amperage: row.amperage,
          active_charge: row.charge_id ? {
            id: row.charge_id,
            start_time: row.charge_start_time,
            end_time: row.charge_end_time,
            meter_start: row.meter_start,
            meter_stop: row.meter_stop,
            amount: row.charge_amount,
            status: row.charge_status,
            vehicle_number: row.vehicle_number,
            ocpp_transaction_id: row.ocpp_transaction_id,
            note: row.charge_note,
            duration_hours: row.charge_duration_hours,
            energy_used_kwh: row.energy_used_kwh,
            customer_name: row.customer_name,
            customer_email: row.customer_email,
          } : null,
        });
      }
    }

    res.json(Array.from(chargerMap.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =====================================================
// Edit Charger Details (Agent Endpoint)
// =====================================================
export const editChargerAgent = async (req, res) => {
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
      id,                // Charger ID
      ocpp_id,
      location,
      street_name,
      city,
      price_per_kwh,
      is_24hours_open,
      opening_time,
      closing_time,
      notes
    } = req.body;

    // Step 3: Verify that charger belongs to this agent
    const [chargerRows] = await pool.query(
      "SELECT id, agent_id FROM chargers WHERE id = ?",
      [id]
    );

    if (chargerRows.length === 0) {
      return res.status(404).json({ message: "Charger not found" });
    }

    const charger = chargerRows[0];

    if (charger.agent_id !== agentId) {
      return res.status(403).json({ message: "You are not authorized to edit this charger" });
    }

    // Step 4: Update charger details
    const [result] = await pool.query(
      `
      UPDATE chargers
      SET
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

    res.json({ message: "Charger details updated successfully" });
  } catch (err) {
    console.error("Error editing charger:", err);
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



// get charger public endpoint
export const getChargersPublic = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id AS charger_id,
        c.serial_number,
        c.name,
        c.location,
        c.status,
       
        -- Charger Type Details
        ct.id AS type_id,
        ct.model AS type_model,
        ct.input_voltage,
        ct.output_voltage,
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
    // Transform flat SQL result into required JSON
    const chargers = rows.map(row => ({
      name: row.name,
      description: "24/7 EV charging hub near Colombo Fort.", // hardcoded
      visibility: "public", // hardcoded

      charger_id: `chg_${row.charger_id}`,
      serial_number: row.serial_number,
      status: row.status,

      power_type: row.current_type || "DC",

      connectors: [
        {
          connector_id: `con_${row.charger_id}`, // hardcoded pattern
          type: row.connector_type,
          max_power_kw: row.max_power_kw,
          current_power_kw: 120, // hardcoded
          price_per_kwh: 95.00, // hardcoded
          status: "available" // hardcoded
        }
      ],

      operating_hours: {
        is_24_hours: true
      },

      amenities: [
        "Restroom",
        "WiFi",
        "Cafe",
        "Parking"
      ],

      created_at: "2026-02-25T09:30:00Z",
      updated_at: "2026-03-02T14:45:00Z"
    }));

    res.json(chargers);
  } catch (err) {
    console.error("Error fetching chargers:", err);
    res.status(500).json({ message: "Server error" });
  }
};





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