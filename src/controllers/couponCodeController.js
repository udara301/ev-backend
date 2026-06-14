import { pool } from "../config/db.js";

/**
 * Generate a unique 6-character alphanumeric code (uppercase)
 */
function generateUniqueCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if code already exists in the database
 */
async function codeExists(code) {
  const [rows] = await pool.query(
    "SELECT id FROM coupons WHERE code = ?",
    [code]
  );
  return rows.length > 0;
}

/**
 * Get a setting value from system_settings table
 */
async function getSetting(key, defaultValue = null) {
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = ?",
      [key]
    );

    if (rows.length === 0) {
      return defaultValue;
    }

    const value = rows[0].setting_value;

    // Parse the value
    if (!isNaN(value) && value.trim() !== "") {
      return value.includes(".") ? parseFloat(value) : parseInt(value, 10);
    }

    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;

    return value;
  } catch (err) {
    console.error(`Error fetching setting for key [${key}]:`, err);
    return defaultValue;
  }
}

/**
 * Create a coupon code (AFFILIATE only)
 * POST /api/v1/coupons
 */
export const createCoupon = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // Verify affiliate role
    if (!req.user || req.user.role !== "AFFILIATE") {
      return res.status(403).json({ message: "Forbidden: Only affiliates can create coupons" });
    }

    const userId = req.user.id;

    // Get affiliate profile
    const [affiliateProfiles] = await connection.query(
      "SELECT id, status FROM affiliate_profiles WHERE user_id = ?",
      [userId]
    );

    if (affiliateProfiles.length === 0) {
      return res.status(404).json({ message: "Affiliate profile not found" });
    }

    const affiliateId = affiliateProfiles[0].id;
    const affiliateStatus = affiliateProfiles[0].status;

    if (affiliateStatus === "SUSPENDED") {
      return res.status(403).json({ message: "Cannot create coupons: Affiliate account is suspended" });
    }

    // Get optional parameters from request
    const { max_uses_per_user, label } = req.body;

    // Get discount percentages from settings (use provided values or fetch from settings)
    let discountChargingPct = req.body.discount_pct_per_charging;
    let discountRentingPct = req.body.discount_pct_per_renting;

    // If not provided, fetch from system_settings
    if (discountChargingPct === undefined) {
      discountChargingPct = await getSetting("discount_pct_per_charging", 5);
    }
    if (discountRentingPct === undefined) {
      discountRentingPct = await getSetting("discount_pct_per_renting", 10);
    }

    // Validate discount percentages
    if (
      typeof discountChargingPct !== "number" ||
      typeof discountRentingPct !== "number" ||
      discountChargingPct < 0 ||
      discountChargingPct > 100 ||
      discountRentingPct < 0 ||
      discountRentingPct > 100
    ) {
      return res.status(400).json({
        message: "discount_pct_per_charging and discount_pct_per_renting must be numbers between 0 and 100",
      });
    }

    // Generate unique coupon code
    let couponCode;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      couponCode = generateUniqueCode();
      const exists = await codeExists(couponCode);
      if (!exists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts === maxAttempts) {
      return res.status(500).json({ message: "Failed to generate unique coupon code" });
    }

    // Set expiry date to 1 month from now
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    // Prepare insert parameters
    const maxUsesPerUser = max_uses_per_user || 1;

    await connection.beginTransaction();

    // Insert coupon
    const [result] = await connection.query(
      `INSERT INTO coupons (
        affiliate_id, 
        code, 
        label,
        discount_pct_per_charging, 
        discount_pct_per_renting, 
        max_uses_per_user, 
        expiry_date, 
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        affiliateId,
        couponCode,
        label || null,
        discountChargingPct,
        discountRentingPct,
        maxUsesPerUser,
        expiryDate,
      ]
    );

    // Fetch the created coupon
    const [createdCoupon] = await connection.query(
      `SELECT 
        id, 
        affiliate_id, 
        code, 
        label,
        discount_pct_per_charging, 
        discount_pct_per_renting, 
        max_uses_per_user, 
        expiry_date, 
        is_active, 
        created_at
       FROM coupons 
       WHERE id = ?`,
      [result.insertId]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Coupon code created successfully",
      coupon: createdCoupon[0],
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error creating coupon:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

/**
 * Get all coupons for the logged-in affiliate
 * GET /api/v1/coupons
 */
export const getAffiliateCoupons = async (req, res) => {
  try {
    // Verify affiliate role
    if (!req.user || req.user.role !== "AFFILIATE") {
      return res.status(403).json({ message: "Forbidden: Only affiliates can view their coupons" });
    }

    const userId = req.user.id;

    // Get affiliate profile
    const [affiliateProfiles] = await pool.query(
      "SELECT id FROM affiliate_profiles WHERE user_id = ?",
      [userId]
    );

    if (affiliateProfiles.length === 0) {
      return res.status(404).json({ message: "Affiliate profile not found" });
    }

    const affiliateId = affiliateProfiles[0].id;

    // Get all coupons for this affiliate
    const [coupons] = await pool.query(
      `SELECT 
        id, 
        affiliate_id, 
        code, 
        label,
        discount_pct_per_charging, 
        discount_pct_per_renting, 
        max_uses_per_user, 
        expiry_date, 
        is_active, 
        created_at
       FROM coupons 
       WHERE affiliate_id = ?
       ORDER BY created_at DESC`,
      [affiliateId]
    );

    return res.status(200).json(coupons);
  } catch (err) {
    console.error("Error fetching affiliate coupons:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Deactivate a coupon
 * PATCH /api/v1/coupons/:couponId
 */
export const deactivateCoupon = async (req, res) => {
  try {
    // Verify affiliate role
    if (!req.user || req.user.role !== "AFFILIATE") {
      return res.status(403).json({ message: "Forbidden: Only affiliates can manage coupons" });
    }

    const { couponId } = req.params;
    const userId = req.user.id;

    // Get affiliate profile
    const [affiliateProfiles] = await pool.query(
      "SELECT id FROM affiliate_profiles WHERE user_id = ?",
      [userId]
    );

    if (affiliateProfiles.length === 0) {
      return res.status(404).json({ message: "Affiliate profile not found" });
    }

    const affiliateId = affiliateProfiles[0].id;

    // Check if coupon belongs to this affiliate
    const [coupons] = await pool.query(
      "SELECT id, is_active FROM coupons WHERE id = ? AND affiliate_id = ?",
      [couponId, affiliateId]
    );

    if (coupons.length === 0) {
      return res.status(404).json({ message: "Coupon not found or does not belong to you" });
    }

    if (coupons[0].is_active === 0) {
      return res.status(200).json({
        message: "Coupon is already inactive",
        coupon: coupons[0],
      });
    }

    // Deactivate coupon
    await pool.query("UPDATE coupons SET is_active = 0 WHERE id = ?", [couponId]);

    // Fetch updated coupon
    const [updatedCoupon] = await pool.query(
      `SELECT 
        id, 
        affiliate_id, 
        code, 
        label,
        discount_pct_per_charging, 
        discount_pct_per_renting, 
        max_uses_per_user, 
        expiry_date, 
        is_active, 
        created_at
       FROM coupons 
       WHERE id = ?`,
      [couponId]
    );

    return res.status(200).json({
      message: "Coupon deactivated successfully",
      coupon: updatedCoupon[0],
    });
  } catch (err) {
    console.error("Error deactivating coupon:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Apply coupon for a booking amount (CUSTOMER only)
 * POST /api/v1/coupons/apply-booking
 */
export const applyCouponForBooking = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message: "Forbidden: Only customers can apply booking coupons",
      });
    }

    const { coupon_code, amount } = req.body;

    if (!coupon_code || amount === undefined) {
      return res.status(400).json({
        message: "coupon_code and amount are required",
      });
    }

    const bookingAmount = Number(amount);
    if (Number.isNaN(bookingAmount) || bookingAmount <= 0) {
      return res.status(400).json({
        message: "amount must be a valid number greater than 0",
      });
    }

    const normalizedCode = String(coupon_code).trim().toUpperCase();

    const [couponRows] = await pool.query(
      `SELECT id, code, label, discount_pct_per_renting, max_uses_per_user, expiry_date, is_active
       FROM coupons
       WHERE code = ?`,
      [normalizedCode]
    );

    if (couponRows.length === 0) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    const coupon = couponRows[0];

    if (coupon.is_active !== 1) {
      return res.status(400).json({ message: "Coupon is inactive" });
    }

    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    const userId = req.user.id;
    const [usageRows] = await pool.query(
      `SELECT COUNT(*) AS usage_count
       FROM coupon_usages
       WHERE coupon_id = ? AND customer_id = ?`,
      [coupon.id, userId]
    );

    const usageCount = usageRows[0]?.usage_count || 0;
    if (usageCount >= coupon.max_uses_per_user) {
      return res.status(400).json({
        message: "Coupon usage limit reached for this user",
      });
    }

    const discountPct = Number(coupon.discount_pct_per_renting) || 0;
    const discountAmount = Number(((bookingAmount * discountPct) / 100).toFixed(2));
    const discountedValue = Number((bookingAmount - discountAmount).toFixed(2));

    return res.status(200).json({
      message: "Coupon applied successfully",
      coupon: {
        id: coupon.id,
        code: coupon.code,
        label: coupon.label,
        discount_pct_per_renting: discountPct,
      },
      amount: bookingAmount,
      discount_amount: discountAmount,
      discounted_value: discountedValue,
    });
  } catch (err) {
    console.error("Error applying booking coupon:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
