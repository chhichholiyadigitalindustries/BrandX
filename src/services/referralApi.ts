/**
 * BRANDX — Refer & Earn Frontend API Service
 */

import { authApi } from './authApi';

import { API_BASE_URL } from '../config/env';


export interface ReferralStatsResponse {
  referralCode: string;
  referralLink: string;
  minRewardCoins: number;
  maxRewardCoins: number;
  coinsPerInr: number;
  stats: {
    totalReferrals: number;
    successfulReferrals: number;
    pendingReferrals: number;
    coinsEarned: number;
    coinsPending: number;
  };
}

export interface ReferralHistoryItem {
  id: string;
  userDisplayName: string;
  status: 'CLICKED' | 'REGISTERED' | 'VERIFIED' | 'ELIGIBLE' | 'REWARDED' | 'REJECTED';
  rewardCoins: number;
  rewardedAt?: string | null;
  createdAt: string;
}

export interface ReferralHistoryResponse {
  history: ReferralHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ReferralApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = await authApi.ensureValidToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async getStats(): Promise<ReferralStatsResponse> {
    const res = await fetch(`${this.baseUrl}/referrals/me`, {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to fetch referral statistics');
    }
    return json.data;
  }

  async getCode(): Promise<{ referralCode: string; referralLink: string }> {
    const res = await fetch(`${this.baseUrl}/referrals/code`, {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to fetch referral code');
    }
    return json.data;
  }

  async getHistory(page = 1, limit = 20): Promise<ReferralHistoryResponse> {
    const res = await fetch(`${this.baseUrl}/referrals/history?page=${page}&limit=${limit}`, {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to fetch referral history');
    }
    return json.data;
  }

  async claimCode(referralCode: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/referrals/claim`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ referralCode }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to link referral code');
    }
    return json.data;
  }
}

export const referralApi = new ReferralApiService();
