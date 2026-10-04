import { Router } from 'express';
import { subscriptionController } from '../controllers/subscriptionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { optionalBusinessAccess } from '../middleware/businessAuthMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';
import { paymentRateLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  checkoutSubscriptionSchema,
  verifySubscriptionPaymentSchema,
  cancelSubscriptionSchema,
} from '../validators/index.js';

const router = Router();

// Publicly visible plans
router.get('/plans', subscriptionController.listPlans);

// User-protected subscription endpoints
router.get('/current', requireAuth, optionalBusinessAccess, subscriptionController.getCurrentSubscription);
router.get('/my-subscription', requireAuth, optionalBusinessAccess, subscriptionController.getMySubscription);
router.get('/status', requireAuth, optionalBusinessAccess, subscriptionController.getCurrentSubscription);

// Payment checkout / order creation
router.post(
  '/checkout',
  paymentRateLimiter,
  requireAuth,
  optionalBusinessAccess,
  validateBody(checkoutSubscriptionSchema),
  subscriptionController.createOrder
);
router.post(
  '/orders',
  paymentRateLimiter,
  requireAuth,
  optionalBusinessAccess,
  validateBody(checkoutSubscriptionSchema),
  subscriptionController.createOrder
);

// Payment verification
router.post(
  '/verify',
  paymentRateLimiter,
  requireAuth,
  optionalBusinessAccess,
  validateBody(verifySubscriptionPaymentSchema),
  subscriptionController.verifyPayment
);
router.post(
  '/verify-payment',
  paymentRateLimiter,
  requireAuth,
  optionalBusinessAccess,
  validateBody(verifySubscriptionPaymentSchema),
  subscriptionController.verifyPayment
);

// Direct or verification-based activation
router.post(
  '/activate',
  requireAuth,
  optionalBusinessAccess,
  subscriptionController.activateSubscription
);

// Cancellation
router.post(
  '/cancel',
  requireAuth,
  optionalBusinessAccess,
  validateBody(cancelSubscriptionSchema),
  subscriptionController.cancelSubscription
);

// History
router.get('/payments', requireAuth, optionalBusinessAccess, subscriptionController.getPayments);
router.get('/history', requireAuth, optionalBusinessAccess, subscriptionController.getHistory);

export default router;
