/**
 * BRANDX — GST Billing & POS Invoice API Service
 * Connects BrandX Frontend directly to PostgreSQL Invoice Engine & POS Endpoints
 */

import { authApi } from './authApi';

export interface BackendInvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string | null;
  productNameSnapshot: string;
  name: string;
  itemCodeSnapshot?: string | null;
  hsnSacSnapshot?: string | null;
  code?: string | null;
  type: 'GOODS' | 'SERVICE';
  quantity: number;
  qty: number;
  unit: string;
  rate: number;
  mrp?: number | null;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  discount: number;
  taxableValue: number;
  taxableAmount: number;
  gstRate: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackendInvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  transactionRef?: string | null;
  paymentDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface BackendInvoice {
  id: string;
  businessId: string;
  customerId?: string | null;
  invoiceNumber: string;
  documentType: 'GST_INVOICE' | 'RETAIL_BILL' | 'QUOTATION' | 'ESTIMATE' | 'DELIVERY_CHALLAN' | 'PROFORMA_INVOICE' | 'TAX_INVOICE' | 'ESTIMATE_QUOTATION';
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'CANCELLED' | 'VOID';
  invoiceDate: string;
  billDate: string;
  dueDate?: string | null;
  placeOfSupply?: string | null;
  
  // Seller Snapshot
  sellerGSTIN?: string | null;
  sellerGstin?: string | null;
  sellerName: string;
  sellerAddress: string;
  sellerPhone?: string | null;
  sellerEmail?: string | null;
  sellerUpi?: string | null;
  upiIdSnapshot?: string | null;
  bankDetailsSnapshot?: string | null;

  // Buyer Snapshot
  buyerName: string;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
  buyerGSTIN?: string | null;
  buyerGstin?: string | null;
  buyerAddress?: string | null;
  reverseCharge: boolean;

  // Calculations
  subtotal: number;
  totalDiscount: number;
  discountAmount: number;
  taxableAmount: number;
  totalCGST: number;
  cgstAmount: number;
  totalSGST: number;
  sgstAmount: number;
  totalIGST: number;
  igstAmount: number;
  totalCess: number;
  cessAmount: number;
  roundOff: number;
  grandTotal: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;

  paymentMethod: string;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'CANCELLED';
  notes?: string | null;
  termsAndConditions?: string | null;
  terms?: string | null;
  amountInWords?: string | null;
  isGstBill: boolean;
  discountCode?: string | null;
  discountPercent: number;
  includeSignature: boolean;
  stockDeducted: boolean;
  khataTxId?: string | null;
  items: BackendInvoiceItem[];
  payments: BackendInvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  documentType?: string;
  paymentStatus?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateInvoicePayload {
  customerId?: string | null;
  documentType: 'GST_INVOICE' | 'RETAIL_BILL' | 'QUOTATION' | 'ESTIMATE' | 'DELIVERY_CHALLAN' | 'PROFORMA_INVOICE' | 'TAX_INVOICE' | 'ESTIMATE_QUOTATION';
  status?: 'DRAFT' | 'ISSUED';
  isGstBill?: boolean;
  invoiceDate?: string;
  billDate?: string;
  dueDate?: string;
  buyerName?: string;
  customerName?: string;
  buyerPhone?: string;
  customerPhone?: string;
  buyerEmail?: string;
  buyerGSTIN?: string;
  buyerGstin?: string;
  buyerAddress?: string;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  items: Array<{
    productId?: string | null;
    name?: string;
    productNameSnapshot?: string;
    code?: string;
    itemCode?: string;
    hsnSac?: string;
    type?: 'GOODS' | 'SERVICE';
    quantity?: number;
    qty?: number;
    unit?: string;
    rate?: number;
    mrp?: number;
    discountType?: 'PERCENT' | 'FIXED';
    discountValue?: number;
    discount?: number;
    gstRate?: number;
    gstPercent?: number;
    cessRate?: number;
  }>;
  discountCode?: string;
  discountPercent?: number;
  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  amountPaid?: number;
  notes?: string;
  termsAndConditions?: string;
  terms?: string;
  includeSignature?: boolean;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  transactionRef?: string;
  notes?: string;
  note?: string;
  paymentDate?: string;
}

export interface InvoiceSummary {
  totalInvoices: number;
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  totalTaxCollected: number;
  countByStatus: Record<string, number>;
  countByDocType: Record<string, number>;
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


class InvoiceApiService {
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

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || `Request failed with status ${response.status}`,
          error: data.error,
        };
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error occurred. Please check backend server.',
      };
    }
  }

  async listInvoices(params: InvoiceListParams = {}): Promise<ApiResponse<BackendInvoice[]>> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.documentType) query.append('documentType', params.documentType);
    if (params.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    return this.request<BackendInvoice[]>(`/invoices${queryString ? `?${queryString}` : ''}`);
  }

  async getInvoice(id: string): Promise<ApiResponse<BackendInvoice>> {
    return this.request<BackendInvoice>(`/invoices/${id}`);
  }

  async createInvoice(payload: CreateInvoicePayload): Promise<ApiResponse<BackendInvoice>> {
    return this.request<BackendInvoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async issueInvoice(id: string): Promise<ApiResponse<BackendInvoice>> {
    return this.request<BackendInvoice>(`/invoices/${id}/issue`, {
      method: 'POST',
    });
  }

  async cancelInvoice(id: string, reason?: string): Promise<ApiResponse<BackendInvoice>> {
    return this.request<BackendInvoice>(`/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async recordPayment(
    id: string,
    payload: RecordPaymentPayload
  ): Promise<ApiResponse<{ payment: BackendInvoicePayment; invoice: BackendInvoice }>> {
    return this.request<{ payment: BackendInvoicePayment; invoice: BackendInvoice }>(`/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getInvoicePayments(id: string): Promise<ApiResponse<BackendInvoicePayment[]>> {
    return this.request<BackendInvoicePayment[]>(`/invoices/${id}/payments`);
  }

  async getInvoiceSummary(): Promise<ApiResponse<InvoiceSummary>> {
    return this.request<InvoiceSummary>('/invoices/summary');
  }
}

export const invoiceApi = new InvoiceApiService();
