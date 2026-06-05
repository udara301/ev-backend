import express from "express";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../controllers/settingsController.js";
import { authorize, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/settings:
 *   get:
 *     summary: Get system settings (COMPANY_ADMIN only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         required: false
 *         schema:
 *           type: string
 *           enum: [GENERAL, CHARGING, AFFILIATE, RENTING]
 *         description: Filter settings by category
 *     responses:
 *       200:
 *         description: System settings retrieved successfully
 *       400:
 *         description: Invalid category
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/", verifyToken, authorize(["COMPANY_ADMIN"]), getSystemSettings);

/**
 * @swagger
 * /api/v1/settings:
 *   patch:
 *     summary: Update one or more system settings (COMPANY_ADMIN only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             oneOf:
 *               - type: object
 *                 required: [key, value]
 *                 properties:
 *                   key:
 *                     type: string
 *                     example: points_pct_charging
 *                   value:
 *                     example: 7
 *                   category:
 *                     type: string
 *                     enum: [GENERAL, CHARGING, AFFILIATE, RENTING]
 *                     example: AFFILIATE
 *                   unit:
 *                     type: string
 *                     example: Points
 *                   description:
 *                     type: string
 *                     example: Default points per 100 expense for charging
 *               - type: object
 *                 required: [settings]
 *                 properties:
 *                   settings:
 *                     type: object
 *                     example:
 *                       points_pct_charging:
 *                         value: 7
 *                         category: AFFILIATE
 *                         unit: Points
 *                         description: Default points per 100 expense for charging
 *                       points_pct_renting: 12
 *     responses:
 *       200:
 *         description: System settings updated successfully
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.patch("/", verifyToken, authorize(["COMPANY_ADMIN"]), updateSystemSettings);

export default router;
