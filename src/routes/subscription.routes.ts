/**
 * Subscription Routes
 * Defines all routes for subscription management
 * Following SOLID principles: Single Responsibility
 */

import { Router } from "express";
import { subscriptionController } from "../controllers/subscription.controller";
import { authMiddleware } from "../middlewares/authenticate";
import {
  requireActiveSubscription,
  checkSubscriptionWithGracePeriod,
} from "../middlewares/subscription-guard.middleware";

const router = Router();

// Public routes (require authentication only)
router.get("/me", authMiddleware, subscriptionController.getMySubscription);
router.get("/payments", authMiddleware, subscriptionController.getMyPayments);
router.post(
  "/cancel",
  authMiddleware,
  subscriptionController.cancelSubscription
);

// Admin routes (require admin role)
// Payment management
router.post("/payments", authMiddleware, subscriptionController.createPayment);
router.post(
  "/payments/:paymentId/confirm",
  authMiddleware,
  subscriptionController.confirmPayment
);
router.post(
  "/payments/:paymentId/cancel",
  authMiddleware,
  subscriptionController.cancelPayment
);

// Billing management
router.post(
  "/billing/generate/:userId",
  authMiddleware,
  subscriptionController.generateBillingForUser
);

// Statistics
router.get(
  "/admin/statistics",
  authMiddleware,
  subscriptionController.getSubscriptionStatistics
);
router.get(
  "/admin/payment-statistics",
  authMiddleware,
  subscriptionController.getPaymentStatistics
);
router.get(
  "/admin/pending-payments",
  authMiddleware,
  subscriptionController.getPendingPayments
);
router.get(
  "/admin/overdue-payments",
  authMiddleware,
  subscriptionController.getOverduePayments
);

// User management
router.get("/admin/users", authMiddleware, subscriptionController.getAllUsers);
router.put(
  "/admin/users/:userId",
  authMiddleware,
  subscriptionController.updateUserSubscription
);
router.post(
  "/admin/:userId/suspend",
  authMiddleware,
  subscriptionController.suspendUserSubscription
);
router.post(
  "/admin/:userId/activate",
  authMiddleware,
  subscriptionController.activateUserSubscription
);

// Payment management (Admin specific routes)
router.post(
  "/admin/users/:userId/payments",
  authMiddleware,
  subscriptionController.createPayment
);
router.post(
  "/admin/users/:userId/payments/:paymentId/confirm",
  authMiddleware,
  subscriptionController.confirmPayment
);
router.post(
  "/admin/users/:userId/payments/:paymentId/cancel",
  authMiddleware,
  subscriptionController.cancelPayment
);

export default router;
