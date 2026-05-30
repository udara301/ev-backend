import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Create affiliate profile
export const createAffiliateProfile = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { name, email, phone, password } = req.body;
    await connection.beginTransaction();

    if (!name || !email || !phone || !password) {
      await connection.rollback();
      return res.status(400).json({
        message: "name, email, phone and password are required",
      });
    }

    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'AFFILIATE')`,
      [name, email, passwordHash]
    );

    const [profileResult] = await connection.query(
      `INSERT INTO affiliate_profiles (user_id, phone_number)
       VALUES (?, ?)`,
      [userResult.insertId, phone]
    );

    const [profileRows] = await connection.query(
      `SELECT id, user_id, phone_number
       FROM affiliate_profiles
       WHERE id = ?`,
      [profileResult.insertId]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Affiliate profile created successfully",
      profile: profileRows[0],
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error creating affiliate profile:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

// Login specifically for affiliates
export const loginAffiliate = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = rows[0];
    if (user.role !== "AFFILIATE") {
      return res.status(403).json({ message: "invalid login" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const [profiles] = await pool.query(
      "SELECT id, status FROM affiliate_profiles WHERE user_id = ?",
      [user.id]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ message: "Affiliate profile not found" });
    }

    if (profiles[0].status === "SUSPENDED") {
      return res.status(403).json({ message: "Affiliate account is suspended" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      message: "Affiliate login successful",
      token,
      role: user.role,
      profile_id: profiles[0].id,
    });
  } catch (err) {
    console.error("Error logging in affiliate:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
