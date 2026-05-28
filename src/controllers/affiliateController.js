import { pool } from "../config/db.js";

// Create affiliate profile
export const createAffiliateProfile = async (req, res) => {
  try {
    const { user_id, commission_rate_pct, status } = req.body;

    // Only affiliates can create their own profile. Company admins can create for a given affiliate user.
    if (!["AFFILIATE", "COMPANY_ADMIN"].includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const targetUserId = req.user.role === "COMPANY_ADMIN" && user_id ? user_id : req.user.id;

    const [users] = await pool.query(
      "SELECT id, role FROM users WHERE id = ?",
      [targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    if (users[0].role !== "AFFILIATE") {
      return res.status(400).json({ message: "User is not an affiliate" });
    }

    const [existing] = await pool.query(
      "SELECT id FROM affiliate_profiles WHERE user_id = ?",
      [targetUserId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Affiliate profile already exists" });
    }

    const safeCommissionRate =
      commission_rate_pct === undefined || commission_rate_pct === null
        ? 5.0
        : Number(commission_rate_pct);

    if (!Number.isFinite(safeCommissionRate) || safeCommissionRate < 0 || safeCommissionRate > 100) {
      return res.status(400).json({ message: "commission_rate_pct must be between 0 and 100" });
    }

    const allowedStatus = ["ACTIVE", "SUSPENDED"];
    const safeStatus = status && allowedStatus.includes(status) ? status : "ACTIVE";

    const [result] = await pool.query(
      `INSERT INTO affiliate_profiles (user_id, commission_rate_pct, status)
       VALUES (?, ?, ?)`,
      [targetUserId, safeCommissionRate, safeStatus]
    );

    const [profileRows] = await pool.query(
      `SELECT id, user_id, commission_rate_pct, current_points, total_points_earned, status, created_at
       FROM affiliate_profiles
       WHERE id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Affiliate profile created successfully",
      profile: profileRows[0],
    });
  } catch (err) {
    console.error("Error creating affiliate profile:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
