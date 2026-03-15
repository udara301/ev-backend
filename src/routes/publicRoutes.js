import express from "express";
import {
    getChargersPublic

} from "../controllers/publicRouteController.js";

const router = express.Router();
/**
 * @swagger
 * /api/v1/chargers:
 *   get:
 *     summary: List all chargers with details (Company Admin only)
 *     description: Retrieves a list of all chargers, including charger type, agent, and connector details. Requires COMPANY_ADMIN role.
 *     tags: [Chargers]
 *     security:
 *       - bearerAuth: []  # Assuming JWT or similar auth
 *     responses:
 *       200:
 *         description: Successful response with list of chargers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   charger_id:
 *                     type: integer
 *                     description: Unique ID of the charger
 *                   ocpp_id:
 *                     type: string
 *                     description: OCPP identifier for the charger
 *                   serial_number:
 *                     type: string
 *                     description: Serial number of the charger
 *                   checksum:
 *                     type: string
 *                     description: Checksum for the charger
 *                   location:
 *                     type: string
 *                     description: General location description
 *                   latitude:
 *                     type: string
 *                     description: Latitude coordinate (or empty string if not set)
 *                   longitude:
 *                     type: string
 *                     description: Longitude coordinate (or empty string if not set)
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: Creation timestamp
 *                   street_name:
 *                     type: string
 *                     description: Street name
 *                   city:
 *                     type: string
 *                     description: City
 *                   is_24hours_open:
 *                     type: boolean
 *                     description: Whether the charger is open 24/7
 *                   opening_time:
 *                     type: string
 *                     format: time
 *                     description: Opening time (if not 24 hours)
 *                   closing_time:
 *                     type: string
 *                     format: time
 *                     description: Closing time (if not 24 hours)
 *                   amenities:
 *                     type: string
 *                     description: Amenities available
 *                   price_per_kwh:
 *                     type: number
 *                     format: float
 *                     description: Price per kWh
 *                   is_active:
 *                     type: boolean
 *                     description: Whether the charger is active
 *                   charger_type:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Charger type ID
 *                       model:
 *                         type: string
 *                         description: Charger model
 *                       input_voltage:
 *                         type: string
 *                         description: Input voltage
 *                       current_type:
 *                         type: string
 *                         enum: [AC, DC]
 *                         description: Current type
 *                       description:
 *                         type: string
 *                         description: Description of the charger type
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: Creation timestamp
 *                   agent:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Agent ID
 *                       contact_person:
 *                         type: string
 *                         description: Contact person name
 *                       phone_number:
 *                         type: string
 *                         description: Phone number
 *                       city:
 *                         type: string
 *                         description: Agent city
 *                       status:
 *                         type: string
 *                         enum: [NEW, ACTIVE, INACTIVE]
 *                         description: Agent status
 *                   connectors:
 *                     type: array
 *                     description: List of connectors for the charger
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           description: Connector ID
 *                         connector_number:
 *                           type: integer
 *                           description: Connector number (e.g., 1, 2)
 *                         status:
 *                           type: string
 *                           enum: [IDLE, PENDING, PAUSED, CHARGING, ERROR, UNAVAILABLE, FAULTED, FINISHING]
 *                           description: Connector status
 *                         output_voltage:
 *                           type: string
 *                           description: Output voltage
 *                         connector_type:
 *                           type: string
 *                           description: Connector type (e.g., Type 2)
 *                         max_power_kw:
 *                           type: number
 *                           format: float
 *                           description: Maximum power in kW
 *                         amperage:
 *                           type: string
 *                           description: Amperage
 *                         active_charge_id:
 *                           type: integer
 *                           nullable: true
 *                           description: Active charge ID (if any)
 *       403:
 *         description: Forbidden - User does not have COMPANY_ADMIN role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Forbidden
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Server error
 */
router.get("/chargers", getChargersPublic);

export default router;
