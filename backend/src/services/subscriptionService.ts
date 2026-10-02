/**
 * BRANDX — Subscription & Payment Service
 * Production lifecycle management: Checkout, Verification, Activation, Cancellation, Expiry, Idempotency.
 */

import { subscriptionRepository } from '../repositories/subscriptionRepository.js';
import { paymentService } from '../payments/paymentService.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import {
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

export class SubscriptionService {
  /**
   * List publicly available active subscription plans
   */
  async listPlans() {
    return subscriptionRepository.listPlans();
  }

  /**
   * Get authoritative active subscription for current business/user
   */
  async getCurrentSubscription(businessId?: string, userId?: string) {
    let activeSub = await subscriptionRepository.findActiveSubscription(businessId, userId);

    // If not found and only one ID parameter was passed, check as userId
    if (!activeSub && businessId && !userId) {
      activeSub = await subscriptionRepository.findActiveSubscription(undefined, businessId);
    }

    if (!activeSub) {
      return {
        isPro: false,
        status: SubscriptionStatus.ACTIVE,
        plan: {
          code: 'FREE',
          name: 'Free Forever',
          price: 0,
          currency: 'INR',
          billingInterval: 'free',
        },
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        features: [
          '5 GST Invoices / month',
          'Daily Morning Suvichar poster',
          'Basic Khata ledger (up to 20 customers)',
          'Standard UPI QR standee',
        ],
        limits: {
          invoices: 5,
          posters: 10,
          aiCredits: 20,
        },
      };
    }

    return {
      id: activeSub.id,
      isPro: true,
      status: activeSub.status,
      plan: {
        id: activeSub.plan.id,
        code: activeSub.plan.code,
        name: activeSub.plan.name,
        price: activeSub.plan.price,
        currency: activeSub.plan.currency,
        billingInterval: activeSub.plan.billingInterval || activeSub.plan.billingCycle,
      },
      startDate: activeSub.startDate,
      currentPeriodStart: activeSub.currentPeriodStart || activeSub.startDate,
      currentPeriodEnd: activeSub.currentPeriodEnd || activeSub.expiryDate,
      expiryDate: activeSub.expiryDate,
      cancelAtPeriodEnd: activeSub.cancelAtPeriodEnd,
      autoRenew: activeSub.autoRenew,
      features: activeSub.plan.features,
      limits: activeSub.plan.limits,
    };
  }

  /**
   * Backwards-compatible alias for getActiveSubscription
   */
  async getActiveSubscription(businessId?: string, userId?: string) {
    return this.getCurrentSubscription(businessId, userId);
  }

  /**
   * Alias for initiateSubscription / createPaymentOrder
   */
  async initiateSubscription(
    businessIdOrUserId: string | undefined,
    userIdOrBusinessId?: string,
    planCode: string = 'pro_monthly',
    gateway?: string
  ) {
    const firstIsUser = businessIdOrUserId ? await prisma.user.findUnique({ where: { id: businessIdOrUserId } }) : null;
    const userId = firstIsUser ? businessIdOrUserId! : userIdOrBusinessId!;
    const businessId = firstIsUser ? userIdOrBusinessId : businessIdOrUserId;
    return this.createPaymentOrder(userId, businessId, planCode, gateway);
  }

  /**
   * Creates a provider checkout order
   */
  async createPaymentOrder(
    userId: string,
    businessId?: string,
    planCode: string = 'pro_monthly',
    gateway?: string
  ) {
    if (!businessId) {
      const biz = await prisma.business.findFirst({ where: { ownerId: userId, status: 'ACTIVE' } });
      if (biz) {
        businessId = biz.id;
      } else {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const createdBiz = await prisma.business.create({
          data: {
            ownerId: userId,
            name: `${user?.name || 'Vyapar'}'s Business`,
            ownerName: user?.name || 'Owner',
            mobile: user?.mobile || '',
            category: 'General',
            address: 'Main Market',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
          },
        });
        businessId = createdBiz.id;
      }
    }

    const plan = await subscriptionRepository.findPlanByCode(planCode);
    if (!plan) {
      throw new Error(`Invalid plan code: "${planCode}". Plan not found.`);
    }

    if (plan.status !== 'active' && !plan.isActive) {
      throw new Error(`Plan "${plan.name}" is currently inactive.`);
    }

    // Verify database record exists for the plan to prevent nested connect failures
    const dbPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          ...(plan.id ? [{ id: plan.id }] : []),
          ...(plan.code ? [{ code: plan.code }] : []),
        ],
      },
    });

    if (!dbPlan) {
      throw new Error(
        `Subscription plan "${plan.name || planCode}" is not registered in the database. Please ensure subscription plans are seeded.`
      );
    }

    // Check if user already has an active subscription for this plan
    const activeSub = await subscriptionRepository.findActiveSubscription(businessId, userId);
    if (activeSub && activeSub.planId === dbPlan.id && !activeSub.cancelAtPeriodEnd) {
      const expiry = activeSub.currentPeriodEnd || activeSub.expiryDate;
      const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 7) {
        logger.info(`User already has active ${dbPlan.name} with ${daysLeft} days remaining.`);
      }
    }

    const receipt = `rcpt_${Date.now()}_${userId.substring(0, 4)}`;
    const order = await paymentService.createOrder(
      {
        amount: dbPlan.price,
        currency: dbPlan.currency,
        receipt,
        notes: {
          userId,
          businessId: businessId || '',
          planCode: dbPlan.code,
        },
      },
      gateway
    );

    // Save initial transaction state in DB (PENDING / CREATED)
    const tx = await subscriptionRepository.createTransaction({
      orderId: order.orderId,
      paymentId: `pending_${order.orderId}`,
      providerOrderId: order.orderId,
      user: { connect: { id: userId } },
      business: { connect: { id: businessId } },
      plan: { connect: { id: dbPlan.id } },
      amount: dbPlan.price,
      currency: dbPlan.currency,
      paymentMethod: PaymentMethod.UPI,
      gateway: (gateway?.toUpperCase() as PaymentGateway) || PaymentGateway.RAZORPAY,
      status: PaymentStatus.PENDING,
    });

    return {
      orderId: order.orderId,
      amount: order.amount, // in paise for frontend SDK
      currency: order.currency,
      keyId: order.keyId,
      planCode: plan.code,
      planName: dbPlan.name,
      transactionId: tx.id,
      plan: {
        code: plan.code,
        name: plan.name,
        price: plan.price,
      },
    };
  }

  /**
   * Cryptographically verifies payment and idempotently activates Pro subscription
   */
  async verifyAndActivateSubscription(
    userId: string,
    businessId: string | undefined,
    params: {
      orderId: string;
      paymentId: string;
      signature?: string;
      planCode?: string;
    }
  ) {
    const { orderId, paymentId, signature } = params;

    let targetBusinessId = businessId;
    if (!targetBusinessId) {
      const biz = await prisma.business.findFirst({ where: { ownerId: userId, status: 'ACTIVE' } });
      if (biz) targetBusinessId = biz.id;
    }
    if (!targetBusinessId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const createdBiz = await prisma.business.create({
        data: {
          ownerId: userId,
          name: `${user?.name || 'Vyapar'}'s Business`,
          ownerName: user?.name || 'Owner',
          mobile: user?.mobile || '',
          category: 'General',
          address: 'Main Market',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      });
      targetBusinessId = createdBiz.id;
    }

    // 1. Idempotency Check: Check if transaction already verified & captured
    const existingTx = await subscriptionRepository.findTransactionByOrderId(orderId);
    if (
      existingTx &&
      (existingTx.status === PaymentStatus.CAPTURED || existingTx.status === PaymentStatus.SUCCESS)
    ) {
      logger.info(`Idempotent verify request for order ${orderId}; returning existing subscription.`);
      const currentSub = await this.getCurrentSubscription(businessId, userId);
      return currentSub;
    }

    // 2. Cryptographic signature verification with payment provider
    const verification = await paymentService.verifyPayment({
      orderId,
      paymentId,
      signature,
    });

    if (!verification.isValid) {
      if (existingTx) {
        await subscriptionRepository.updateTransactionStatus(existingTx.id, {
          status: PaymentStatus.FAILED,
          failureReason: verification.error || 'Payment signature mismatch',
        });
      }
      throw new Error(`Payment verification failed: ${verification.error || 'Invalid signature'}`);
    }

    // 3. Resolve plan
    let plan = null;
    if (params.planCode) {
      plan = await subscriptionRepository.findPlanByCode(params.planCode);
    }
    if (!plan && existingTx?.planId) {
      plan = await subscriptionRepository.findPlanById(existingTx.planId);
    }
    if (!plan) {
      plan = await subscriptionRepository.findPlanByCode('pro_monthly');
    }
    if (!plan) {
      throw new Error('Associated subscription plan not found');
    }

    // Verify database record exists for the plan to prevent nested connect failures
    const dbPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          ...(plan.id ? [{ id: plan.id }] : []),
          ...(plan.code ? [{ code: plan.code }] : []),
        ],
      },
    });

    if (!dbPlan) {
      throw new Error(
        `Associated subscription plan "${plan.name || params.planCode || 'pro_monthly'}" was not found in the database. Please ensure subscription plans are seeded.`
      );
    }

    // 4. Calculate subscription period
    const durationDays = dbPlan.durationDays || (dbPlan.billingCycle === 'yearly' || dbPlan.billingInterval === 'yearly' ? 365 : 30);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 5. Execute activation in atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate previous active subscriptions for this business/user
      await tx.subscription.updateMany({
        where: {
          OR: [{ userId }, { businessId: targetBusinessId }],
          status: SubscriptionStatus.ACTIVE,
        },
        data: {
          status: SubscriptionStatus.EXPIRED,
          endedAt: now,
        },
      });

      // Create new active subscription
      const newSub = await tx.subscription.create({
        data: {
          user: { connect: { id: userId } },
          business: { connect: { id: targetBusinessId } },
          plan: { connect: { id: dbPlan.id } },
          amount: dbPlan.price,
          currency: dbPlan.currency,
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          expiryDate: periodEnd,
          cancelAtPeriodEnd: false,
          autoRenew: true,
          paymentProvider: verification.gateway,
          providerSubscriptionId: paymentId,
        },
        include: { plan: true },
      });

      // Mark User as Pro
      await tx.user.update({
        where: { id: userId },
        data: { isPro: true },
      });

      // Update payment transaction status to CAPTURED / SUCCESS
      if (existingTx) {
        await tx.paymentTransaction.update({
          where: { id: existingTx.id },
          data: {
            paymentId,
            providerPaymentId: paymentId,
            providerSignature: signature,
            status: PaymentStatus.CAPTURED,
            subscriptionId: newSub.id,
            paidAt: now,
            maskedInstrument: verification.maskedInstrument || 'UPI: vyapari@okhdfcbank',
          },
        });
      } else {
        await tx.paymentTransaction.create({
          data: {
            orderId,
            paymentId,
            providerOrderId: orderId,
            providerPaymentId: paymentId,
            providerSignature: signature,
            user: { connect: { id: userId } },
            business: { connect: { id: targetBusinessId } },
            subscription: { connect: { id: newSub.id } },
            plan: { connect: { id: dbPlan.id } },
            amount: dbPlan.price,
            currency: dbPlan.currency,
            status: PaymentStatus.CAPTURED,
            paymentMethod: verification.method,
            maskedInstrument: verification.maskedInstrument || 'UPI: vyapari@okhdfcbank',
            gateway: verification.gateway,
            paidAt: now,
          },
        });
      }

      // Record AuditLog
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'SUBSCRIPTION_ACTIVATED',
          entity: 'Subscription',
          entityId: newSub.id,
          metadata: {
            planCode: dbPlan.code,
            amount: dbPlan.price,
            orderId,
            paymentId,
            durationDays,
          },
        },
      });

      return newSub;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    return {
      id: result.id,
      isPro: true,
      status: result.status,
      plan: {
        code: result.plan.code,
        name: result.plan.name,
        price: result.plan.price,
        currency: result.plan.currency,
      },
      currentPeriodStart: result.currentPeriodStart,
      currentPeriodEnd: result.currentPeriodEnd,
      expiryDate: result.expiryDate,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
    };
  }

  /**
   * Directly activates Pro subscription for a user and business
   */
  async directActivateSubscription(
    userId: string,
    businessId: string | undefined,
    planCode: string = 'pro_monthly'
  ) {
    let targetBusinessId = businessId;
    if (!targetBusinessId) {
      const biz = await prisma.business.findFirst({ where: { ownerId: userId, status: 'ACTIVE' } });
      if (biz) targetBusinessId = biz.id;
    }
    if (!targetBusinessId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const createdBiz = await prisma.business.create({
        data: {
          ownerId: userId,
          name: `${user?.name || 'Vyapar'}'s Business`,
          ownerName: user?.name || 'Owner',
          mobile: user?.mobile || '',
          category: 'General',
          address: 'Main Market',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
      });
      targetBusinessId = createdBiz.id;
    }

    let plan = await subscriptionRepository.findPlanByCode(planCode);
    if (!plan) {
      plan = await subscriptionRepository.findPlanByCode('pro_monthly');
    }
    if (!plan) {
      throw new Error(`Plan "${planCode}" not found.`);
    }

    const durationDays = plan.durationDays || (plan.billingCycle === 'yearly' || plan.billingInterval === 'yearly' ? 365 : 30);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: {
          OR: [{ userId }, { businessId: targetBusinessId }],
          status: SubscriptionStatus.ACTIVE,
        },
        data: {
          status: SubscriptionStatus.EXPIRED,
          endedAt: now,
        },
      });

      const newSub = await tx.subscription.create({
        data: {
          user: { connect: { id: userId } },
          business: { connect: { id: targetBusinessId } },
          plan: { connect: { id: plan.id } },
          amount: plan.price,
          currency: plan.currency,
          status: SubscriptionStatus.ACTIVE,
          startDate: now,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          expiryDate: periodEnd,
          cancelAtPeriodEnd: false,
          autoRenew: true,
          paymentProvider: PaymentGateway.MANUAL,
          providerSubscriptionId: `act_${Date.now()}`,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { isPro: true },
      });

      return newSub;
    });

    return {
      id: result.id,
      isPro: true,
      status: result.status,
      plan: {
        code: plan.code,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
      },
      currentPeriodStart: result.currentPeriodStart,
      currentPeriodEnd: result.currentPeriodEnd,
      expiryDate: result.expiryDate,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
    };
  }

  /**
   * Cancel subscription (cancelAtPeriodEnd = true)
   * User retains Pro access until currentPeriodEnd.
   */
  async cancelSubscription(userId: string, businessId?: string, reason?: string) {
    if (businessId) {
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: userId },
      });
      if (!business) {
        throw new Error('Unauthorized: You do not have permission to manage this business subscription.');
      }
    }

    const activeSub = await subscriptionRepository.findActiveSubscription(businessId, userId);
    if (!activeSub) {
      throw new Error('No active subscription found to cancel.');
    }

    const updated = await prisma.subscription.update({
      where: { id: activeSub.id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        autoRenew: false,
      },
      include: { plan: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'SUBSCRIPTION_CANCELLED',
        entity: 'Subscription',
        entityId: updated.id,
        metadata: {
          reason: reason || 'User requested cancellation',
          cancelAtPeriodEnd: true,
          effectiveExpiryDate: updated.currentPeriodEnd || updated.expiryDate,
        },
      },
    });

    return {
      success: true,
      id: updated.id,
      cancelAtPeriodEnd: true,
      status: updated.status,
      currentPeriodEnd: updated.currentPeriodEnd || updated.expiryDate,
      message: 'Subscription will remain active until the end of your billing period.',
      subscription: {
        id: updated.id,
        status: updated.status,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: updated.currentPeriodEnd || updated.expiryDate,
      },
    };
  }

  /**
   * Reconciles expired subscriptions:
   * Sets expired status when currentPeriodEnd < now, resets user isPro flag.
   */
  async reconcileExpiredSubscriptions(targetUserId?: string): Promise<number> {
    const now = new Date();
    const whereClause: any = {
      status: SubscriptionStatus.ACTIVE,
      OR: [
        { currentPeriodEnd: { lt: now } },
        { expiryDate: { lt: now } },
      ],
    };
    if (targetUserId) {
      whereClause.userId = targetUserId;
    }
    const expiredSubs = await prisma.subscription.findMany({
      where: whereClause,
      select: { id: true, userId: true, businessId: true },
    });

    if (expiredSubs.length === 0) return 0;

    for (const sub of expiredSubs) {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: SubscriptionStatus.EXPIRED,
            endedAt: now,
          },
        });

        // Check if user has any other active subscriptions
        const remainingActive = await tx.subscription.count({
          where: {
            userId: sub.userId,
            status: SubscriptionStatus.ACTIVE,
            OR: [{ currentPeriodEnd: { gte: now } }, { expiryDate: { gte: now } }],
          },
        });

        if (remainingActive === 0) {
          await tx.user.update({
            where: { id: sub.userId },
            data: { isPro: false },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: sub.userId,
            action: 'SUBSCRIPTION_EXPIRED',
            entity: 'Subscription',
            entityId: sub.id,
            metadata: { reconciledAt: now.toISOString() },
          },
        });
      });
    }

    logger.info(`Reconciled ${expiredSubs.length} expired subscriptions.`);
    return expiredSubs.length;
  }

  /**
   * User's payment history
   */
  async getPaymentHistory(userId: string, businessId?: string, page = 1, limit = 10, status?: string) {
    return subscriptionRepository.listPaymentsByUser({
      userId,
      businessId,
      page,
      limit,
      status,
    });
  }

  /**
   * User's subscription history
   */
  async getSubscriptionHistory(userId: string, businessId?: string, page = 1, limit = 10) {
    return subscriptionRepository.listSubscriptionsByUser({
      userId,
      businessId,
      page,
      limit,
    });
  }
}

export const subscriptionService = new SubscriptionService();
