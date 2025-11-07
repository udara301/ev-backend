// users table will be used for both agents and customers
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

// Create a new agent (Company Admin only)
export const createAgent = async (req, res) => {
  let connection;
  try {
    if (req.user.role !== "COMPANY_ADMIN")
      return res.status(403).json({ message: "Forbidden" });

    const {
      name,
      email,
      password,
      contact_person,
      phone_number,
      street_address,
      city,
      status,
    } = req.body;

    // Get a connection from the pool
    connection = await pool.getConnection();

    // Start transaction
    await connection.beginTransaction();

    // 1️⃣ Check if user email already exists
    const [exists] = await connection.query("SELECT id FROM users WHERE email = ?", [email]);
    if (exists.length > 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: "Email already exists" });
    }

    // 2️⃣ Hash the password
    const hash = await bcrypt.hash(password, 10);

    // 3️⃣ Insert into users table
    const [userResult] = await connection.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'AGENT_ADMIN')",
      [name, email, hash]
    );

    const userId = userResult.insertId;

    // 4️⃣ Insert into agents table
    await connection.query(
      `INSERT INTO agents (user_id, contact_person, phone_number, street_address, city, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, contact_person, phone_number, street_address, city, status || "ACTIVE"]
    );

    // 5️⃣ Commit transaction
    await connection.commit();

    res.json({ message: "Agent created successfully", userId });
  } catch (err) {
    console.error("❌ Error creating agent:", err);

    if (connection) await connection.rollback();

    res.status(500).json({ message: "Server error" });
  } finally {
    if (connection) connection.release();
  }
};


// List all agents (Company Admin only)
export const getAgents = async (req, res) => {
  try {
    if (req.user.role !== "COMPANY_ADMIN")
      return res.status(403).json({ message: "Forbidden" });

    const [agents] = await pool.query(`
      SELECT u.id, u.name, u.email, a.contact_person, a.phone_number, a.street_address, a.city, a.status, u.created_at
      FROM users u
      JOIN agents a ON u.id = a.user_id
      WHERE u.role = 'AGENT_ADMIN'
      ORDER BY u.created_at DESC
    `);


    res.json(agents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Ge t single agent details (Company Admin only)
export const getAgentById = async (req, res) => {
  try {
    if (req.user.role !== "COMPANY_ADMIN")
      return res.status(403).json({ message: "Forbidden" });

    const { agentId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        u.id AS user_id,
        u.name,
        u.email,
        u.created_at,
        a.id AS agent_id,
        a.contact_person,
        a.phone_number,
        a.street_address,
        a.city,
        a.status
      FROM users u
      LEFT JOIN agents a ON u.id = a.user_id
      WHERE u.id = ? AND u.role = 'AGENT_ADMIN'
      `,
      [agentId]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Agent not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching agent:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update agent (Company Admin only)
export const updateAgent = async (req, res) => {
  let connection;
  try {
    if (req.user.role !== "COMPANY_ADMIN")
      return res.status(403).json({ message: "Forbidden" });

    const { agentId } = req.params;
    const {
      name,
      email,
      password,
      contact_person,
      phone_number,
      street_address,
      city,
      status,
    } = req.body;

    // Get DB connection
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ==============================
    // 1️⃣ Update users table
    // ==============================
    const userUpdates = [];
    const userParams = [];

    if (name) {
      userUpdates.push("name = ?");
      userParams.push(name);
    }
    if (email) {
      userUpdates.push("email = ?");
      userParams.push(email);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      userUpdates.push("password_hash = ?");
      userParams.push(hash);
    }

    if (userUpdates.length > 0) {
      userParams.push(agentId);
      const [userResult] = await connection.query(
        `UPDATE users SET ${userUpdates.join(", ")} WHERE id = ? AND role = 'AGENT_ADMIN'`,
        userParams
      );

      if (userResult.affectedRows === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: "Agent not found" });
      }
    }

    // ==============================
    // 2️⃣ Update agents table
    // ==============================
    const agentUpdates = [];
    const agentParams = [];

    if (contact_person) {
      agentUpdates.push("contact_person = ?");
      agentParams.push(contact_person);
    }
    if (phone_number) {
      agentUpdates.push("phone_number = ?");
      agentParams.push(phone_number);
    }
    if (street_address) {
      agentUpdates.push("street_address = ?");
      agentParams.push(street_address);
    }
    if (city) {
      agentUpdates.push("city = ?");
      agentParams.push(city);
    }
    if (status) {
      agentUpdates.push("status = ?");
      agentParams.push(status);
    }

    if (agentUpdates.length > 0) {
      agentParams.push(agentId);
      await connection.query(
        `UPDATE agents SET ${agentUpdates.join(", ")} WHERE user_id = ?`,
        agentParams
      );
    }

     // ==============================
    // 3️⃣ Fetch the updated agent
    // ==============================
    const [updatedAgentRows] = await connection.query(
      `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        a.contact_person, 
        a.phone_number, 
        a.street_address, 
        a.city, 
        a.status, 
        u.created_at
      FROM users u
      JOIN agents a ON u.id = a.user_id
      WHERE u.id = ? AND u.role = 'AGENT_ADMIN'
      `,
      [agentId]
    );

    // ==============================
    // 4 Commit and respond
    // ==============================
    await connection.commit();
   
    if (updatedAgentRows.length === 0) {
      return res.status(404).json({ message: "Agent not found after update" });
    }

    res.json(updatedAgentRows[0]);
  } catch (err) {
    console.error("❌ Error updating agent:", err);
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    if (connection) connection.release();
  }
};

// Delete agent (Company Admin only)
export const deleteAgent = async (req, res) => {
  let connection;
  try {
    if (req.user.role !== "COMPANY_ADMIN")
      return res.status(403).json({ message: "Forbidden" });

    const { agentId } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1️⃣ Verify agent exists
    const [agent] = await connection.query(
      "SELECT id FROM users WHERE id = ? AND role = 'AGENT_ADMIN'",
      [agentId]
    );

    if (agent.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Agent not found" });
    }

    // 2️⃣ Delete user (this cascades to agents table if FK is set)
    const [result] = await connection.query(
      "DELETE FROM users WHERE id = ? AND role = 'AGENT_ADMIN'",
      [agentId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Agent not found" });
    }

    // 3️⃣ Commit transaction
    await connection.commit();

    res.json({ message: "Agent deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting agent:", err);
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    if (connection) connection.release();
  }
};
