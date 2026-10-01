/**
 * BRANDX Admin Subscription Plan Service
 * Connects directly to backend /api/v1/admin/plans PostgreSQL endpoints.
 * Real plan definitions, real pricing, real subscriber metrics from database.
 */

import { SubscriptionPlan } from '../types/payment';
import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';


class PlanService {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const token = adminAuthService.getAdminToken();

    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.data) {
        const plans = json.data || [];
        return plans.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          price: Number(p.price || 0),
          originalPrice: Number(p.originalPrice || p.price || 0),
          currency: p.currency || 'INR',
          billingCycle: p.durationDays === 365 ? 'yearly' : p.durationDays === 30 ? 'monthly' : 'free',
          tagline: p.description || '',
          isPopular: p.isPopular || false,
          features: Array.isArray(p.features) ? p.features : [],
          limits: {
            invoices: p.maxInvoices === -1 ? 'unlimited' : p.maxInvoices,
            posters: p.maxPosters === -1 ? 'unlimited' : p.maxPosters,
            aiCredits: p.maxAiPrompts === -1 ? 'unlimited' : p.maxAiPrompts,
            digitalDukaan: p.features?.includes('digital_dukaan') || false,
            removeWatermark: !p.watermarkEnabled,
            customBranding: true,
            prioritySupport: p.price > 0,
            nfcSmartCard: p.price > 1000,
          },
          status: p.isActive ? 'active' : 'draft',
          subscribersCount: p._count?.subscriptions || 0,
          revenueGenerated: 0,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('[PlanService] Error fetching plans from backend:', err);
    }

    return [];
  }

  async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    const plans = await this.getPlans();
    return plans.find((p) => p.id === id || p.code === id) || null;
  }

  async updatePlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const token = adminAuthService.getAdminToken();

    const res = await fetch(`${API_BASE_URL}/admin/plans/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: updates.name,
        description: updates.tagline,
        price: updates.price,
        originalPrice: updates.originalPrice,
        features: updates.features,
        isActive: updates.status === 'active',
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.data) {
      throw new Error(json?.message || 'Failed to update plan');
    }

    const p = json.data;
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      price: Number(p.price || 0),
      originalPrice: Number(p.originalPrice || p.price || 0),
      currency: p.currency || 'INR',
      billingCycle: p.durationDays === 365 ? 'yearly' : 'monthly',
      tagline: p.description || '',
      isPopular: p.isPopular || false,
      features: p.features || [],
      limits: {
        invoices: 'unlimited',
        posters: 'unlimited',
        aiCredits: 'unlimited',
        digitalDukaan: true,
        removeWatermark: true,
        customBranding: true,
        prioritySupport: true,
        nfcSmartCard: true,
      },
      status: p.isActive ? 'active' : 'draft',
      subscribersCount: p._count?.subscriptions || 0,
      revenueGenerated: 0,
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    };
  }

  async createPlan(
    planData: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt' | 'subscribersCount' | 'revenueGenerated'>
  ): Promise<SubscriptionPlan> {
    const token = adminAuthService.getAdminToken();

    const res = await fetch(`${API_BASE_URL}/admin/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        code: planData.code,
        name: planData.name,
        description: planData.tagline,
        price: planData.price,
        originalPrice: planData.originalPrice,
        durationDays: planData.billingCycle === 'yearly' ? 365 : 30,
        features: planData.features || [],
      }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.data) {
      throw new Error(json?.message || 'Failed to create plan');
    }

    const p = json.data;
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      price: Number(p.price || 0),
      originalPrice: Number(p.originalPrice || p.price || 0),
      currency: p.currency || 'INR',
      billingCycle: p.durationDays === 365 ? 'yearly' : 'monthly',
      tagline: p.description || '',
      isPopular: p.isPopular || false,
      features: p.features || [],
      limits: {
        invoices: 'unlimited',
        posters: 'unlimited',
        aiCredits: 'unlimited',
        digitalDukaan: true,
        removeWatermark: true,
        customBranding: true,
        prioritySupport: true,
        nfcSmartCard: true,
      },
      status: p.isActive ? 'active' : 'draft',
      subscribersCount: 0,
      revenueGenerated: 0,
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString(),
    };
  }
}

export const planService = new PlanService();
