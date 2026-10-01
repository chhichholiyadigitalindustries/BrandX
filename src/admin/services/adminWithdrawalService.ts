/**
 * BRANDX — Admin Withdrawal API Service
 */

import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';


export interface AdminWithdrawalItem {
  id: string;
  userId: string;
  coins: number;
  amountInr: number;
  status: string;
  payoutMethod: string;
  payoutAccount: string;
  accountHolderName?: string | null;
  payoutReference?: string | null;
  failureReason?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  user: {
    id: string;
    name: string;
    mobile?: string | null;
    email?: string | null;
  };
}

export interface AdminWithdrawalsResponse {
  withdrawals: AdminWithdrawalItem[];
  summary: {
    totalRequests: number;
    totalPendingWithdrawals: number;
    totalPaidWithdrawals: number;
    totalFailedWithdrawals: number;
    totalPaidInr: number;
    totalPendingInr: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class AdminWithdrawalService {
  private async getHeaders(): Promise<HeadersInit> {
    const token = adminAuthService.getAdminToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async listWithdrawals(query: { page?: number; limit?: number; status?: string; search?: string }): Promise<AdminWithdrawalsResponse> {
    const url = new URL(`${API_BASE_URL}/admin/withdrawals`);
    if (query.page) url.searchParams.set('page', String(query.page));
    if (query.limit) url.searchParams.set('limit', String(query.limit));
    if (query.status && query.status !== 'ALL') url.searchParams.set('status', query.status);
    if (query.search) url.searchParams.set('search', query.search);

    const res = await fetch(url.toString(), {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to list withdrawals');
    }
    return json.data;
  }

  async markProcessing(withdrawalId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/withdrawals/${withdrawalId}/process`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to mark processing');
    }
    return json.data;
  }

  async markPaid(withdrawalId: string, payoutReference: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/withdrawals/${withdrawalId}/paid`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ payoutReference }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to mark paid');
    }
    return json.data;
  }

  async markFailed(withdrawalId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/withdrawals/${withdrawalId}/fail`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to mark failed');
    }
    return json.data;
  }

  async adjustCoins(params: { userId: string; coins: number; reason: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/wallet/adjust`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(params),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to adjust coins');
    }
    return json.data;
  }
}

export const adminWithdrawalService = new AdminWithdrawalService();
