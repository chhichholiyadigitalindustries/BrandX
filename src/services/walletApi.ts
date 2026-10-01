/**
 * BRANDX — Coin Wallet & Withdrawal Frontend API Service
 */

import { authApi } from './authApi';

import { API_BASE_URL } from '../config/env';


export interface WalletSummaryResponse {
  availableCoins: number;
  equivalentInr: number;
  pendingCoins: number;
  totalEarnedCoins: number;
  totalEarnedInr: number;
  totalWithdrawnCoins: number;
  totalWithdrawnInr: number;
  coinsPerInr: number;
  minWithdrawalCoins: number;
  minWithdrawalInr: number;
  canWithdraw: boolean;
}

export interface WalletTransactionItem {
  id: string;
  type: 'REFERRAL_REWARD' | 'WITHDRAWAL' | 'WITHDRAWAL_REVERSAL' | 'ADMIN_ADJUSTMENT' | 'BONUS' | 'EXPIRY';
  coins: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description: string;
  status: string;
  createdAt: string;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransactionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WithdrawalRecordItem {
  id: string;
  coins: number;
  amountInr: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  payoutMethod: 'UPI' | 'BANK_ACCOUNT';
  payoutAccount: string;
  accountHolderName?: string | null;
  payoutReference?: string | null;
  failureReason?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  createdAt: string;
}

export interface UserWithdrawalsResponse {
  withdrawals: WithdrawalRecordItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class WalletApiService {
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

  async getWallet(): Promise<WalletSummaryResponse> {
    const res = await fetch(`${this.baseUrl}/wallet`, {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to fetch wallet summary');
    }
    return json.data;
  }

  async getTransactions(page = 1, limit = 20, type?: string): Promise<WalletTransactionsResponse> {
    const url = new URL(`${this.baseUrl}/wallet/transactions`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));
    if (type && type !== 'ALL') url.searchParams.set('type', type);

    const res = await fetch(url.toString(), {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to fetch transactions');
    }
    return json.data;
  }

  async requestWithdrawal(params: {
    coins: number;
    payoutMethod: 'UPI' | 'BANK_ACCOUNT';
    payoutAccount: string;
    accountHolderName?: string;
  }): Promise<{ withdrawal: WithdrawalRecordItem; wallet: any; transaction: any }> {
    const res = await fetch(`${this.baseUrl}/wallet/withdrawals`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(params),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to submit withdrawal request');
    }
    return json.data;
  }

  async getWithdrawals(page = 1, limit = 20): Promise<UserWithdrawalsResponse> {
    const res = await fetch(`${this.baseUrl}/wallet/withdrawals?page=${page}&limit=${limit}`, {
      headers: await this.getHeaders(),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error?.message || 'Failed to fetch user withdrawals');
    }
    return json.data;
  }
}

export const walletApi = new WalletApiService();
