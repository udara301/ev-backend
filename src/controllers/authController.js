import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import dotenv from "dotenv";
import { sendResetEmail } from "../utils/mailer.js";
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

// Get account details (protected)
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query("SELECT id, name, email, role, created_at FROM users WHERE id=?", [userId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};