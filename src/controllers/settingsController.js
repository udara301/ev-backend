import { pool } from "../config/db.js";

const ALLOWED_CATEGORIES = ["GENERAL", "CHARGING", "AFFILIATE", "RENTING"];

function parseSettingValue(value) {
    if (typeof value !== "string") {
        return value;
    }

    const trimmed = value.trim();
    if (trimmed === "") {
        return value;
    }

    if (!Number.isNaN(Number(trimmed))) {
        return trimmed.includes(".") ? parseFloat(trimmed) : parseInt(trimmed, 10);
    }

    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;

    return value;
}

function normalizeCategory(category) {
    if (typeof category !== "string") {
        return null;
    }

    const normalized = category.trim().toUpperCase();
    return ALLOWED_CATEGORIES.includes(normalized) ? normalized : null;
}

// Get all system settings (COMPANY_ADMIN only)
export const getSystemSettings = async (req, res) => {
    try {
        const { category } = req.query;
        const params = [];

        let query = `SELECT setting_key, setting_name, setting_value, setting_category, unit, description, updated_at
                 FROM system_settings`;

        if (category !== undefined) {
            const normalizedCategory = normalizeCategory(category);
            if (!normalizedCategory) {
                return res.status(400).json({
                    message: `Invalid category. Allowed values: ${ALLOWED_CATEGORIES.join(", ")}`,
                });
            }
            query += " WHERE setting_category = ?";
            params.push(normalizedCategory);
        }

        query += " ORDER BY setting_key ASC";

        const [rows] = await pool.query(query, params);

        const settings = rows.map((row) => ({
            key: row.setting_key,
            name: row.setting_name,
            value: parseSettingValue(row.setting_value),
            raw_value: row.setting_value,
            category: row.setting_category,
            unit: row.unit,
            description: row.description,
            updated_at: row.updated_at,
        }));

        return res.status(200).json(settings);
        v
    } catch (err) {
        console.error("Error fetching system settings:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// Update one or multiple system settings (COMPANY_ADMIN only)
export const updateSystemSettings = async (req, res) => {
    try {
        const { key, value } = req.body;

        const updates = [];

        if (typeof key === "string" && value !== undefined) {
            updates.push({ key, value });
        }

        if (updates.length === 0) {
            return res.status(400).json({
                message:
                    "Provide { key, value } for single update or an array of { key, value } objects for batch update",
            });
        }

        for (const item of updates) {
            if (!item.key || typeof item.key !== "string") {
                return res.status(400).json({ message: "Each setting key must be a string" });
            }

            if (item.value === undefined) {
                return res.status(400).json({ message: `value is required for key: ${item.key}` });
            }

            await pool.query(
                `UPDATE system_settings
         SET setting_value = ?, updated_at = NOW()
         WHERE setting_key = ?`,
                [
                    String(item.value),
                    item.key,
                ]
            );
        }

        const updatedKeys = updates.map((item) => item.key);
        const placeholders = updatedKeys.map(() => "?").join(",");

        const [updatedRows] = await pool.query(
            `SELECT setting_key, setting_value, setting_category, unit, description, updated_at
       FROM system_settings
       WHERE setting_key IN (${placeholders})
       ORDER BY setting_key ASC`,
            updatedKeys
        );

        const response = updatedRows.map((row) => ({
            key: row.setting_key,
            value: parseSettingValue(row.setting_value),
            raw_value: row.setting_value,
            category: row.setting_category,
            unit: row.unit,
            description: row.description,
            updated_at: row.updated_at,
        }));

        return res.status(200).json({
            message: "System setting(s) updated successfully",
            settings: response,
        });
    } catch (err) {
        console.error("Error updating system settings:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
