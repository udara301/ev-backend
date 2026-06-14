import express from "express";
import {
  createCoupon,
  getAffiliateCoupons,
  deactivateCoupon,
  applyCouponForBooking,
} from "../controllers/couponCodeController.js";
import { authorize, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/coupons:
 *   post:
 *     summary: Create a new coupon code (AFFILIATE only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 description: Display name or label for the coupon
 *                 example: Summer Discount
 *               discount_pct_per_charging:
 *                 type: integer
 *                 description: Discount percentage for charging (0-100). If not provided, fetches from system settings
 *                 example: 5
 *               discount_pct_per_renting:
 *                 type: integer
 *                 description: Discount percentage for renting (0-100). If not provided, fetches from system settings
 *                 example: 10
 *               max_uses_per_user:
 *                 type: integer
 *                 description: Maximum times this coupon can be used by a single user. Defaults to 1
 *                 example: 1
 *     responses:
 *       201:
 *         description: Coupon code created successfully
 *       400:
 *         description: Invalid discount percentages
 *       403:
 *         description: Forbidden (not an affiliate or account suspended)
 *       404:
 *         description: Affiliate profile not found
 *       500:
 *         description: Server error
 */
router.post("/", verifyToken, authorize(["AFFILIATE"]), createCoupon);

/**
 * @swagger
 * /api/v1/coupons:
 *   get:
 *     summary: Get all coupons for the logged-in affiliate (AFFILIATE only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons for the affiliate
 *       403:
 *         description: Forbidden (not an affiliate)
 *       404:
 *         description: Affiliate profile not found
 *       500:
 *         description: Server error
 */
router.get("/", verifyToken, authorize(["AFFILIATE"]), getAffiliateCoupons);

/**
 * @swagger
 * /api/v1/coupons/{couponId}:
 *   patch:
 *     summary: Deactivate a coupon (AFFILIATE only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon deactivated successfully
 *       403:
 *         description: Forbidden (not an affiliate)
 *       404:
 *         description: Coupon not found or does not belong to affiliate
 *       500:
 *         description: Server error
 */
router.patch("/:couponId", verifyToken, authorize(["AFFILIATE"]), deactivateCoupon);

/**
 * @swagger
 * /api/v1/coupons/apply-booking:
 *   post:
 *     summary: Apply coupon to a booking amount and return discounted value (CUSTOMER only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [coupon_code, amount]
 *             properties:
 *               coupon_code:
 *                 type: string
 *                 example: A1B2C3
 *               amount:
 *                 type: number
 *                 format: float
 *                 example: 12000
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       400:
 *         description: Invalid payload, coupon inactive/expired, or usage limit reached
 *       403:
 *         description: Forbidden (only customers)
 *       404:
 *         description: Coupon not found
 *       500:
 *         description: Server error
 */
router.post("/apply-booking", verifyToken, authorize(["CUSTOMER"]), applyCouponForBooking);

export default router;
