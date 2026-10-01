import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscriptionService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class SubscriptionController {
  /**
   * GET /api/v1/subscriptions/plans
   * List all public active subscription plans
   */
  async listPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await subscriptionService.listPlans();
      sendSuccess(res, plans, 'Subscription plans retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  /**
   * GET /api/v1/subscriptions/current or /my-subscription
   * Get current subscription and entitlement status
   */
  async getCurrentSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessId;

      const sub = await subscriptionService.getCurrentSubscription(businessId, userId);
      sendSuccess(res, sub, 'Current subscription details');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  // Alias for backward compatibility
  async getMySubscription(req: Request, res: Response): Promise<void> {
    return this.getCurrentSubscription(req, res);
  }

  /**
   * POST /api/v1/subscriptions/checkout or /orders
   * Initiate subscription payment order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { planCode, gateway } = req.body;
      const userId = req.user!.id;
      const businessId = req.businessId;

      const order = await subscriptionService.createPaymentOrder(
        userId,
        businessId,
        planCode,
        gateway || 'RAZORPAY'
      );
      sendSuccess(res, order, 'Payment order created successfully', 201);
    } catch (error: any) {
      sendError(res, error.message, error.status || 400, 'ORDER_CREATION_FAILED');
    }
  }

  /**
   * POST /api/v1/subscriptions/verify or /verify-payment
   * Verify signature and activate subscription
   */
  async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessId;

      const result = await subscriptionService.verifyAndActivateSubscription(
        userId,
        businessId,
        req.body
      );
      sendSuccess(res, result, 'Payment verified and Pro subscription activated');
    } catch (error: any) {
      sendError(res, error.message, error.status || 400, 'VERIFICATION_FAILED');
    }
  }

  /**
   * POST /api/v1/subscriptions/activate
   * Direct activation or payment verification activation
   */
  async activateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessId;
      const { planCode, orderId, paymentId, signature } = req.body || {};

      if (orderId && paymentId) {
        const result = await subscriptionService.verifyAndActivateSubscription(
          userId,
          businessId,
          { orderId, paymentId, signature, planCode }
        );
        sendSuccess(res, result, 'Subscription activated successfully');
        return;
      }

      const targetPlanCode = planCode || 'pro_monthly';
      const result = await subscriptionService.directActivateSubscription(
        userId,
        businessId,
        targetPlanCode
      );
      sendSuccess(res, result, 'Subscription activated successfully');
    } catch (error: any) {
      sendError(res, error.message, error.status || 400, 'ACTIVATION_FAILED');
    }
  }

  /**
   * POST /api/v1/subscriptions/cancel
   * Cancel subscription (cancelAtPeriodEnd = true)
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessId;
      const { reason } = req.body;

      const result = await subscriptionService.cancelSubscription(userId, businessId, reason);
      sendSuccess(
        res,
        result,
        'Subscription scheduled for cancellation at the end of the current billing period.'
      );
    } catch (error: any) {
      sendError(res, error.message, 400, 'CANCELLATION_FAILED');
    }
  }

  /**
   * GET /api/v1/subscriptions/payments
   * List payment history for current user/business
   */
  async getPayments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessId;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await subscriptionService.getPaymentHistory(
        userId,
        businessId,
        page,
        limit
      );
      sendSuccess(res, result, 'Payment history retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }

  /**
   * GET /api/v1/subscriptions/history
   * List past subscriptions for current user/business
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const businessId = req.businessId;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await subscriptionService.getSubscriptionHistory(
        userId,
        businessId,
        page,
        limit
      );
      sendSuccess(res, result, 'Subscription history retrieved');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  }
}

export const subscriptionController = new SubscriptionController();
