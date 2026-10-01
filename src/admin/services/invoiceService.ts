/**
 * BRANDX Admin Invoice Analytics Service
 * Provides platform-wide aggregate invoice statistics without leaking sensitive PII.
 */

import { AdminInvoiceRecord } from '../types';

export const invoiceService = {
  async getInvoices(params: {
    search?: string;
    docType?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ invoices: AdminInvoiceRecord[]; total: number; page: number; totalPages: number }> {
    await new Promise((r) => setTimeout(r, 200));

    let filtered: AdminInvoiceRecord[] = [];

    const page = params.page || 1;
    const limit = params.limit || 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      invoices: filtered,
      total,
      page,
      totalPages,
    };
  },

  async getMetrics() {
    await new Promise((r) => setTimeout(r, 150));
    return {
      totalInvoices: 0,
      todayInvoices: 0,
      monthlyInvoices: 0,
      totalGstRecorded: 0,
      documentTypesBreakdown: {
        taxInvoices: 0,
        quotations: 0,
        deliveryChallans: 0,
        billOfSupply: 0,
      },
    };
  },
};
