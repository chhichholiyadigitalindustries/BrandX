import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { subscriptionRepository } from '../repositories/subscriptionRepository.js';
import { paymentService } from '../payments/paymentService.js';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

export class WebhookService {
  /**
   * Process incoming webhook from payment gateway with cryptographic verification and idempotency
   */
  async processWebhook(params: {
    provider: string;
    payload: any;
    rawBody: string | Buffer;
    signature?: string;
    eventIdHeader?: string;
  }): Promise<{ status: string; eventId: string; message?: string }> {
    const { provider, payload, rawBody, signature, eventIdHeader } = params;

    // 1. Cryptographic Signature Verification
    const verification = paymentService.verifyWebhookSignature(provider, rawBody, signature);
    if (!verification.isValid) {
      logger.error(`Webhook signature verification failed for ${provider}`);
      const err: any = new Error(verification.error || 'Invalid webhook signature');
      err.status = 400;
      throw err;
    }

    // 2. Extract Event Identifier for Idempotency
    const eventType = payload.event || payload.type || 'unknown';
    const eventId =
      eventIdHeader ||
      payload.id ||
      payload.event_id ||
      `evt_${provider}_${payload.created_at || Date.now()}_${eventType}`;

    // 3. Check for Duplicate Webhook Execution (Idempotency Guard)
    const existingEvent = await subscriptionRepository.findWebhookEvent(eventId);
    if (existingEvent && existingEvent.status === 'PROCESSED') {
      logger.info(`Webhook event ${eventId} already processed, ignoring.`);
      return { status: 'already_processed', eventId, message: 'Event previously processed' };
    }

    if (!existingEvent) {
      await subscriptionRepository.recordWebhookEvent({
        eventId,
        provider,
        eventType,
        payload,
        status: 'PENDING',
      });
    }

    // 4. Process event
    try {
      await this.handleEvent(eventType, payload, provider);

      // Mark event as successfully processed
      await subscriptionRepository.updateWebhookEventStatus(eventId, 'PROCESSED');
      return { status: 'processed', eventId };
    } catch (err: any) {
      logger.error(`Failed to process webhook event ${eventId}: ${err.message}`, { error: err });
      await subscriptionRepository.updateWebhookEventStatus(eventId, 'FAILED', err.message);
      throw err;
    }
  }

  /**
   * Dispatches event to specialized handlers
   */
  private async handleEvent(eventType: string, payload: any, provider: string): Promise<void> {
    logger.info(`Handling webhook event: ${eventType} from ${provider}`);

    switch (eventType) {
      case 'payment.captured':
      case 'order.paid':
        await this.handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;

      case 'subscription.cancelled':
      case 'subscription.halted':
        await this.handleSubscriptionCancelled(payload);
        break;

      case 'refund.processed':
        await this.handleRefundProcessed(payload);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${eventType}`);
        break;
    }
  }

  /**
   * Handle payment.captured or order.paid
   */
  private async handlePaymentCaptured(payload: any): Promise<void> {
    const paymentEntity = payload.payload?.payment?.entity || payload.payment || {};
    const orderEntity = payload.payload?.order?.entity || payload.order || {};

    const orderId = paymentEntity.order_id || orderEntity.id;
    const paymentId = paymentEntity.id;

    if (!orderId) {
      logger.warn('Payment captured webhook missing order_id');
      return;
    }

    const txRecord = await subscriptionRepository.findTransactionByOrderId(orderId);
    if (!txRecord) {
      logger.warn(`No transaction found matching provider order ${orderId}`);
      return;
    }

    // If transaction already marked CAPTURED, no duplicate action needed
    if (txRecord.status === PaymentStatus.CAPTURED || txRecord.status === PaymentStatus.SUCCESS) {
      logger.info(`Transaction for order ${orderId} is already captured.`);
      return;
    }

    const userId = txRecord.userId;
    const businessId = txRecord.businessId;

    // Resolve plan
    const plan = txRecord.planId
      ? await subscriptionRepository.findPlanById(txRecord.planId)
      : await subscriptionRepository.findPlanByCode('pro_monthly');

    if (!plan) {
      logger.error(`Associated plan not found for captured order ${orderId}`);
      return;
    }

    const durationDays = plan.durationDays || (plan.billingInterval === 'YEARLY' ? 365 : 30);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Atomically activate subscription and update transaction
    await prisma.$transaction(async (tx) => {
      // Deactivate previous active subscriptions
      await tx.subscription.updateMany({
        where: {
          OR: [{ userId }, { businessId }],
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
          business: { connect: { id: businessId } },
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
          paymentProvider: txRecord.gateway,
          providerSubscriptionId: paymentId || orderId,
        },
      });

      // Update User isPro
      await tx.user.update({
        where: { id: userId },
        data: { isPro: true },
      });

      // Update PaymentTransaction
      await tx.paymentTransaction.update({
        where: { id: txRecord.id },
        data: {
          status: PaymentStatus.CAPTURED,
          providerPaymentId: paymentId || txRecord.providerPaymentId,
          paidAt: now,
          updatedAt: now,
        },
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'WEBHOOK_SUBSCRIPTION_ACTIVATED',
          entity: 'Subscription',
          entityId: newSub.id,
          metadata: {
            orderId,
            paymentId,
            planCode: plan.code,
            amount: plan.price,
          },
        },
      });
    });

    logger.info(`Successfully activated subscription via webhook for user ${userId}, order ${orderId}`);
  }

  /**
   * Handle payment.failed
   */
  private async handlePaymentFailed(payload: any): Promise<void> {
    const paymentEntity = payload.payload?.payment?.entity || payload.payment || {};
    const orderId = paymentEntity.order_id;
    const errorDescription = paymentEntity.error_description || 'Payment failed';

    if (!orderId) return;

    const txRecord = await subscriptionRepository.findTransactionByOrderId(orderId);
    if (txRecord && txRecord.status !== PaymentStatus.CAPTURED) {
      await prisma.paymentTransaction.update({
        where: { id: txRecord.id },
        data: {
          status: PaymentStatus.FAILED,
          description: errorDescription,
          updatedAt: new Date(),
        },
      });
      logger.info(`Updated transaction status to FAILED for order ${orderId}`);
    }
  }

  /**
   * Handle subscription cancellation from gateway
   */
  private async handleSubscriptionCancelled(payload: any): Promise<void> {
    const subEntity = payload.payload?.subscription?.entity || payload.subscription || {};
    const providerSubId = subEntity.id;

    if (!providerSubId) return;

    const existingSub = await prisma.subscription.findFirst({
      where: {
        providerSubscriptionId: providerSubId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          cancelAtPeriodEnd: true,
          cancelledAt: new Date(),
          autoRenew: false,
        },
      });
      logger.info(`Subscription ${existingSub.id} marked for cancellation at period end via webhook`);
    }
  }

  /**
   * Handle refund processed
   */
  private async handleRefundProcessed(payload: any): Promise<void> {
    const refundEntity = payload.payload?.refund?.entity || payload.refund || {};
    const paymentId = refundEntity.payment_id;
    const refundId = refundEntity.id;

    if (!paymentId) return;

    const txRecord = await prisma.paymentTransaction.findFirst({
      where: { providerPaymentId: paymentId },
    });

    if (txRecord) {
      await prisma.paymentTransaction.update({
        where: { id: txRecord.id },
        data: {
          status: PaymentStatus.REFUNDED,
          updatedAt: new Date(),
        },
      });

      if (refundId) {
        await prisma.refundRecord.updateMany({
          where: { providerRefundId: refundId },
          data: { status: 'PROCESSED' },
        });
      }

      logger.info(`Processed refund webhook for payment ${paymentId}`);
    }
  }
}

export const webhookService = new WebhookService();
