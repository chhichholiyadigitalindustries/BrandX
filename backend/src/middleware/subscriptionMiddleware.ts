/**
 * BRANDX — Pro Subscription Authorization Middleware
 * Server-side feature gating for BrandX Pro features.
 * Returns HTTP 403 with code "PRO_REQUIRED" if user does not have an active Pro subscription.
 */
import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscriptionService.js';
import { prisma } from '../config/database.js';

export const requireProSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication is required to access this resource.',
      });
      return;
    }

    const businessId = (req as any).businessId;
    const userId = user.id;

    // Authoritative check from PostgreSQL database
    const sub = await subscriptionService.getCurrentSubscription(businessId, userId);

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPro: true },
    });

    const isPro = Boolean(sub.isPro || dbUser?.isPro);

    if (!isPro) {
      res.status(403).json({
        success: false,
        code: 'PRO_REQUIRED',
        message: 'This feature requires an active BrandX Pro subscription.',
      });
      return;
    }

    (req as any).subscription = sub;
    next();
  } catch (error: any) {
    res.status(403).json({
      success: false,
      code: 'PRO_REQUIRED',
      message: 'This feature requires an active BrandX Pro subscription.',
    });
  }
};
