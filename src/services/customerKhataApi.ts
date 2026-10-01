/**
 * BRANDX — Customer & Digital Khata API Service
 * Connects BrandX Frontend directly to PostgreSQL Khata Endpoints
 */

import { authApi } from './authApi';
import { KhataCustomer, KhataTransaction } from '../types';

export interface BackendCustomer {
  id: string;
  businessId: string;
  name: string;
  phone?: string | null;
  mobile: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  openingBalance: number;
  balance: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  transactions?: BackendKhataTransaction[];
  _count?: { transactions: number };
}

export interface BackendKhataTransaction {
  id: string;
  businessId: string;
  customerId: string;
  type: 'UDHAAR' | 'JAMA' | 'GIVE_UDHAR' | 'RECEIVE_JAMA';
  amount: number;
  description?: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface KhataSummary {
  customerId: string;
  customerName: string;
  phone: string;
  openingBalance: number;
  totalUdhar: number;
  totalJama: number;
  currentBalance: number;
  transactionCount: number;
  lastTransactionDate: string | null;
}

export interface PaymentReminderData {
  customerName: string;
  phone: string;
  amount: number;
  businessName: string;
  upiId: string;
  messageHindi: string;
  messageEnglish: string;
  whatsappLink: string;
  upiLink: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  notes?: string;
  openingBalance?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateCustomerPayload {
  name?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateTransactionPayload {
  type: 'UDHAAR' | 'JAMA' | 'give' | 'receive' | 'GIVE_UDHAR' | 'RECEIVE_JAMA';
  amount: number;
  description?: string;
  note?: string;
  billNumber?: string;
  transactionDate?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
}

import { API_BASE_URL } from '../config/env';


class CustomerKhataApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = (await authApi.ensureValidToken()) || authApi.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const json: ApiResponse<T> = await response.json().catch(() => ({
        success: response.ok,
        message: response.statusText,
      }));

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: json.error?.code || `HTTP_${response.status}`,
            message: json.error?.message || json.message || 'Request failed',
            details: json.error?.details,
          },
        };
      }

      return json;
    } catch (networkError: any) {
      console.warn(`[BrandX Khata API] Network error on ${endpoint}:`, networkError.message);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to backend. Operating with local data cache.',
        },
      };
    }
  }

  // ==========================================
  // CUSTOMER CRUD
  // ==========================================

  /**
   * List customers with optional search & pagination
   */
  async listCustomers(params?: {
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<BackendCustomer[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<BackendCustomer[]>(`/customers${queryString}`, { method: 'GET' });
  }

  /**
   * Get single customer with summary
   */
  async getCustomer(id: string): Promise<ApiResponse<BackendCustomer>> {
    return this.request<BackendCustomer>(`/customers/${id}`, { method: 'GET' });
  }

  /**
   * Create customer
   */
  async createCustomer(payload: CreateCustomerPayload): Promise<ApiResponse<BackendCustomer>> {
    return this.request<BackendCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update customer
   */
  async updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<ApiResponse<BackendCustomer>> {
    return this.request<BackendCustomer>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delete customer
   */
  async deleteCustomer(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // KHATA TRANSACTIONS
  // ==========================================

  /**
   * Add transaction (UDHAAR / JAMA)
   */
  async addTransaction(
    customerId: string,
    payload: CreateTransactionPayload
  ): Promise<ApiResponse<{ transaction: BackendKhataTransaction; currentBalance: number }>> {
    return this.request<{ transaction: BackendKhataTransaction; currentBalance: number }>(
      `/customers/${customerId}/transactions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * List transactions for customer
   */
  async listTransactions(
    customerId: string,
    params?: { page?: number; limit?: number; type?: string; startDate?: string; endDate?: string }
  ): Promise<ApiResponse<BackendKhataTransaction[]>> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.type) query.append('type', params.type);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<BackendKhataTransaction[]>(
      `/customers/${customerId}/transactions${queryString}`,
      { method: 'GET' }
    );
  }

  /**
   * Get Khata Summary for customer
   */
  async getKhataSummary(customerId: string): Promise<ApiResponse<KhataSummary>> {
    return this.request<KhataSummary>(`/customers/${customerId}/khata-summary`, { method: 'GET' });
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    id: string,
    payload: { amount?: number; description?: string; transactionDate?: string }
  ): Promise<ApiResponse<BackendKhataTransaction>> {
    return this.request<BackendKhataTransaction>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id: string): Promise<ApiResponse<{ message: string; currentBalance: number }>> {
    return this.request<{ message: string; currentBalance: number }>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Generate WhatsApp payment reminder data
   */
  async generatePaymentReminder(
    customerId: string,
    amount?: number
  ): Promise<ApiResponse<PaymentReminderData>> {
    return this.request<PaymentReminderData>(`/customers/${customerId}/reminder`, {
      method: 'POST',
      body: JSON.stringify(amount ? { amount } : {}),
    });
  }

  // ==========================================
  // TYPE ADAPTERS (Frontend ↔ Backend)
  // ==========================================

  /**
   * Convert backend Customer & Transactions to frontend KhataCustomer format
   */
  backendToFrontendCustomer(bCust: BackendCustomer): KhataCustomer {
    const transactions: KhataTransaction[] = (bCust.transactions || []).map((t) => {
      const isUdhar = t.type === 'UDHAAR' || t.type === 'GIVE_UDHAR';
      const formattedDate = t.transactionDate
        ? new Date(t.transactionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      return {
        id: t.id,
        customerId: t.customerId,
        type: isUdhar ? 'give' : 'receive',
        amount: Number(t.amount),
        date: formattedDate,
        note: t.description || (isUdhar ? 'Udhar' : 'Payment Received'),
      };
    });

    const lastTxDate = transactions.length > 0
      ? transactions[0].date
      : new Date(bCust.updatedAt || bCust.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      id: bCust.id,
      name: bCust.name,
      phone: bCust.phone || bCust.mobile || '',
      totalDue: Number(bCust.balance ?? 0),
      lastTransactionDate: lastTxDate,
      transactions,
    };
  }
}

export const customerKhataApi = new CustomerKhataApiService();
