import express from "express";
import {
	createAffiliateProfile,
	loginAffiliate,
} from "../controllers/affiliateController.js";

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

export default router;
