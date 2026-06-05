import express from "express";
import {
	createAffiliateProfile,
	getAllAffiliateProfiles,
	loginAffiliate,
	suspendAffiliateAccount,
	activateAffiliateAccount,
	updateAffiliatePointsPercentages,
} from "../controllers/affiliateController.js";
import { authorize, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/affiliates/signup:
 *   post:
 *     summary: Create affiliate account and profile
 *     tags: [Affiliates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               phone:
 *                 type: string
 *                 example: "+94771234567"
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       201:
 *         description: Affiliate profile created successfully
 *       400:
 *         description: Invalid payload
 *       409:
 *         description: Email already exists
 */
router.post("/signup", createAffiliateProfile);

/**
 * @swagger
 * /api/v1/affiliates/login:
 *   post:
 *     summary: Login affiliate user
 *     tags: [Affiliates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Affiliate login successful
 *       400:
 *         description: Invalid payload or credentials
 *       403:
 *         description: User is not an affiliate or account is suspended
 *       404:
 *         description: Affiliate profile not found
 */
router.post("/login", loginAffiliate);

/**
 * @swagger
 * /api/v1/affiliates/profiles:
 *   get:
 *     summary: Get all affiliate profiles (COMPANY_ADMIN only)
 *     tags: [Affiliates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Affiliate profiles retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/profiles", verifyToken, authorize(["COMPANY_ADMIN"]), getAllAffiliateProfiles);

/**
 * @swagger
 * /api/v1/affiliates/suspend:
 *   patch:
 *     summary: Suspend an affiliate account (COMPANY_ADMIN only)
 *     tags: [Affiliates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 12
 *     responses:
 *       200:
 *         description: Affiliate account suspended successfully
 *       400:
 *         description: Invalid payload or target user is not an affiliate
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User/profile not found
 */
router.patch("/suspend", verifyToken, authorize(["COMPANY_ADMIN"]), suspendAffiliateAccount);

/**
 * @swagger
 * /api/v1/affiliates/activate:
 *   patch:
 *     summary: Activate a suspended affiliate account (COMPANY_ADMIN only)
 *     tags: [Affiliates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 12
 *     responses:
 *       200:
 *         description: Affiliate account activated successfully
 *       400:
 *         description: Invalid payload or target user is not an affiliate
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User/profile not found
 */
router.patch("/activate", verifyToken, authorize(["COMPANY_ADMIN"]), activateAffiliateAccount);

/**
 * @swagger
 * /api/v1/affiliates/points:
 *   patch:
 *     summary: Update affiliate points percentages (COMPANY_ADMIN only)
 *     tags: [Affiliates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, points_pct_charging, points_pct_renting]
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 12
 *               points_pct_charging:
 *                 type: integer
 *                 example: 5
 *               points_pct_renting:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       200:
 *         description: Affiliate points percentages updated successfully
 *       400:
 *         description: Invalid payload or target user is not an affiliate
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User/profile not found
 */
router.patch("/points", verifyToken, authorize(["COMPANY_ADMIN"]), updateAffiliatePointsPercentages);

export default router;
