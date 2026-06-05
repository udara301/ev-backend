import { pool } from "../config/db.js";

/**
 * getting a setting value from the database. If the setting is not found, it returns the provided default value.
 * @param {string} key - the name of the setting (e.g., 'affiliate_discount_pct')
 * @param {any} defaultValue - the value to return if the setting is not found in the database
 */
export async function getSetting(key, defaultValue = null) {
    try {
        const [rows] = await pool.query(
            "SELECT setting_value FROM system_settings WHERE setting_key = ?", 
            [key]
        );
        
        if (rows.length === 0) {
            return defaultValue;
        }

        const value = rows[0].setting_value;

        // Check if the value is a number (Int or Float) and convert it accordingly
        if (!isNaN(value) && value.trim() !== '') {
            return value.includes('.') ? parseFloat(value) : parseInt(value, 10);
        }

        // Handle boolean values (e.g., 'true' -> true)
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        return value; // If it's a string, return it as is
    } catch (err) {
        console.error(`❌ Error fetching setting for key [${key}]:`, err);
        return defaultValue;
    }
}

/**
 * Update a setting value in the database (for super admins)
 */
export async function updateSetting(key, value) {
    await pool.query(
        `INSERT INTO system_settings (setting_key, setting_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE setting_value = ?`,
        [key, String(value), String(value)]
    );
    return true;
}