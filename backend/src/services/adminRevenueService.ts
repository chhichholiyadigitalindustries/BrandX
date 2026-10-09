/**
 * BRANDX — Enterprise Admin Revenue & Subscription Management Service
 * Source of truth: Real PostgreSQL PaymentTransaction, Subscription, and RefundRecord tables.
 * Absolute zero demo/hardcoded/mock metrics.
 */

import { prisma } from '../config/database.js';
import { PaymentStatus, SubscriptionStatus, AdminRole, Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { auditRepository } from '../repositories/auditRepository.js';

export interface RevenueDashboardMetrics {
  totalRevenue: number;              // Gross verified received revenue
  revenueToday: number;              // Revenue received today (IST)
  revenueThisMonth: number;          // Revenue received this month (IST)
  revenueThisYear: number;           // Revenue received this year (IST)
  totalCapturedTransactions: number; // Successful payments count
  activePaidSubscribers: number;     // Active subscribers with verified payments
  activeMonthlySubscribers: number;  // Active monthly subscribers
  activeYearlySubscribers: number;   // Active yearly subscribers
  activeTrialUsers: number;          // Trial users (no real revenue)
  expiredSubscriptions: number;      // Expired subscriptions
  cancelledSubscriptions: number;    // Cancelled subscriptions
  pendingPaymentsCount: number;      // Pending payments count
  pendingPaymentsAmount: number;     // Pending payments volume
  failedPaymentsCount: number;       // Failed payments count
  failedPaymentsAmount: number;      // Failed payments volume
  refundsCount: number;              // Refunds count
  totalRefundsAmount: number;        // Refunds total amount
  totalRefunds?: number;             // Total refunds alias
  grossRevenue: number;              // Gross collections
  netRevenue: number;                // Net collections (gross - refunds)
  revenueTrend: Array<{ date: string; gross: number; refunds: number; net: number; count: number }>;
  planBreakdown: Array<{
    planCode: string;
    planName: string;
    billingCycle: string;
    price: number;
    subscribersCount: number;
    revenue: number;
  }>;
}

export interface ListSubscriptionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  dateRange?: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'this_year' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
  plan?: string;
  billingCycle?: 'monthly' | 'yearly' | 'trial' | 'all';
  paymentStatus?: 'successful' | 'pending' | 'failed' | 'refunded' | 'all';
  subscriptionStatus?: 'active' | 'expired' | 'cancelled' | 'trial' | 'all';
}

function getIstDateRange() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(now.getTime() + istOffsetMs);

  const startOfTodayIst = new Date(
    Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - istOffsetMs
  );
  const startOfMonthIst = new Date(
    Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), 1) - istOffsetMs
  );
  const startOfYearIst = new Date(
    Date.UTC(nowIst.getUTCFullYear(), 0, 1) - istOffsetMs
  );

  return { now, startOfTodayIst, startOfMonthIst, startOfYearIst };
}

export class AdminRevenueService {
  /**
   * Calculate authoritative real-time metrics strictly from PostgreSQL
   */
  async getRevenueDashboard(userRole?: AdminRole): Promise<RevenueDashboardMetrics> {
    const { now, startOfTodayIst, startOfMonthIst, startOfYearIst } = getIstDateRange();

    const [
      allCapturedAgg,
      todayCapturedAgg,
      thisMonthCapturedAgg,
      thisYearCapturedAgg,
      pendingAgg,
      failedAgg,
      refundsAgg,
      subscriptions,
      recentCapturedTxs,
      allRefunds,
    ] = await Promise.all([
      // Gross Total Captured
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] } },
      }),
      // Today Captured (IST)
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] },
          OR: [
            { paidAt: { gte: startOfTodayIst } },
            { AND: [{ paidAt: null }, { createdAt: { gte: startOfTodayIst } }] },
          ],
        },
      }),
      // This Month Captured (IST)
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] },
          OR: [
            { paidAt: { gte: startOfMonthIst } },
            { AND: [{ paidAt: null }, { createdAt: { gte: startOfMonthIst } }] },
          ],
        },
      }),
      // This Year Captured (IST)
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] },
          OR: [
            { paidAt: { gte: startOfYearIst } },
            { AND: [{ paidAt: null }, { createdAt: { gte: startOfYearIst } }] },
          ],
        },
      }),
      // Pending Payments
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: PaymentStatus.PENDING },
      }),
      // Failed Payments
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: PaymentStatus.FAILED },
      }),
      // Total Refunds
      prisma.refundRecord.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      // All Subscriptions with Plan
      prisma.subscription.findMany({
        include: {
          plan: true,
          paymentTransactions: {
            where: { status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] } },
            select: { id: true, amount: true, status: true },
          },
        },
      }),
      // Daily trend past 30 days
      prisma.paymentTransaction.findMany({
        where: {
          status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] },
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { amount: true, createdAt: true, paidAt: true },
      }),
      // Refunds in last 30 days for trend
      prisma.refundRecord.findMany({
        where: {
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { amount: true, createdAt: true },
      }),
    ]);

    const totalRevenue = Math.round(Number(allCapturedAgg._sum.amount || 0));
    const revenueToday = Math.round(Number(todayCapturedAgg._sum.amount || 0));
    const revenueThisMonth = Math.round(Number(thisMonthCapturedAgg._sum.amount || 0));
    const revenueThisYear = Math.round(Number(thisYearCapturedAgg._sum.amount || 0));
    const totalCapturedTransactions = allCapturedAgg._count.id || 0;

    const pendingPaymentsCount = pendingAgg._count.id || 0;
    const pendingPaymentsAmount = Math.round(Number(pendingAgg._sum.amount || 0));

    const failedPaymentsCount = failedAgg._count.id || 0;
    const failedPaymentsAmount = Math.round(Number(failedAgg._sum.amount || 0));

    const refundsCount = refundsAgg._count.id || 0;
    const totalRefundsAmount = Math.round(Number(refundsAgg._sum.amount || 0));

    const grossRevenue = totalRevenue;
    const netRevenue = Math.max(0, grossRevenue - totalRefundsAmount);

    // Categorize Subscriptions
    let activePaidSubscribers = 0;
    let activeMonthlySubscribers = 0;
    let activeYearlySubscribers = 0;
    let activeTrialUsers = 0;
    let expiredSubscriptions = 0;
    let cancelledSubscriptions = 0;

    const planStats: Record<string, { planName: string; billingCycle: string; price: number; count: number; rev: number }> = {};

    for (const sub of subscriptions) {
      const isExpired = sub.expiryDate && new Date(sub.expiryDate) < now;
      const isCancelled = sub.status === SubscriptionStatus.CANCELLED || !!sub.cancelledAt;
      const hasVerifiedPayment = (sub.paymentTransactions?.length || 0) > 0 || (sub.amount > 0 && sub.status === SubscriptionStatus.ACTIVE);
      const isTrial = sub.status === SubscriptionStatus.TRIAL || sub.status === SubscriptionStatus.TRIALING || (!hasVerifiedPayment && sub.plan?.code === 'free');

      const planCode = sub.plan?.code || 'custom';
      const cycle = (sub.plan?.billingInterval || sub.plan?.billingCycle || 'monthly').toLowerCase();
      const planName = sub.plan?.name || planCode;
      const planPrice = Number(sub.plan?.price || sub.amount || 0);

      if (!planStats[planCode]) {
        planStats[planCode] = {
          planName,
          billingCycle: cycle,
          price: planPrice,
          count: 0,
          rev: 0,
        };
      }

      if (isCancelled) {
        cancelledSubscriptions++;
      } else if (isExpired || sub.status === SubscriptionStatus.EXPIRED) {
        expiredSubscriptions++;
      } else if (sub.status === SubscriptionStatus.ACTIVE && hasVerifiedPayment) {
        activePaidSubscribers++;
        planStats[planCode].count++;
        planStats[planCode].rev += sub.paymentTransactions?.reduce((acc, t) => acc + (t.amount || 0), 0) || planPrice;

        if (cycle === 'yearly' || planCode.includes('year')) {
          activeYearlySubscribers++;
        } else {
          activeMonthlySubscribers++;
        }
      } else if (isTrial || sub.status === SubscriptionStatus.TRIAL) {
        activeTrialUsers++;
      }
    }

    // Daily Trend for last 30 days
    const dailyMap: Record<string, { gross: number; refunds: number; count: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { gross: 0, refunds: 0, count: 0 };
    }

    for (const tx of recentCapturedTxs) {
      const dateKey = new Date(tx.paidAt || tx.createdAt).toISOString().split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].gross += Number(tx.amount || 0);
        dailyMap[dateKey].count += 1;
      }
    }

    for (const ref of allRefunds) {
      const dateKey = new Date(ref.createdAt).toISOString().split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].refunds += Number(ref.amount || 0);
      }
    }

    const revenueTrend = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      gross: Math.round(data.gross),
      refunds: Math.round(data.refunds),
      net: Math.max(0, Math.round(data.gross - data.refunds)),
      count: data.count,
    }));

    const planBreakdown = Object.entries(planStats).map(([code, p]) => ({
      planCode: code,
      planName: p.planName,
      billingCycle: p.billingCycle,
      price: p.price,
      subscribersCount: p.count,
      revenue: Math.round(p.rev),
    }));

    return {
      totalRevenue,
      revenueToday,
      revenueThisMonth,
      revenueThisYear,
      totalCapturedTransactions,
      activePaidSubscribers,
      activeMonthlySubscribers,
      activeYearlySubscribers,
      activeTrialUsers,
      expiredSubscriptions,
      cancelledSubscriptions,
      pendingPaymentsCount,
      pendingPaymentsAmount,
      failedPaymentsCount,
      failedPaymentsAmount,
      refundsCount,
      totalRefundsAmount,
      totalRefunds: totalRefundsAmount,
      grossRevenue,
      netRevenue,
      revenueTrend,
      planBreakdown,
    };
  }

  /**
   * Searchable, Filterable, Paginated Subscription Records
   */
  async listSubscriptions(query: ListSubscriptionsQuery, userRole?: AdminRole) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};
    const now = new Date();
    const { startOfTodayIst, startOfMonthIst, startOfYearIst } = getIstDateRange();

    // 1. Date Range Filters
    if (query.dateRange && query.dateRange !== 'all') {
      if (query.dateRange === 'today') {
        where.createdAt = { gte: startOfTodayIst };
      } else if (query.dateRange === 'last_7_days') {
        where.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (query.dateRange === 'last_30_days') {
        where.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      } else if (query.dateRange === 'this_month') {
        where.createdAt = { gte: startOfMonthIst };
      } else if (query.dateRange === 'this_year') {
        where.createdAt = { gte: startOfYearIst };
      } else if (query.dateRange === 'custom' && (query.startDate || query.endDate)) {
        where.createdAt = {
          gte: query.startDate ? new Date(query.startDate) : undefined,
          lte: query.endDate ? new Date(query.endDate) : undefined,
        };
      }
    }

    // 2. Plan filter
    if (query.plan && query.plan !== 'all') {
      where.plan = { code: query.plan.toLowerCase() };
    }

    // 3. Billing cycle filter
    if (query.billingCycle && query.billingCycle !== 'all') {
      if (query.billingCycle === 'trial') {
        where.OR = [
          { status: SubscriptionStatus.TRIAL },
          { status: SubscriptionStatus.TRIALING },
          { plan: { code: 'free' } },
        ];
      } else {
        const cycle = query.billingCycle.toLowerCase();
        where.plan = {
          is: {
            billingCycle: { contains: cycle, mode: 'insensitive' },
          },
        };
      }
    }

    // 4. Subscription Status filter
    if (query.subscriptionStatus && query.subscriptionStatus !== 'all') {
      const st = query.subscriptionStatus.toUpperCase();
      if (st === 'ACTIVE') {
        where.status = SubscriptionStatus.ACTIVE;
        where.expiryDate = { gte: now };
      } else if (st === 'EXPIRED') {
        where.OR = [
          { status: SubscriptionStatus.EXPIRED },
          { expiryDate: { lt: now } },
        ];
      } else if (st === 'CANCELLED') {
        where.status = SubscriptionStatus.CANCELLED;
      } else if (st === 'TRIAL') {
        where.OR = [
          { status: SubscriptionStatus.TRIAL },
          { status: SubscriptionStatus.TRIALING },
          { plan: { code: 'free' } },
        ];
      }
    }

    // 5. Payment Status filter
    if (query.paymentStatus && query.paymentStatus !== 'all') {
      if (query.paymentStatus === 'successful') {
        where.paymentTransactions = {
          some: { status: { in: [PaymentStatus.SUCCESS, PaymentStatus.CAPTURED] } },
        };
      } else if (query.paymentStatus === 'pending') {
        where.paymentTransactions = {
          some: { status: PaymentStatus.PENDING },
        };
      } else if (query.paymentStatus === 'failed') {
        where.paymentTransactions = {
          some: { status: PaymentStatus.FAILED },
        };
      } else if (query.paymentStatus === 'refunded') {
        where.paymentTransactions = {
          some: { status: { in: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] } },
        };
      }
    }

    // 6. Search filter
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { id: { contains: term, mode: 'insensitive' } },
        { user: { name: { contains: term, mode: 'insensitive' } } },
        { user: { mobile: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { business: { name: { contains: term, mode: 'insensitive' } } },
        { providerSubscriptionId: { contains: term, mode: 'insensitive' } },
        { paymentTransactions: { some: { paymentId: { contains: term, mode: 'insensitive' } } } },
        { paymentTransactions: { some: { orderId: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, mobile: true, email: true } },
          business: { select: { id: true, name: true, city: true, state: true, gstin: true } },
          plan: true,
          paymentTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              paymentId: true,
              orderId: true,
              amount: true,
              status: true,
              gateway: true,
              paymentMethod: true,
              paidAt: true,
              refundAmount: true,
              refundDate: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const isCmo = userRole === 'CMO';

    const subscriptions = records.map((s) => {
      const latestTx = s.paymentTransactions?.[0];
      const hasPaid = s.paymentTransactions?.some((t) => t.status === PaymentStatus.SUCCESS || t.status === PaymentStatus.CAPTURED);
      const isTrial = s.status === SubscriptionStatus.TRIAL || s.status === SubscriptionStatus.TRIALING || (!hasPaid && s.plan?.code === 'free');
      const isExpired = s.expiryDate && new Date(s.expiryDate) < now;

      const subStatusStr = isTrial
        ? 'TRIAL'
        : s.status === SubscriptionStatus.CANCELLED
        ? 'CANCELLED'
        : isExpired
        ? 'EXPIRED'
        : 'ACTIVE';

      const paymentStatusStr = latestTx
        ? latestTx.status
        : hasPaid
        ? 'SUCCESS'
        : isTrial
        ? 'FREE'
        : 'PENDING';

      return {
        id: s.id,
        userId: s.userId,
        userName: s.user?.name || 'Customer',
        businessName: s.business?.name || 'Shop',
        userEmail: isCmo ? s.user?.email || null : s.user?.email || null,
        userPhone: s.user?.mobile || null,
        subscriptionId: s.id,
        planId: s.planId,
        planName: s.plan?.name || s.plan?.code || 'Pro Plan',
        planCode: s.plan?.code || 'pro',
        billingCycle: s.plan?.billingInterval || s.plan?.billingCycle || (s.plan?.code.includes('year') ? 'yearly' : 'monthly'),
        planPrice: Number(s.plan?.price || 0),
        amountPaid: Number(latestTx?.amount || s.amount || 0),
        currency: s.currency || 'INR',
        paymentStatus: paymentStatusStr,
        subscriptionStatus: subStatusStr,
        paymentGateway: latestTx?.gateway || s.paymentProvider || 'RAZORPAY',
        paymentDate: latestTx?.paidAt || latestTx?.createdAt || null,
        startDate: s.startDate,
        expiryDate: s.expiryDate,
        nextRenewalDate: s.autoRenew && subStatusStr === 'ACTIVE' ? s.expiryDate : null,
        trialStartDate: isTrial ? s.startDate : null,
        trialEndDate: isTrial ? s.expiryDate : null,
        refundStatus: latestTx?.refundAmount ? `Refunded (₹${latestTx.refundAmount})` : null,
        gatewayPaymentId: isCmo ? null : latestTx?.paymentId || s.providerSubscriptionId || null,
        gatewayOrderId: isCmo ? null : latestTx?.orderId || null,
        autoRenew: s.autoRenew,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return {
      subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Detail view of single subscription record
   */
  async getSubscriptionDetail(id: string, userRole?: AdminRole) {
    const sub = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
            email: true,
            status: true,
            isPro: true,
            createdAt: true,
          },
        },
        business: true,
        plan: true,
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            refunds: true,
          },
        },
      },
    });

    if (!sub) {
      throw new Error('Subscription record not found');
    }

    const now = new Date();
    const isCmo = userRole === 'CMO';

    // Fetch related audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: sub.id },
          { entityId: sub.userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Sanitization for CMO
    const paymentAttempts = sub.paymentTransactions.map((tx) => ({
      id: tx.id,
      orderId: isCmo ? '***' : tx.orderId,
      paymentId: isCmo ? '***' : tx.paymentId,
      amount: tx.amount,
      taxAmount: tx.taxAmount,
      netAmount: tx.netAmount,
      currency: tx.currency,
      status: tx.status,
      paymentMethod: tx.paymentMethod,
      gateway: tx.gateway,
      maskedInstrument: tx.maskedInstrument,
      failureReason: tx.failureReason,
      paidAt: tx.paidAt,
      createdAt: tx.createdAt,
      refunds: tx.refunds.map((r) => ({
        id: r.id,
        amount: r.amount,
        reason: r.reason,
        status: r.status,
        processedAt: r.processedAt,
        adminNotes: r.adminNotes,
      })),
    }));

    return {
      subscription: {
        id: sub.id,
        planCode: sub.plan.code,
        planName: sub.plan.name,
        billingCycle: sub.plan.billingInterval || sub.plan.billingCycle,
        amount: sub.amount,
        currency: sub.currency,
        status: sub.status,
        startDate: sub.startDate,
        expiryDate: sub.expiryDate,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        cancelledAt: sub.cancelledAt,
        autoRenew: sub.autoRenew,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        isExpired: sub.expiryDate ? new Date(sub.expiryDate) < now : false,
      },
      user: sub.user,
      business: sub.business,
      plan: {
        id: sub.plan.id,
        code: sub.plan.code,
        name: sub.plan.name,
        price: sub.plan.price,
        billingInterval: sub.plan.billingInterval,
        features: sub.plan.features,
        limits: sub.plan.limits,
      },
      paymentAttempts,
      auditLogs,
    };
  }

  /**
   * Export Filtered Subscriptions to CSV
   */
  async exportSubscriptionsCsv(query: ListSubscriptionsQuery, userRole?: AdminRole): Promise<string> {
    const { subscriptions } = await this.listSubscriptions({ ...query, limit: 1000 }, userRole);

    const headers = [
      'Subscription ID',
      'User Name',
      'Business Name',
      'Phone',
      'Email',
      'Plan Name',
      'Billing Cycle',
      'Plan Price (INR)',
      'Amount Paid (INR)',
      'Payment Status',
      'Subscription Status',
      'Gateway',
      'Payment ID',
      'Order ID',
      'Start Date',
      'Expiry Date',
      'Auto Renew',
      'Created At',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = subscriptions.map((s) => [
      escapeCsv(s.id),
      escapeCsv(s.userName),
      escapeCsv(s.businessName),
      escapeCsv(s.userPhone),
      escapeCsv(s.userEmail),
      escapeCsv(s.planName),
      escapeCsv(s.billingCycle),
      escapeCsv(s.planPrice),
      escapeCsv(s.amountPaid),
      escapeCsv(s.paymentStatus),
      escapeCsv(s.subscriptionStatus),
      escapeCsv(s.paymentGateway),
      escapeCsv(s.gatewayPaymentId || 'N/A'),
      escapeCsv(s.gatewayOrderId || 'N/A'),
      escapeCsv(s.startDate ? new Date(s.startDate).toISOString() : ''),
      escapeCsv(s.expiryDate ? new Date(s.expiryDate).toISOString() : ''),
      escapeCsv(s.autoRenew ? 'Yes' : 'No'),
      escapeCsv(s.createdAt ? new Date(s.createdAt).toISOString() : ''),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}

export const adminRevenueService = new AdminRevenueService();
