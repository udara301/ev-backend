import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createAffiliateProfile } from "../controllers/affiliateController.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/affiliates/profiles:
 *   post:
 *     summary: Create an affiliate profile
 *     tags: [Affiliates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: Only for COMPANY_ADMIN to create profile for a specific affiliate user
 *               commission_rate_pct:
 *                 type: number
 *                 example: 5
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED]
 *     responses:
 *       201:
 *         description: Affiliate profile created successfully
 *       400:
 *         description: Invalid payload or selected user is not an affiliate
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       409:
 *         description: Affiliate profile already exists
 */
router.post("/profiles", verifyToken, createAffiliateProfile);

export default router;
