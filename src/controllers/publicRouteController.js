import { pool } from "../config/db.js";

export const getChargersPublic = async (req, res) => {
    try {
        const [rows] = await pool.query(`
      SELECT 
        c.id AS charger_id,
        c.serial_number,
        c.checksum,
        c.ocpp_id,
        c.location,
        c.latitude,
        c.longitude,
        c.street_name,
        c.city,
        c.is_24hours_open,
        c.opening_time,
        c.amenities,
        c.closing_time,
        c.price_per_kwh,
        c.is_active,
        c.created_at AS charger_created_at,
        -- Charger Type Details
        ct.id AS type_id,
        ct.model AS type_model,
        ct.input_voltage,
        ct.current_type,
        ct.description,
        ct.created_at AS type_created_at,
        -- Agent Details (Optional)
        a.id AS agent_id,
        a.contact_person AS agent_contact_person,
        a.phone_number AS agent_phone,
        a.city AS agent_city,
        a.status AS agent_status,
        -- Connector Details (Optional, multiple per charger)
        con.id AS connector_id,
        con.connector_id AS connector_number,  -- Renamed to avoid confusion with con.id
        con.status AS connector_status,
        con.output_voltage,
        con.connector_type,
        con.max_power_kw,
        con.amperage,
        con.active_charge_id
      FROM chargers c
      JOIN charger_types ct ON c.charger_type_id = ct.id
      LEFT JOIN agents a ON c.agent_id = a.id
      LEFT JOIN connectors con ON con.charger_id = c.id
      ORDER BY c.id DESC, con.connector_id ASC  -- Order by charger, then connector
    `);

        // Group results by charger_id to handle multiple connectors
        const chargerMap = new Map();
        rows.forEach(row => {
            const chargerId = row.charger_id;
            if (!chargerMap.has(chargerId)) {
                chargerMap.set(chargerId, {
                    charger_id: row.charger_id,
                    ocpp_id: row.ocpp_id,
                    serial_number: row.serial_number,
                    checksum: row.checksum,
                    location: row.location,
                    latitude: row.latitude || '',
                    longitude: row.longitude || '',
                    created_at: row.charger_created_at,
                    street_name: row.street_name,
                    city: row.city,
                    is_24hours_open: row.is_24hours_open,
                    opening_time: row.opening_time,
                    closing_time: row.closing_time,
                    amenities: row.amenities,
                    price_per_kwh: row.price_per_kwh,
                    is_active: row.is_active,
                    charger_type: {
                        id: row.type_id,
                        model: row.type_model,
                        input_voltage: row.input_voltage,
                        current_type: row.current_type,
                        description: row.description,
                        created_at: row.type_created_at
                    },
                    agent: row.agent_id
                        ? {
                            id: row.agent_id,
                            contact_person: row.agent_contact_person,
                            phone_number: row.agent_phone,
                            city: row.agent_city,
                            status: row.agent_status
                        }
                        : null,
                    connectors: []  // Array to hold connector details
                });
            }
            // Add connector if it exists
            if (row.connector_id) {
                chargerMap.get(chargerId).connectors.push({
                    id: row.connector_id,
                    connector_number: row.connector_number,
                    status: row.connector_status,
                    output_voltage: row.output_voltage,
                    connector_type: row.connector_type,
                    max_power_kw: row.max_power_kw,
                    amperage: row.amperage,
                    active_charge_id: row.active_charge_id
                });
            }
        });

        // Convert map to array
        const chargers = Array.from(chargerMap.values());

        res.json(chargers);
    } catch (err) {
        console.error("Error fetching chargers:", err);
        res.status(500).json({ message: "Server error" });
    }
};