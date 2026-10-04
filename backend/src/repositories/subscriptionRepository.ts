/**
 * BRANDX — Subscription & Payment Repository Layer
 */

import { prisma } from '../config/database.js';
import {
  SubscriptionPlan,
  Subscription,
  PaymentTransaction,
  RefundRecord,
  WebhookEvent,
  Prisma,
  SubscriptionStatus,
  PaymentStatus,
} from '@prisma/client';

const DEFAULT_SYSTEM_PLANS: any[] = [
  {
    id: 'plan_free_default',
    name: 'Free Forever',
    code: 'free',
    description: 'Basic invoicing and daily poster access for small shops',
    price: 0,
    originalPrice: 0,
    currency: 'INR',
    billingCycle: 'free',
    billingInterval: 'free',
    durationDays: 3650,
    tagline: 'Ideal for new shopkeepers starting digital journey',
    isPopular: false,
    isActive: true,
    features: ['5 GST Invoices / month', 'Daily Morning Suvichar poster', 'Basic Khata ledger', 'Standard UPI QR standee'],
    limits: { invoices: 5, posters: 10, aiCredits: 10 },
    status: 'active',
  },
  {
    id: 'plan_monthly_default',
    name: 'Pro Monthly',
    code: 'pro_monthly',
    description: 'Full business acceleration for busy shopkeepers',
    price: 349,
    originalPrice: 499,
    currency: 'INR',
    billingCycle: 'monthly',
    billingInterval: 'monthly',
    durationDays: 30,
    tagline: 'Best for growing vyaparis & retail stores',
    isPopular: true,
    isActive: true,
    features: ['Unlimited GST Invoices & Estimates', '365 Days Festival & Daily Status Marketing', 'AI Copilot & Voice-to-Bill assistant', 'Digital Dukaan online catalog', 'Remove BrandX watermark'],
    limits: { invoices: -1, aiCredits: 500 },
    status: 'active',
  },
  {
    id: 'plan_yearly_default',
    name: 'Pro Annual',
    code: 'pro_yearly',
    description: 'Maximum savings — Save ₹1,189 annually',
    price: 2999,
    originalPrice: 4188,
    currency: 'INR',
    billingCycle: 'yearly',
    billingInterval: 'yearly',
    durationDays: 365,
    tagline: 'Maximum savings — Save ₹1,189 annually',
    isPopular: false,
    isActive: true,
    features: ['All Pro Monthly features for 365 days', 'Free NFC Digital Smart Card setup', 'Priority WhatsApp & Call support', 'Export Excel reports & CA audit summary'],
    limits: { invoices: -1, aiCredits: 2000 },
    status: 'active',
  },
];

export class SubscriptionRepository {
  /**
   * List active plans for public display
   */
  async listPlans(): Promise<SubscriptionPlan[]> {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: {
          OR: [{ status: 'active' }, { isActive: true }],
        },
        orderBy: { price: 'asc' },
      });
      if (plans.length > 0) return plans;
    } catch {
      // Fall through to queryRaw / default
    }

    const raw = (await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, code, description, "priceMonthly" as price, "priceMonthly", "priceYearly",
              "billingInterval", "durationDays", "isActive", features, "createdAt", "updatedAt"
       FROM "SubscriptionPlan" WHERE "isActive" = true`
    ).catch(() => [])) || [];

    if (raw.length > 0) {
      return raw.map((r: any) => ({
        ...r,
        price: Number(r.priceMonthly ?? r.price ?? 0),
        originalPrice: null,
        currency: 'INR',
        billingCycle: r.billingInterval?.toLowerCase() || 'monthly',
        tagline: null,
        isPopular: false,
        limits: { invoices: -1, aiCredits: 100 },
        status: 'active',
      }));
    }

    return DEFAULT_SYSTEM_PLANS;
  }

  /**
   * List all plans (admin)
   */
  async listAllPlans(): Promise<SubscriptionPlan[]> {
    let dbPlans: any[] = [];
    try {
      dbPlans = await prisma.subscriptionPlan.findMany({
        orderBy: { price: 'asc' },
      });
    } catch {
      const raw = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, code, description, "priceMonthly" as price, "priceMonthly", "priceYearly",
                "billingInterval", "durationDays", "isActive", features, "createdAt", "updatedAt"
         FROM "SubscriptionPlan"`
      ).catch(() => [])) || [];

      if (raw.length > 0) {
        dbPlans = raw.map((r: any) => ({
          ...r,
          price: Number(r.priceMonthly ?? r.price ?? 0),
          originalPrice: null,
          currency: 'INR',
          billingCycle: r.billingInterval?.toLowerCase() || 'monthly',
          tagline: null,
          isPopular: false,
          limits: { invoices: -1, aiCredits: 100 },
          status: 'active',
        }));
      }
    }

    // Merge default system plans so standard plans (free, pro_monthly, pro_yearly) are always present
    const existingCodes = new Set(dbPlans.map((p) => p.code.toLowerCase()));
    const missingDefaults = DEFAULT_SYSTEM_PLANS.filter((p) => !existingCodes.has(p.code.toLowerCase()));
    return [...dbPlans, ...missingDefaults];
  }

  /**
   * Find plan by code (case-insensitive fallback)
   */
  async findPlanByCode(code: string): Promise<SubscriptionPlan | null> {
    try {
      const direct = await prisma.subscriptionPlan.findUnique({
        where: { code },
      });
      if (direct) return direct;

      const lower = code.toLowerCase();
      const upper = code.toUpperCase();

      const found = await prisma.subscriptionPlan.findFirst({
        where: {
          OR: [{ code: lower }, { code: upper }],
        },
      });
      if (found) return found;
    } catch {
      const raw = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, code, description, "priceMonthly" as price, "priceMonthly", "priceYearly",
                "billingInterval", "durationDays", "isActive", features, "createdAt", "updatedAt"
         FROM "SubscriptionPlan" WHERE LOWER(code) = LOWER($1) LIMIT 1`,
        code
      ).catch(() => [])) || [];

      if (raw.length > 0) {
        const r = raw[0];
        return {
          ...r,
          price: Number(r.priceMonthly ?? r.price ?? 0),
          originalPrice: null,
          currency: 'INR',
          billingCycle: r.billingInterval?.toLowerCase() || 'monthly',
          tagline: null,
          isPopular: false,
          limits: { invoices: -1, aiCredits: 100 },
          status: 'active',
        };
      }
    }

    const fallback = DEFAULT_SYSTEM_PLANS.find(
      (p) => p.code.toLowerCase() === code.toLowerCase()
    );
    return fallback || null;
  }

  /**
   * Find plan by ID
   */
  async findPlanById(id: string): Promise<SubscriptionPlan | null> {
    try {
      const direct = await prisma.subscriptionPlan.findUnique({ where: { id } });
      if (direct) return direct;
    } catch {
      const raw = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, name, code, description, "priceMonthly" as price, "priceMonthly", "priceYearly",
                "billingInterval", "durationDays", "isActive", features, "createdAt", "updatedAt"
         FROM "SubscriptionPlan" WHERE id = $1 LIMIT 1`,
        id
      ).catch(() => [])) || [];

      if (raw.length > 0) {
        const r = raw[0];
        return {
          ...r,
          price: Number(r.priceMonthly ?? r.price ?? 0),
          originalPrice: null,
          currency: 'INR',
          billingCycle: r.billingInterval?.toLowerCase() || 'monthly',
          tagline: null,
          isPopular: false,
          limits: { invoices: -1, aiCredits: 100 },
          status: 'active',
        };
      }
    }

    const fallback = DEFAULT_SYSTEM_PLANS.find((p) => p.id === id);
    return fallback || null;
  }

  /**
   * Create new plan (admin)
   */
  async createPlan(data: Prisma.SubscriptionPlanCreateInput): Promise<SubscriptionPlan> {
    return prisma.subscriptionPlan.create({ data });
  }

  /**
   * Update plan (admin)
   */
  async updatePlan(id: string, data: Prisma.SubscriptionPlanUpdateInput): Promise<SubscriptionPlan> {
    return prisma.subscriptionPlan.update({ where: { id }, data });
  }

  /**
   * Find active subscription for user or business
   */
  async findActiveSubscription(
    businessId?: string,
    userId?: string
  ): Promise<(Subscription & { plan: SubscriptionPlan }) | null> {
    const now = new Date();
    const orConditions: Prisma.SubscriptionWhereInput[] = [];

    if (businessId) {
      orConditions.push({ businessId });
    }
    if (userId) {
      orConditions.push({ userId });
    }

    if (orConditions.length === 0) return null;

    try {
      return await prisma.subscription.findFirst({
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.TRIALING] },
          AND: [
            { OR: orConditions },
            {
              OR: [
                { currentPeriodEnd: { gte: now } },
                { expiryDate: { gte: now } },
              ],
            },
          ],
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT s.id, s."userId", s."businessId", s."planId", s."planCode", s."billingCycle",
                s."amountPaid" as amount, s."startDate", s."expiryDate", s."currentPeriodStart",
                s."currentPeriodEnd", s."cancelAtPeriodEnd", s.status, s."createdAt", s."updatedAt"
         FROM "Subscription" s
         WHERE (s."businessId" = $1 OR s."userId" = $2)
           AND s.status IN ('ACTIVE', 'TRIAL', 'TRIALING')
           AND (s."currentPeriodEnd" >= NOW() OR s."expiryDate" >= NOW())
         ORDER BY s."createdAt" DESC LIMIT 1`,
        businessId || null,
        userId || null
      ).catch(() => [])) || [];
      if (rows.length > 0) {
        const sub = rows[0];
        const plan = (await this.findPlanById(sub.planId)) || (await this.findPlanByCode(sub.planCode));
        return {
          ...sub,
          currency: 'INR',
          autoRenew: true,
          paymentProvider: 'RAZORPAY',
          providerCustomerId: null,
          providerSubscriptionId: null,
          cancelledAt: null,
          endedAt: null,
          plan: plan!,
        } as any;
      }
      return null;
    }
  }

  /**
   * Deactivate previous active subscriptions for business/user to enforce uniqueness
   */
  async deactivatePreviousSubscriptions(userId: string, businessId: string): Promise<number> {
    const res = await prisma.subscription.updateMany({
      where: {
        OR: [{ userId }, { businessId }],
        status: SubscriptionStatus.ACTIVE,
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
        endedAt: new Date(),
      },
    });
    return res.count;
  }

  /**
   * Create a payment transaction record with safe relation verification
   */
  async createTransaction(data: Prisma.PaymentTransactionCreateInput): Promise<PaymentTransaction> {
    if (data.plan?.connect) {
      const connectId = data.plan.connect.id;
      const connectCode = (data.plan.connect as any).code;

      const planExists = await prisma.subscriptionPlan.findFirst({
        where: {
          OR: [
            ...(connectId ? [{ id: connectId }] : []),
            ...(connectCode ? [{ code: connectCode }] : []),
          ],
        },
      });

      if (!planExists) {
        throw new Error(
          `Cannot record payment transaction: Subscription plan record (id: "${connectId || 'unknown'}") was not found in database.`
        );
      }
    }

    return prisma.paymentTransaction.create({ data });
  }

  /**
   * Find transaction by order ID
   */
  async findTransactionByOrderId(orderId: string): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findUnique({
      where: { orderId },
      include: { user: true, business: true, plan: true },
    });
  }

  /**
   * Find transaction by payment ID
   */
  async findTransactionByPaymentId(paymentId: string): Promise<PaymentTransaction | null> {
    return prisma.paymentTransaction.findUnique({
      where: { paymentId },
      include: { user: true, business: true, plan: true },
    });
  }

  /**
   * Update transaction status and metadata
   */
  async updateTransactionStatus(
    id: string,
    data: Prisma.PaymentTransactionUpdateInput
  ): Promise<PaymentTransaction> {
    return prisma.paymentTransaction.update({
      where: { id },
      data,
    });
  }

  /**
   * User/Business payment history with pagination
   */
  async listPaymentsByUser(params: {
    userId: string;
    businessId?: string;
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ transactions: any[]; total: number }> {
    const { userId, businessId, page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentTransactionWhereInput = {
      userId,
      ...(businessId ? { businessId } : {}),
    };

    if (status && status !== 'all') {
      where.status = status.toUpperCase() as any;
    }

    let transactions: any[] = [];
    let total = 0;
    try {
      const res = await Promise.all([
        prisma.paymentTransaction.findMany({
          where,
          include: {
            plan: { select: { id: true, name: true, code: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.paymentTransaction.count({ where }),
      ]);
      transactions = res[0];
      total = res[1];
    } catch {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT pt.id, pt."orderId", pt."paymentId", pt."userId", pt."businessId",
                pt."subscriptionId", pt."planId", pt.gateway, pt.amount, pt.currency,
                pt.status, pt.method, pt."upiVpa", pt."bankRefNumber", pt."errorMessage",
                pt."createdAt", pt."updatedAt", pt."providerOrderId", pt."providerPaymentId",
                pt."providerSignature", pt.description, pt.metadata, pt."paidAt",
                p.name as "planName", p.code as "planCode"
         FROM "PaymentTransaction" pt
         LEFT JOIN "SubscriptionPlan" p ON pt."planId" = p.id
         WHERE (pt."userId" = $1 OR pt."businessId" = $2)
         ORDER BY pt."createdAt" DESC
         LIMIT $3 OFFSET $4`,
        userId,
        businessId || null,
        limit,
        skip
      ).catch(() => [])) || [];

      const countRes = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM "PaymentTransaction" WHERE ("userId" = $1 OR "businessId" = $2)`,
        userId,
        businessId || null
      ).catch(() => [{ count: 0 }])) || [{ count: 0 }];

      total = Number(countRes[0]?.count) || rows.length;
      transactions = rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount || 0),
        paymentMethod: r.method || 'UPI',
        maskedInstrument: r.upiVpa || r.bankRefNumber || null,
        plan: r.planId ? { id: r.planId, name: r.planName, code: r.planCode } : null,
      }));
    }

    return { transactions, total };
  }

  /**
   * User/Business subscription history
   */
  async listSubscriptionsByUser(params: {
    userId: string;
    businessId?: string;
    page: number;
    limit: number;
  }): Promise<{ subscriptions: any[]; total: number }> {
    const { userId, businessId, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {
      userId,
      ...(businessId ? { businessId } : {}),
    };

    let subscriptions: any[] = [];
    let total = 0;
    try {
      const res = await Promise.all([
        prisma.subscription.findMany({
          where,
          include: {
            plan: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.subscription.count({ where }),
      ]);
      subscriptions = res[0];
      total = res[1];
    } catch {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT s.id, s."userId", s."businessId", s."planId", s."planCode", s."billingCycle",
                s."amountPaid" as amount, s."startDate", s."expiryDate", s."currentPeriodStart",
                s."currentPeriodEnd", s."cancelAtPeriodEnd", s.status, s."createdAt", s."updatedAt",
                p.name as "planName", p.code as "planCodeDirect", p."priceMonthly", p."priceYearly"
         FROM "Subscription" s
         LEFT JOIN "SubscriptionPlan" p ON s."planId" = p.id
         WHERE (s."userId" = $1 OR s."businessId" = $2)
         ORDER BY s."createdAt" DESC
         LIMIT $3 OFFSET $4`,
        userId,
        businessId || null,
        limit,
        skip
      ).catch(() => [])) || [];

      const countRes = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM "Subscription" WHERE ("userId" = $1 OR "businessId" = $2)`,
        userId,
        businessId || null
      ).catch(() => [{ count: 0 }])) || [{ count: 0 }];

      total = Number(countRes[0]?.count) || rows.length;
      subscriptions = rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount || 0),
        plan: {
          id: r.planId,
          name: r.planName || r.planCode,
          code: r.planCodeDirect || r.planCode,
          price: Number(r.priceMonthly || r.priceYearly || 0),
        },
      }));
    }

    return { subscriptions, total };
  }

  /**
   * Webhook event deduplication (Idempotency)
   */
  async findWebhookEvent(eventId: string): Promise<WebhookEvent | null> {
    return prisma.webhookEvent.findUnique({ where: { eventId } });
  }

  async recordWebhookEvent(data: {
    eventId: string;
    provider: string;
    eventType: string;
    payload: any;
    status?: string;
    errorMessage?: string;
  }): Promise<WebhookEvent> {
    return prisma.webhookEvent.create({
      data: {
        eventId: data.eventId,
        provider: data.provider,
        eventType: data.eventType,
        payload: data.payload,
        status: data.status || 'PROCESSED',
        errorMessage: data.errorMessage,
      },
    });
  }

  async updateWebhookEventStatus(
    eventId: string,
    status: string,
    errorMessage?: string
  ): Promise<WebhookEvent> {
    return prisma.webhookEvent.update({
      where: { eventId },
      data: {
        status,
        errorMessage,
        processedAt: status === 'PROCESSED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Create refund record
   */
  async createRefund(data: Prisma.RefundRecordCreateInput): Promise<RefundRecord> {
    return prisma.refundRecord.create({ data });
  }

  /**
   * List subscribers (admin) with search, filter, pagination
   */
  async listSubscribersAdmin(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    planCode?: string;
  }): Promise<{ subscribers: any[]; total: number }> {
    const { page, limit, search, status, planCode } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as any;
    }

    if (planCode && planCode !== 'all') {
      where.plan = { code: planCode };
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { mobile: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let subscribers: any[] = [];
    let total = 0;
    try {
      const res = await Promise.all([
        prisma.subscription.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, mobile: true, email: true } },
            business: { select: { id: true, name: true, city: true, state: true, gstin: true } },
            plan: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.subscription.count({ where }),
      ]);
      subscribers = res[0];
      total = res[1];
    } catch {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT s.id, s."userId", s."businessId", s."planId", s."planCode", s."billingCycle",
                s."amountPaid" as amount, s."startDate", s."expiryDate", s."currentPeriodStart",
                s."currentPeriodEnd", s."cancelAtPeriodEnd", s.status, s."createdAt", s."updatedAt",
                u.name as "userName", u.mobile as "userMobile", u.email as "userEmail",
                b.name as "bizName", b.city as "bizCity", b.state as "bizState", b.gstin as "bizGstin",
                p.name as "planName", p.code as "planCodeDirect", p."priceMonthly", p."priceYearly"
         FROM "Subscription" s
         LEFT JOIN "User" u ON s."userId" = u.id
         LEFT JOIN "Business" b ON s."businessId" = b.id
         LEFT JOIN "SubscriptionPlan" p ON s."planId" = p.id
         ORDER BY s."createdAt" DESC
         LIMIT $1 OFFSET $2`,
        limit,
        skip
      ).catch(() => [])) || [];

      const countRes = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM "Subscription"`
      ).catch(() => [{ count: 0 }])) || [{ count: 0 }];

      total = Number(countRes[0]?.count) || rows.length;
      subscribers = rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount || 0),
        user: { id: r.userId, name: r.userName, mobile: r.userMobile, email: r.userEmail },
        business: { id: r.businessId, name: r.bizName, city: r.bizCity, state: r.bizState, gstin: r.bizGstin },
        plan: {
          id: r.planId,
          name: r.planName || r.planCode,
          code: r.planCodeDirect || r.planCode,
          price: Number(r.priceMonthly || r.priceYearly || 0),
        },
      }));
    }

    return { subscribers, total };
  }

  /**
   * List transactions (admin)
   */
  async listTransactionsAdmin(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    gateway?: string;
  }): Promise<{ transactions: any[]; total: number }> {
    const { page, limit, search, status, gateway } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentTransactionWhereInput = {};
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as any;
    }
    if (gateway && gateway !== 'all') {
      where.gateway = gateway.toUpperCase() as any;
    }
    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { paymentId: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { mobile: { contains: search, mode: 'insensitive' } } },
        { business: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let transactions: any[] = [];
    let total = 0;
    try {
      const res = await Promise.all([
        prisma.paymentTransaction.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, mobile: true, email: true } },
            business: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true, code: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.paymentTransaction.count({ where }),
      ]);
      transactions = res[0];
      total = res[1];
    } catch {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT pt.id, pt."orderId", pt."paymentId", pt."userId", pt."businessId",
                pt."subscriptionId", pt."planId", pt.gateway, pt.amount, pt.currency,
                pt.status, pt.method, pt."upiVpa", pt."bankRefNumber", pt."errorMessage",
                pt."createdAt", pt."updatedAt", pt."providerOrderId", pt."providerPaymentId",
                pt."providerSignature", pt.description, pt.metadata, pt."paidAt",
                u.name as "userName", u.mobile as "userMobile", u.email as "userEmail",
                b.name as "bizName",
                p.name as "planName", p.code as "planCode"
         FROM "PaymentTransaction" pt
         LEFT JOIN "User" u ON pt."userId" = u.id
         LEFT JOIN "Business" b ON pt."businessId" = b.id
         LEFT JOIN "SubscriptionPlan" p ON pt."planId" = p.id
         ORDER BY pt."createdAt" DESC
         LIMIT $1 OFFSET $2`,
        limit,
        skip
      ).catch(() => [])) || [];

      const countRes = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM "PaymentTransaction"`
      ).catch(() => [{ count: 0 }])) || [{ count: 0 }];

      total = Number(countRes[0]?.count) || rows.length;
      transactions = rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount || 0),
        taxAmount: 0,
        gatewayFee: 0,
        netAmount: Number(r.amount || 0),
        paymentMethod: r.method || 'UPI',
        maskedInstrument: r.upiVpa || r.bankRefNumber || null,
        user: { id: r.userId, name: r.userName, mobile: r.userMobile, email: r.userEmail },
        business: { id: r.businessId, name: r.bizName },
        plan: r.planId ? { id: r.planId, name: r.planName, code: r.planCode } : null,
      }));
    }

    return { transactions, total };
  }

  /**
   * List refunds (admin)
   */
  async listRefundsAdmin(params: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ refunds: any[]; total: number }> {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.RefundRecordWhereInput = {};
    if (status && status !== 'all') {
      where.status = status.toUpperCase() as any;
    }

    let refunds: any[] = [];
    let total = 0;
    try {
      const res = await Promise.all([
        prisma.refundRecord.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, mobile: true } },
            business: { select: { id: true, name: true } },
            transaction: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.refundRecord.count({ where }),
      ]);
      refunds = res[0];
      total = res[1];
    } catch {
      const rows = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT r.id, r."transactionId", r."userId", r."businessId", r.amount,
                r.reason, r.status, r."gatewayRefundId", r."processedAt", r."adminNote",
                r."createdAt", r."updatedAt", r."providerRefundId", r.metadata,
                u.name as "userName", u.mobile as "userMobile",
                b.name as "bizName"
         FROM "RefundRecord" r
         LEFT JOIN "User" u ON r."userId" = u.id
         LEFT JOIN "Business" b ON r."businessId" = b.id
         ORDER BY r."createdAt" DESC
         LIMIT $1 OFFSET $2`,
        limit,
        skip
      ).catch(() => [])) || [];

      const countRes = (await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM "RefundRecord"`
      ).catch(() => [{ count: 0 }])) || [{ count: 0 }];

      total = Number(countRes[0]?.count) || rows.length;
      refunds = rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount || 0),
        currency: 'INR',
        adminNotes: r.adminNote || null,
        user: { id: r.userId, name: r.userName, mobile: r.userMobile },
        business: { id: r.businessId, name: r.bizName },
      }));
    }

    return { refunds, total };
  }

  /**
   * Real database-backed revenue metrics summary
   */
  async getRevenueSummary(): Promise<{
    totalRevenue: number;
    currentMonthRevenue: number;
    previousMonthRevenue: number;
    totalCapturedTransactions: number;
    totalFailedTransactions: number;
    activeSubscribers: number;
    activeProSubscribers: number;
    monthlySubscribers: number;
    yearlySubscribers: number;
    totalRefundsAmount: number;
    netRevenue: number;
  }> {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      allCaptured,
      currentMonthCaptured,
      previousMonthCaptured,
      failedTxCount,
      allRefunds,
      activeSubs,
    ] = await Promise.all([
      // Total captured revenue
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] } },
      }),
      // Current month captured revenue
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] },
          createdAt: { gte: startOfCurrentMonth },
        },
      }),
      // Previous month captured revenue
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] },
          createdAt: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
        },
      }),
      // Failed transactions
      prisma.paymentTransaction.count({
        where: { status: PaymentStatus.FAILED },
      }),
      // Total refunds
      prisma.refundRecord.aggregate({
        _sum: { amount: true },
      }),
      // Active subscriptions breakdown
      prisma.subscription
        .findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            OR: [{ currentPeriodEnd: { gte: now } }, { expiryDate: { gte: now } }],
          },
          include: { plan: true },
        })
        .catch(async () => {
          const raw = (await prisma.$queryRawUnsafe<any[]>(
            `SELECT s.id, s."planCode", s."billingCycle", s.status, s."amountPaid" as amount
             FROM "Subscription" s
             WHERE s.status = 'ACTIVE' AND (s."currentPeriodEnd" >= NOW() OR s."expiryDate" >= NOW())`
          ).catch(() => [])) || [];
          return raw.map((r) => ({
            ...r,
            plan: {
              billingCycle: r.billingCycle,
              billingInterval: r.billingCycle,
              code: r.planCode,
            },
          }));
        }),
    ]);

    const totalGross = allCaptured._sum.amount || 0;
    const currentMonthRevenue = currentMonthCaptured._sum.amount || 0;
    const previousMonthRevenue = previousMonthCaptured._sum.amount || 0;
    const totalRefunds = allRefunds._sum.amount || 0;
    const netRevenue = Math.max(0, totalGross - totalRefunds);

    let monthlyCount = 0;
    let yearlyCount = 0;
    for (const sub of activeSubs) {
      if (sub.plan?.billingCycle === 'yearly' || sub.plan?.billingInterval === 'yearly' || sub.plan?.code.includes('year')) {
        yearlyCount++;
      } else {
        monthlyCount++;
      }
    }

    return {
      totalRevenue: totalGross,
      currentMonthRevenue,
      previousMonthRevenue,
      totalCapturedTransactions: allCaptured._count?.id || 0,
      totalFailedTransactions: failedTxCount,
      activeSubscribers: activeSubs.length,
      activeProSubscribers: activeSubs.length,
      monthlySubscribers: monthlyCount,
      yearlySubscribers: yearlyCount,
      totalRefundsAmount: totalRefunds,
      netRevenue,
    };
  }
}

export const subscriptionRepository = new SubscriptionRepository();
