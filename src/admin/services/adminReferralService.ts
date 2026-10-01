/**
 * BRANDX — Admin Referral API Service
 */

import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';


export interface AdminReferralItem {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  status: string;
  rewardCoins: number;
  rewardedAt?: string | null;
  createdAt: string;
  referrer: {
    id: string;
    name: string;
    mobile?: string | null;
    email?: string | null;
  };
  referredUser: {
    id: string;
    name: string;
    mobile?: string | null;
    email?: string | null;
  };
}

export interface AdminReferralsResponse {
  referrals: AdminReferralItem[];
  summary: {
    totalReferrals: number;
    successfulReferrals: number;
    totalCoinsIssued: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminReferralConfig {
  id: string;
  minRewardCoins: number;
  maxRewardCoins: number;
  rewardStep: number;
  rewardMode: string;
  fixedRewardCoins: number;
  coinsPerInr: number;
  minWithdrawalCoins: number;
  eligibilityCondition: string;
}

class AdminReferralService {
  private async getHeaders(): Promise<HeadersInit> {
    const token = adminAuthService.getAdminToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async listReferrals(query: { page?: number; limit?: number; status?: string; search?: string }): Promise<AdminReferralsResponse> {
    const url = new URL(`${API_BASE_URL}/admin/referrals`);
    if (query.page) url.searchParams.set('page', String(query.page));
    if (query.limit) url.searchParams.set('limit', String(query.limit));
    if (query.status && query.status !== 'ALL') url.searchParams.set('status', query.status);
    if (query.search) url.searchParams.set('search', query.search);

    const res = await fetch(url.toString(), {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to list referrals');
    }
    return json.data;
  }

  async getConfig(): Promise<AdminReferralConfig> {
    const res = await fetch(`${API_BASE_URL}/admin/referrals/config`, {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to fetch referral config');
    }
    return json.data;
  }

  async updateConfig(data: Partial<AdminReferralConfig>): Promise<AdminReferralConfig> {
    const res = await fetch(`${API_BASE_URL}/admin/referrals/config`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to update referral config');
    }
    return json.data;
  }
}

export const adminReferralService = new AdminReferralService();
