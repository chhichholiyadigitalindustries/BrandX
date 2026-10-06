/**
 * BRANDX Admin Payment Transaction Service
 * Direct backend integration with PostgreSQL PaymentTransaction records.
 * Privacy-safe: Never exposes full card numbers, CVVs, or sensitive credentials.
 */

import { PaymentTransaction, PaymentStatus, PaymentGateway, PaymentMethod } from '../types/payment';
import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';


class PaymentService {
  async getTransactions(filters?: {
    search?: string;
    status?: PaymentStatus | 'all';
    gateway?: PaymentGateway | 'all';
    paymentMethod?: PaymentMethod | 'all';
    startDate?: string;
    endDate?: string;
    userId?: string;
    businessId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ transactions: PaymentTransaction[]; totalCount: number; totalVolume: number }> {
    const token = adminAuthService.getAdminToken();
    const query = new URLSearchParams();

    if (filters?.page) query.set('page', String(filters.page));
    if (filters?.limit) query.set('limit', String(filters.limit));
    if (filters?.search) query.set('search', filters.search);
    if (filters?.status && filters.status !== 'all') query.set('status', filters.status.toUpperCase());
    if (filters?.gateway && filters.gateway !== 'all') query.set('gateway', filters.gateway.toUpperCase());

    try {
      const res = await fetch(`${API_BASE_URL}/admin/payments?${query.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.data) {
        const raw = json.data.transactions || [];
        const totalCount = json.data.total || 0;

        const transactions: PaymentTransaction[] = raw.map((t: any) => ({
          id: t.id,
          paymentId: t.providerPaymentId || t.paymentId || t.id,
          orderId: t.providerOrderId || t.orderId || `ord_${t.id.slice(-6)}`,
          userId: t.userId,
          userName: t.user?.name || 'Not available',
          userPhone: t.user?.mobile || t.user?.phone || 'Not available',
          userEmail: t.user?.email || 'Not available',
          businessId: t.businessId || '',
          businessName: t.business?.name || 'Not available',
          planId: t.planId || '',
          planName: t.plan?.name || 'Pro Subscription',
          amount: Number(t.amount || 0),
          currency: t.currency || 'INR',
          taxAmount: Math.round(Number(t.amount || 0) * 0.18),
          gatewayFee: Math.round(Number(t.amount || 0) * 0.02),
          netAmount: Math.round(Number(t.amount || 0) * 0.8),
          status: (t.status?.toLowerCase() === 'captured' || t.status?.toLowerCase() === 'success' ? 'success' : (t.status?.toLowerCase() as PaymentStatus) || 'pending'),
          gateway: (t.gateway?.toLowerCase() as PaymentGateway) || 'razorpay',
          paymentMethod: (t.paymentMethod?.toLowerCase() as PaymentMethod) || 'upi',
          date: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
          failureReason: t.failureReason || undefined,
        }));

        const totalVolume = transactions
          .filter((t) => t.status === 'success')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          transactions,
          totalCount,
          totalVolume,
        };
      }
    } catch (err) {
      console.warn('[PaymentService] Error fetching transactions from backend:', err);
    }

    return {
      transactions: [],
      totalCount: 0,
      totalVolume: 0,
    };
  }

  async getTransactionById(id: string): Promise<PaymentTransaction | null> {
    const { transactions } = await this.getTransactions({ limit: 100 });
    const txn = transactions.find((t) => t.id === id || t.paymentId === id || t.orderId === id);
    return txn || null;
  }

  async getTransactionsByUser(userId: string): Promise<PaymentTransaction[]> {
    const { transactions } = await this.getTransactions({ userId, limit: 100 });
    return transactions;
  }

  async exportTransactionsCSV(): Promise<string> {
    const { transactions } = await this.getTransactions({ limit: 1000 });
    const headers = [
      'Transaction ID',
      'Order ID',
      'Payment ID',
      'User Name',
      'Mobile',
      'Email',
      'Business Name',
      'Plan Name',
      'Amount (INR)',
      'Tax / GST (INR)',
      'Gateway Fee (INR)',
      'Net Amount (INR)',
      'Payment Method',
      'Payment Gateway',
      'Status',
      'Date & Time',
      'Failure / Refund Note',
    ];

    const rows = transactions.map((t) => [
      `"${t.id}"`,
      `"${t.orderId}"`,
      `"${t.paymentId}"`,
      `"${t.userName}"`,
      `"${t.userPhone}"`,
      `"${t.userEmail}"`,
      `"${t.businessName}"`,
      `"${t.planName}"`,
      t.amount,
      t.taxAmount || 0,
      t.gatewayFee || 0,
      t.netAmount || t.amount,
      `"${t.paymentMethod.toUpperCase()}"`,
      `"${t.gateway}"`,
      `"${t.status.toUpperCase()}"`,
      `"${t.date}"`,
      `"${t.failureReason || t.refundId ? `Refund: ₹${t.refundAmount}` : 'N/A'}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const paymentService = new PaymentService();
