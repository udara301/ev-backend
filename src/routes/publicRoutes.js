import express from "express";
import {
    getChargersPublic

} from "../controllers/publicRouteController.js";

const router = express.Router();
/**
 * @swagger
 * /api/v1/chargers/chargers-admin:
 *   get:
 *     summary: List all chargers (Public only)
 *     tags: [Chargers]
 *     responses:
 *       200:
 *         description: List of all chargers
 *       401:
 *         description: Unauthorized
 */
router.get("/chargers", getChargersPublic);

export default router;
