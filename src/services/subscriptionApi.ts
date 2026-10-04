/**
 * BRANDX — Subscription & Payment API Service
 * Interacts with backend subscription endpoints (PostgreSQL, Razorpay, HMAC verification)
 */

import { authApi } from './authApi';
import { getStandardHeaders } from './apiHelper';

export interface PlanFeature {
  text: string;
}

export interface SubscriptionPlanDTO {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  billingInterval?: string;
  durationDays?: number;
  features: string[];
  isActive: boolean;
}

export interface CurrentSubscriptionDTO {
  isPro: boolean;
  status: string;
  planCode?: string;
  planName?: string;
  billingCycle?: string;
  price?: number;
  startedAt?: string | null;
  expiresAt?: string | null;
  autoRenew?: boolean;
  plan?: {
    id?: string;
    code: string;
    name: string;
    price?: number;
    currency?: string;
    billingInterval?: string;
    features?: string[];
  } | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  expiryDate?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface CheckoutOrderDTO {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planCode: string;
  planName: string;
  gateway: string;
  notes?: Record<string, any>;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface PaymentVerificationResultDTO {
  id: string;
  isPro: boolean;
  status: string;
  plan: {
    code: string;
    name: string;
    price: number;
    currency: string;
  };
  currentPeriodStart: string;
  currentPeriodEnd: string;
  expiryDate: string;
  cancelAtPeriodEnd: boolean;
}

import { API_BASE_URL } from '../config/env';


class SubscriptionApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async getHeaders(): Promise<HeadersInit> {
    return getStandardHeaders();
  }

  /**
   * Fetch all active subscription plans
   */
  async getPlans(): Promise<SubscriptionPlanDTO[]> {
    try {
      const res = await fetch(`${this.baseUrl}/subscriptions/plans`, {
        headers: await this.getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch subscription plans');
      return data.data || [];
    } catch (err: any) {
      console.warn('Could not fetch plans from backend, using fallback:', err.message);
      return [
        {
          id: 'free',
          name: 'Free Forever',
          code: 'free',
          description: 'Basic business khata & digital cards',
          price: 0,
          currency: 'INR',
          billingCycle: 'monthly',
          durationDays: 30,
          features: ['20 Daily AI Copilot Requests', '5 Monthly Invoices', '10 Posters/mo'],
          isActive: true,
        },
        {
          id: 'pro_monthly',
          name: 'Pro Monthly',
          code: 'pro_monthly',
          description: 'Full business acceleration for busy shopkeepers',
          price: 349,
          currency: 'INR',
          billingCycle: 'monthly',
          billingInterval: 'MONTHLY',
          durationDays: 30,
          features: [
            '100 Daily AI Copilot Requests',
            'Unlimited Invoices & GST Bills',
            'Unlimited HD Festival Posters',
            'Automated WhatsApp Payment Reminders',
            'VIP Customer Badges & Analytics',
          ],
          isActive: true,
        },
        {
          id: 'pro_yearly',
          name: 'Pro Yearly (Best Value)',
          code: 'pro_yearly',
          description: 'Maximum savings + physical NFC Review Standee',
          price: 2999,
          currency: 'INR',
          billingCycle: 'yearly',
          billingInterval: 'YEARLY',
          durationDays: 365,
          features: [
            'Everything in Pro Monthly',
            '365 Days Uninterrupted Pro',
            'Free Smart NFC Google Review Standee',
            'Priority 24/7 Vyapar Support',
            'Save ₹1,189 every year',
          ],
          isActive: true,
        },
      ];
    }
  }

  /**
   * Fetch current user's active subscription status from backend
   */
  async getCurrentSubscription(): Promise<CurrentSubscriptionDTO> {
    try {
      const res = await fetch(`${this.baseUrl}/subscriptions/current`, {
        headers: await this.getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch current subscription');
      return (
        data.data || {
          isPro: false,
          status: 'FREE',
        }
      );
    } catch (err: any) {
      console.warn('Subscription fetch error:', err.message);
      // Fall back to local storage cache if network fails
      const cached = localStorage.getItem('brandx_pro_status');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          return {
            isPro: !!parsed.isPro,
            status: parsed.isPro ? 'ACTIVE' : 'FREE',
            expiryDate: parsed.expiresAt,
          };
        } catch {}
      }
      return { isPro: false, status: 'FREE' };
    }
  }

  /**
   * Initiate subscription checkout / order creation
   */
  async checkout(planCode: string, gateway: string = 'RAZORPAY'): Promise<CheckoutOrderDTO> {
    const res = await fetch(`${this.baseUrl}/subscriptions/checkout`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ planCode, gateway }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error?.message || 'Failed to create payment order');
    }
    return data.data;
  }

  /**
   * Activate subscription directly or with verification
   */
  async activate(params?: {
    planCode?: string;
    orderId?: string;
    paymentId?: string;
    signature?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/subscriptions/activate`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(params || {}),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error?.message || 'Subscription activation failed');
    }
    return data.data;
  }

  /**
   * Verify cryptographic payment signature and activate Pro subscription
   */
  async verifyPayment(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    planCode?: string;
  }): Promise<PaymentVerificationResultDTO> {
    const res = await fetch(`${this.baseUrl}/subscriptions/verify`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error?.message || 'Payment verification failed');
    }
    return data.data;
  }

  /**
   * Cancel auto-renewing subscription
   */
  async cancelSubscription(reason?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/subscriptions/cancel`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error?.message || 'Failed to cancel subscription');
    }
    return data.data;
  }

  /**
   * Fetch payment transaction history
   */
  async getPayments(page = 1, limit = 20): Promise<any> {
    const res = await fetch(`${this.baseUrl}/subscriptions/payments?page=${page}&limit=${limit}`, {
      headers: await this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch payments');
    return data.data;
  }
}

export const subscriptionApi = new SubscriptionApiService();
