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
    const settings = await connection.query(
      `SELECT setting_key, setting_value
       FROM system_settings
       WHERE setting_category = 'AFFILIATE'`
    );

    const pointsPctChargingSetting = settings[0].find(
      (s) => s.setting_key === "points_pct_charging"
    );
    const pointsPctRentingSetting = settings[0].find(
      (s) => s.setting_key === "points_pct_renting"
    );

    const [profileResult] = await connection.query(
      `INSERT INTO affiliate_profiles (user_id, phone_number, points_pct_charging, points_pct_renting)
       VALUES (?, ?, ?, ?)`,
      [userResult.insertId, phone, pointsPctChargingSetting.setting_value, pointsPctRentingSetting.setting_value]
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
      return res.status(403).json({ message: "Affiliate account is suspended. Please contact travelwithev support." });
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
      status: profiles[0].status
    });
  } catch (err) {
    console.error("Error logging in affiliate:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all affiliate profiles (COMPANY_ADMIN only)
export const getAllAffiliateProfiles = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "COMPANY_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [affiliateProfiles] = await pool.query(
      `SELECT
        ap.id,
        ap.user_id,
        u.name,
        u.email,
        ap.phone_number,
        ap.points_pct_charging,
        ap.points_pct_renting,
        ap.current_points,
        ap.total_points_earned,
        ap.status,
        ap.created_at
      FROM affiliate_profiles ap
      JOIN users u ON u.id = ap.user_id
      WHERE u.role = 'AFFILIATE'
      ORDER BY ap.created_at DESC`
    );

    return res.status(200).json(affiliateProfiles);
  } catch (err) {
    console.error("Error fetching affiliate profiles:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Suspend an affiliate account (COMPANY_ADMIN only)
export const suspendAffiliateAccount = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "COMPANY_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" });
    }

    const [users] = await pool.query(
      "SELECT id, role FROM users WHERE id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (users[0].role !== "AFFILIATE") {
      return res.status(400).json({ message: "Target user is not an affiliate" });
    }

    const [profiles] = await pool.query(
      "SELECT id, user_id, status FROM affiliate_profiles WHERE user_id = ?",
      [user_id]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ message: "Affiliate profile not found" });
    }

    if (profiles[0].status === "SUSPENDED") {
      return res.status(200).json({
        message: "Affiliate account is already suspended",
        profile: profiles[0],
      });
    }

    await pool.query(
      "UPDATE affiliate_profiles SET status = 'SUSPENDED' WHERE user_id = ?",
      [user_id]
    );

    const [updatedProfiles] = await pool.query(
      `SELECT id, user_id, phone_number, points_pct_charging, points_pct_renting,
              current_points, total_points_earned, status, created_at
       FROM affiliate_profiles
       WHERE user_id = ?`,
      [user_id]
    );

    return res.status(200).json(updatedProfiles[0]);
  } catch (err) {
    console.error("Error suspending affiliate account:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Activate a suspended affiliate account (COMPANY_ADMIN only)
export const activateAffiliateAccount = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "COMPANY_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" });
    }

    const [users] = await pool.query(
      "SELECT id, role FROM users WHERE id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (users[0].role !== "AFFILIATE") {
      return res.status(400).json({ message: "Target user is not an affiliate" });
    }

    const [profiles] = await pool.query(
      "SELECT id, user_id, status FROM affiliate_profiles WHERE user_id = ?",
      [user_id]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ message: "Affiliate profile not found" });
    }

    if (profiles[0].status === "ACTIVE") {
      return res.status(200).json({
        message: "Affiliate account is already active",
        profile: profiles[0],
      });
    }

    await pool.query(
      "UPDATE affiliate_profiles SET status = 'ACTIVE' WHERE user_id = ?",
      [user_id]
    );

    const [updatedProfiles] = await pool.query(
      `SELECT id, user_id, phone_number, points_pct_charging, points_pct_renting,
              current_points, total_points_earned, status, created_at
       FROM affiliate_profiles
       WHERE user_id = ?`,
      [user_id]
    );

    return res.status(200).json(updatedProfiles[0]);
  } catch (err) {
    console.error("Error activating affiliate account:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update affiliate points percentages (COMPANY_ADMIN only)
export const updateAffiliatePointsPercentages = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "COMPANY_ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { user_id, points_pct_charging, points_pct_renting } = req.body;

    if (
      user_id === undefined ||
      points_pct_charging === undefined ||
      points_pct_renting === undefined
    ) {
      return res.status(400).json({
        message:
          "user_id, points_pct_charging and points_pct_renting are required",
      });
    }

    if (
      !Number.isInteger(points_pct_charging) ||
      !Number.isInteger(points_pct_renting)
    ) {
      return res.status(400).json({
        message: "points_pct_charging and points_pct_renting must be integers",
      });
    }

    if (
      points_pct_charging < 0 ||
      points_pct_charging > 100 ||
      points_pct_renting < 0 ||
      points_pct_renting > 100
    ) {
      return res.status(400).json({
        message:
          "points_pct_charging and points_pct_renting must be between 0 and 100",
      });
    }

    const [users] = await pool.query(
      "SELECT id, role FROM users WHERE id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (users[0].role !== "AFFILIATE") {
      return res.status(400).json({ message: "Target user is not an affiliate" });
    }

    const [profiles] = await pool.query(
      "SELECT id FROM affiliate_profiles WHERE user_id = ?",
      [user_id]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ message: "Affiliate profile not found" });
    }

    await pool.query(
      `UPDATE affiliate_profiles
       SET points_pct_charging = ?, points_pct_renting = ?
       WHERE user_id = ?`,
      [points_pct_charging, points_pct_renting, user_id]
    );

    const [updatedProfiles] = await pool.query(
      `SELECT id, user_id, phone_number, points_pct_charging, points_pct_renting,
              current_points, total_points_earned, status, created_at
       FROM affiliate_profiles
       WHERE user_id = ?`,
      [user_id]
    );

    return res.status(200).json(updatedProfiles[0]);
  } catch (err) {
    console.error("Error updating affiliate points percentages:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
