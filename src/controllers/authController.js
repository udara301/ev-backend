import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import dotenv from "dotenv";
import { sendResetEmail } from "../utils/mailer.js";
import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Signup for agent and admin (company admin can create agents, but not customers)
export const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (role == "CUSTOMER") {
      return res.status(400).json({ message: "Invalid role" });
    }

    const [userExists] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (userExists.length > 0) return res.status(400).json({ message: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, hash, role]
    );

    res.json({ message: "Account created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// POST /api/auth/signup (Public)
export const signupCustomer = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { name, email, password, phone } = req.body;
    await connection.beginTransaction();

    const [userExists] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (userExists.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Email already exists" })
    };


    const hash = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'CUSTOMER')",
      [name, email, hash]
    );

    const userId = userResult.insertId;
    await connection.query("INSERT INTO customers (user_id, phone_number) VALUES (?, ?)", [userId, phone]);
    await connection.query("INSERT INTO wallets (customer_id, balance) VALUES (?, 0)", [userId]);

    await connection.commit();
    res.json({ message: "Customer registered successfully" });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

// Google OAuth login
export const googleLogin = async (req, res) => {
  const { idToken } = req.body; // Token sent from frontend after Google Sign-In

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // 1. Check if the user exists
    let [user] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

    if (user.length === 0) {
      // 2. If the user is new, register them as a CUSTOMER
      const [result] = await pool.query(
        "INSERT INTO users (name, email, google_id, role) VALUES (?, ?, ?, 'CUSTOMER')",
        [name, email, googleId]
      );

      // Add details to the Customer table (same logic as before)
      await pool.query("INSERT INTO customers (user_id) VALUES (?)", [result.insertId]);
      await pool.query("INSERT INTO wallets (customer_id, balance) VALUES (?, 0)", [result.insertId]);

      user = [{ id: result.insertId, email, role: 'CUSTOMER' }];
    }

    // 3. Generate and send JWT
    const token = jwt.sign(
      { id: user[0].id, email: user[0].email, role: user[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ message: "Google login successful", token, role: user[0].role });

  } catch (error) {
    console.error("Google login error:", error);
    res.status(400).json({ message: "Google authentication failed" });
  }
};


// Login (any user role)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid email or password" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ message: "Login successful", token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Login specifically for customers
export const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid email or password" });

    const user = rows[0];
    if (user.role !== "CUSTOMER") {
      return res.status(403).json({ message: "invalid login" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ message: "Customer login successful", token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "No user found" });

    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "15m" });
    const expireTime = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query("UPDATE users SET reset_token=?, reset_token_expire=? WHERE email=?", [
      resetToken,
      expireTime,
      email,
    ]);

    const resetLink = `http://localhost:4200/reset-password?token=${resetToken}`;
    await sendResetEmail(email, resetLink);

    res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);

    const [rows] = await pool.query("SELECT * FROM users WHERE email=? AND reset_token=?", [
      decoded.email,
      token,
    ]);

    if (rows.length === 0) return res.status(400).json({ message: "Invalid or expired token" });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash=?, reset_token=NULL, reset_token_expire=NULL WHERE email=?",
      [hash, decoded.email]
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

// Update customer profile (protected)
export const updateCustomerProfile = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;



    const { name, phone_number, vehicle_model, vehicle_number, address, nic, passport_number, is_local } = req.body;

    await connection.beginTransaction();

    // Update users table
    if (name) {
      await connection.query("UPDATE users SET name = ? WHERE id = ?", [name, userId]);
    }

    if (req.user.role === "CUSTOMER") {
      // Update customers table
      await connection.query(
        `UPDATE customers SET phone_number = ?, vehicle_model = ?, vehicle_number = ?, address = ?, nic = ?, passport_number = ?, is_local = ? WHERE user_id = ?`,
        [phone_number, vehicle_model, vehicle_number, address, nic, passport_number, is_local, userId]
      );
    }

    await connection.commit();
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

// Get account details (protected)
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query("SELECT id, name, email, role, created_at FROM users WHERE id=?", [userId]);

    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const user = rows[0];

    if (user.role === "CUSTOMER") {
      const [customerRows] = await pool.query(
        "SELECT phone_number, vehicle_model, vehicle_number, address, nic, passport_number, is_local FROM customers WHERE user_id = ?",
        [userId]
      );
      return res.json({ ...user, ...(customerRows[0] || {}) });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};