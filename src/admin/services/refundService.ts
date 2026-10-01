/**
 * BRANDX Admin Refund Management Service
 * Directly interacts with PostgreSQL RefundRecord database.
 * No mock data, no fake refunds.
 */

import { RefundRecord } from '../types/payment';
import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';


class RefundService {
  async getRefunds(filters?: {
    search?: string;
    status?: 'requested' | 'processing' | 'completed' | 'rejected' | 'all';
    page?: number;
    limit?: number;
  }): Promise<RefundRecord[]> {
    const token = adminAuthService.getAdminToken();
    const query = new URLSearchParams();

    if (filters?.page) query.set('page', String(filters.page));
    if (filters?.limit) query.set('limit', String(filters.limit || 50));
    if (filters?.status && filters.status !== 'all') query.set('status', filters.status.toUpperCase());

    try {
      const res = await fetch(`${API_BASE_URL}/admin/refunds?${query.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.data) {
        const raw = json.data.refunds || [];
        return raw.map((r: any) => ({
          id: r.id,
          transactionId: r.paymentTransactionId,
          paymentId: r.transaction?.paymentId || r.paymentTransactionId,
          userId: r.userId,
          userName: r.user?.name || 'Vyapari User',
          userPhone: r.user?.mobile || '',
          businessName: r.business?.name || 'Vyapari Business',
          amount: Number(r.amount || 0),
          reason: r.reason || 'User requested refund',
          status: (r.status?.toLowerCase() as any) || 'requested',
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          refundDate: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
          processedByAdminName: r.processedBy || 'Admin',
          notes: r.notes || '',
        }));
      }
    } catch (err) {
      console.warn('[RefundService] Error fetching refunds:', err);
    }

    return [];
  }

  async processRefund(
    id: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = adminAuthService.getAdminToken();

    try {
      const res = await fetch(`${API_BASE_URL}/admin/refunds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          refundId: id,
          action,
          notes,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return { success: true };
      }
      return { success: false, error: json?.message || 'Failed to process refund' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  async exportRefundsCSV(): Promise<string> {
    const list = await this.getRefunds();
    const headers = [
      'Refund ID',
      'Transaction ID',
      'Payment ID',
      'User Name',
      'Mobile',
      'Business Name',
      'Amount (INR)',
      'Reason',
      'Status',
      'Refund Date',
      'Processed By',
      'Notes',
    ];

    const rows = list.map((r) => [
      `"${r.id}"`,
      `"${r.transactionId}"`,
      `"${r.paymentId}"`,
      `"${r.userName}"`,
      `"${r.userPhone}"`,
      `"${r.businessName}"`,
      r.amount,
      `"${r.reason}"`,
      `"${r.status.toUpperCase()}"`,
      `"${r.refundDate ? r.refundDate.split('T')[0] : 'N/A'}"`,
      `"${r.processedByAdminName || 'Pending'}"`,
      `"${r.notes || ''}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}

export const refundService = new RefundService();
