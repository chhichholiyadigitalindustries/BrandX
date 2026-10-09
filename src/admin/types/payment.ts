/**
 * BRANDX Admin Payments & Revenue Type Definitions
 * Complete backend-ready TypeScript contracts for subscriptions, transactions, plans, refunds, and analytics.
 */

export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'expired'
  | 'cancelled'
  | 'past_due'
  | 'payment_failed'
  | 'pending';

export type PaymentStatus = 'success' | 'pending' | 'failed' | 'refunded' | 'cancelled';

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'emi' | 'qr';

export type PaymentGateway =
  | 'Razorpay'
  | 'Cashfree'
  | 'PhonePe'
  | 'Paytm'
  | 'Manual'
  | 'razorpay'
  | 'cashfree'
  | 'phonepe'
  | 'paytm'
  | 'manual';

export interface PlanLimits {
  invoices: number | 'unlimited';
  posters: number | 'unlimited';
  aiCredits: number | 'unlimited';
  digitalDukaan: boolean;
  removeWatermark: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  nfcSmartCard: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: 'free' | 'pro_monthly' | 'pro_yearly' | 'business' | 'enterprise' | string;
  price: number;
  originalPrice?: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime' | 'free';
  tagline: string;
  isPopular?: boolean;
  features: string[];
  limits: PlanLimits;
  status: 'active' | 'archived' | 'draft';
  subscribersCount: number;
  revenueGenerated: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionHistoryEvent {
  id: string;
  event: 'created' | 'renewed' | 'upgraded' | 'downgraded' | 'cancelled' | 'expired' | 'refunded' | 'failed';
  date: string;
  amount: number;
  note?: string;
  orderId?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  businessId: string;
  businessName: string;
  businessGstin?: string;
  businessCity?: string;
  businessState?: string;
  planId: string;
  planCode: string;
  planName: string;
  planPrice: number;
  amount: number;
  amountPaid?: number;
  currency: string;
  status: SubscriptionStatus;
  purchaseDate: string;
  startDate: string;
  expiryDate: string;
  autoRenew: boolean;
  paymentStatus: PaymentStatus;
  paymentId: string;
  transactionId: string;
  orderId: string;
  paymentGateway: PaymentGateway;
  paymentMethod: PaymentMethod;
  totalPaid: number;
  renewalCount: number;
  history: SubscriptionHistoryEvent[];
  createdAt: string;
  updatedAt: string;
  nextRenewalDate?: string | null;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  refundStatus?: string | null;
  gatewayPaymentId?: string | null;
  gatewayOrderId?: string | null;
}

export interface SafePaymentMethodDetails {
  type: string;
  bankName?: string;
  vpaMasked?: string;
  cardLast4?: string;
  cardNetwork?: string;
  walletName?: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  paymentId: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  businessId: string;
  businessName: string;
  subscriptionId?: string;
  planId?: string;
  planName: string;
  amount: number;
  taxAmount?: number;
  gatewayFee?: number;
  netAmount?: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentMethodDetails?: SafePaymentMethodDetails;
  gateway: PaymentGateway;
  status: PaymentStatus;
  failureReason?: string;
  failureCode?: string;
  refundId?: string;
  refundAmount?: number;
  refundDate?: string;
  date: string;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  transactionId: string;
  paymentId: string;
  orderId: string;
  userId: string;
  userName: string;
  userPhone: string;
  businessName: string;
  amount: number;
  currency: string;
  refundDate: string;
  reason:
    | 'Customer Requested'
    | 'Duplicate Payment'
    | 'Service Issue'
    | 'Accidental Charge'
    | 'Fraud Dispute'
    | 'Other';
  status: 'requested' | 'processing' | 'completed' | 'rejected';
  processedByAdminId?: string;
  processedByAdminName?: string;
  notes?: string;
  createdAt: string;
}

export interface MonthlyRevenueItem {
  month: string;
  gross: number;
  refunds: number;
  net: number;
  subscribers: number;
  renewals: number;
}

export interface DailyRevenueItem {
  date: string;
  revenue: number;
  transactions: number;
}

export interface PlanRevenueDistribution {
  planName: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface GatewayRevenueDistribution {
  gateway: string;
  count: number;
  volume: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  revenueToday: number;
  revenueThisMonth: number;
  revenueThisYear: number;
  revenueGrowthMoM: number;
  totalSubscribers: number;
  activeProSubscribers: number;
  newSubscribersThisMonth: number;
  renewalsThisMonth: number;
  cancelledThisMonth: number;
  failedPaymentsCount: number;
  failedPaymentsAmount?: number;
  pendingPaymentsCount?: number;
  pendingPaymentsAmount?: number;
  totalCapturedTransactions?: number;
  activePaidSubscribers?: number;
  activeMonthlySubscribers?: number;
  activeYearlySubscribers?: number;
  activeTrialUsers?: number;
  expiredSubscriptions?: number;
  cancelledSubscriptions?: number;
  refundsCount?: number;
  grossRevenue: number;
  totalRefunds: number;
  totalRefundsAmount?: number;
  netRevenue: number;
  revenueTrend?: Array<{ date: string; gross: number; refunds: number; net: number; count: number }>;
  planBreakdown?: Array<{
    planCode: string;
    planName: string;
    billingCycle: string;
    price: number;
    subscribersCount: number;
    revenue: number;
  }>;
  monthlyRevenueBreakdown: MonthlyRevenueItem[];
  dailyRevenueBreakdown: DailyRevenueItem[];
  revenueByPlan: PlanRevenueDistribution[];
  revenueByGateway: GatewayRevenueDistribution[];
  paymentStatusDistribution: {
    success: number;
    pending: number;
    failed: number;
    refunded: number;
  };
}

export type RevenueDateFilter =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'all_time'
  | 'custom';
