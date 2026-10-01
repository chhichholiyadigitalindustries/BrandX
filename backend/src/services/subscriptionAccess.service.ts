import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from './subscriptionService.js';
import { sendError } from '../utils/response.js';

export interface PlanLimits {
  isPro: boolean;
  planCode: string;
  planName: string;
  aiDailyLimit: number;
  monthlyInvoicesLimit: number; // -1 for unlimited
  monthlyPostersLimit: number; // -1 for unlimited
  features: string[];
}

export class SubscriptionAccessService {
  /**
   * Check if a user currently has active Pro privileges
   */
  async isPro(userId: string): Promise<boolean> {
    const sub = await subscriptionService.getCurrentSubscription(undefined, userId);
    return sub.isPro;
  }

  /**
   * Get plan limits for a user
   */
  async getLimits(userId: string): Promise<PlanLimits> {
    const sub = await subscriptionService.getCurrentSubscription(undefined, userId);

    if (sub.isPro && sub.plan) {
      const isYearly = sub.plan.billingInterval === 'YEARLY' || sub.plan.code.includes('YEAR');
      return {
        isPro: true,
        planCode: sub.plan.code,
        planName: sub.plan.name,
        aiDailyLimit: 100,
        monthlyInvoicesLimit: -1, // Unlimited
        monthlyPostersLimit: -1, // Unlimited
        features: [
          'UNLIMITED_INVOICES',
          'UNLIMITED_POSTERS',
          'PRO_AI_ASSISTANT',
          'WHATSAPP_CAMPAIGNS',
          'AUTO_PAYMENT_REMINDERS',
          'PREMIUM_TEMPLATES',
          'BARCODE_SCANNER',
          'MULTI_STAFF',
          'PRIORITY_SUPPORT',
          ...(isYearly ? ['NFC_REVIEW_CARD', 'DEDICATED_ACCOUNT_MANAGER'] : []),
        ],
      };
    }

    return {
      isPro: false,
      planCode: 'FREE',
      planName: 'Free Starter Plan',
      aiDailyLimit: 20,
      monthlyInvoicesLimit: 5,
      monthlyPostersLimit: 10,
      features: [
        'BASIC_KHATA',
        'LIMITED_INVOICES',
        'LIMITED_POSTERS',
        'BASIC_AI_ASSISTANT',
      ],
    };
  }

  /**
   * Check if a user has access to a specific feature key
   */
  async hasFeature(userId: string, feature: string): Promise<boolean> {
    const limits = await this.getLimits(userId);
    return limits.features.includes(feature) || limits.isPro;
  }
}

export const subscriptionAccessService = new SubscriptionAccessService();

/**
 * Express middleware to enforce active PRO status
 */
export function requirePro(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;
  if (!user) {
    sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    return;
  }

  subscriptionAccessService
    .isPro(user.id)
    .then((isPro) => {
      if (!isPro) {
        sendError(
          res,
          'This feature requires an active BrandX Pro subscription. Please upgrade to continue.',
          403,
          'PRO_SUBSCRIPTION_REQUIRED'
        );
        return;
      }
      next();
    })
    .catch((err) => {
      sendError(res, 'Failed to verify subscription status', 500, 'SUBSCRIPTION_VERIFICATION_ERROR', err?.message);
    });
}

/**
 * Express middleware to enforce a specific feature access
 */
export function requireFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    subscriptionAccessService
      .hasFeature(user.id, feature)
      .then((hasAccess) => {
        if (!hasAccess) {
          sendError(
            res,
            `Feature '${feature}' requires an upgraded BrandX Pro subscription.`,
            403,
            'FEATURE_LOCKED'
          );
          return;
        }
        next();
      })
      .catch((err) => {
        sendError(res, 'Failed to verify feature entitlement', 500, 'FEATURE_VERIFICATION_ERROR', err?.message);
      });
  };
}
