/**
 * BRANDX — Business & Shop Profile API Service
 * Connects BrandX Frontend to Backend PostgreSQL Business Endpoints
 */

import { authApi } from './authApi';
import { BusinessProfile } from '../types';

export interface BackendBusinessSettings {
  id?: string;
  businessId?: string;
  autoShareWhatsapp: boolean;
  showGstOnBill: boolean;
  defaultGstRate: number;
  thermalPrintWidth?: string;
  currency?: string;
  themeColor?: string;
}

export interface BusinessInputPayload {
  name?: string;
  businessName?: string;
  ownerName?: string;
  businessType?: string;
  category?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  tagline?: string;
  logoUrl?: string;
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  invoicePrefix?: string;
  nextInvoiceNumber?: number;
  invoiceTerms?: string;
  signatureUrl?: string;
  instagram?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
}

import { API_BASE_URL } from '../config/env';


const BIZ_STORAGE_KEY = 'brandx_business_profile';

class BusinessApiService {
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
      console.warn(`[BrandX Business API] Network error on ${endpoint}:`, networkError.message);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to connect to backend. Operating with local data cache.',
        },
      };
    }
  }

  /**
   * List all businesses owned by current authenticated user
   */
  async listBusinesses(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/businesses', { method: 'GET' });
  }

  /**
   * Get single business details with settings
   */
  async getBusiness(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/businesses/${id}`, { method: 'GET' });
  }

  /**
   * Create a new Business profile in PostgreSQL
   */
  async createBusiness(payload: BusinessInputPayload): Promise<ApiResponse<any>> {
    const res = await this.request<any>('/businesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      this.syncLocalProfile(res.data);
    }
    return res;
  }

  /**
   * Update existing business profile (GSTIN, Address, Bank, UPI, Logo, etc.)
   */
  async updateBusiness(id: string, payload: Partial<BusinessInputPayload>): Promise<ApiResponse<any>> {
    const res = await this.request<any>(`/businesses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      this.syncLocalProfile(res.data);
    }
    return res;
  }

  /**
   * Update business invoice and thermal print settings
   */
  async updateSettings(id: string, settings: Partial<BackendBusinessSettings>): Promise<ApiResponse<BackendBusinessSettings>> {
    return this.request<BackendBusinessSettings>(`/businesses/${id}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Delete business profile
   */
  async deleteBusiness(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/businesses/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Synchronize backend response with frontend localStorage profile cache
   */
  syncLocalProfile(backendData: any): void {
    if (typeof window === 'undefined' || !backendData) return;
    try {
      const existing = localStorage.getItem(BIZ_STORAGE_KEY);
      const current: BusinessProfile = existing ? JSON.parse(existing) : ({} as BusinessProfile);

      const merged: BusinessProfile = {
        ...current,
        id: backendData.id || current.id,
        name: backendData.name || current.name,
        ownerName: backendData.ownerName || current.ownerName,
        businessType: backendData.businessType || current.businessType,
        category: backendData.category || current.category,
        mobile: backendData.mobile || current.mobile,
        phone: backendData.mobile || current.phone,
        email: backendData.email || current.email,
        address: backendData.address || current.address,
        city: backendData.city || current.city,
        state: backendData.state || current.state,
        pincode: backendData.pincode || current.pincode,
        gstin: backendData.gstin !== undefined ? backendData.gstin : current.gstin,
        pan: backendData.pan !== undefined ? backendData.pan : current.pan,
        tagline: backendData.tagline !== undefined ? backendData.tagline : current.tagline,
        logoUrl: backendData.logoUrl || current.logoUrl,
        upiId: backendData.upiId !== undefined ? backendData.upiId : current.upiId,
        upiLinked: backendData.upiLinked !== undefined ? backendData.upiLinked : current.upiLinked,
        bankName: backendData.bankName !== undefined ? backendData.bankName : current.bankName,
        accountNumber: backendData.accountNumber !== undefined ? backendData.accountNumber : current.accountNumber,
        ifscCode: backendData.ifscCode !== undefined ? backendData.ifscCode : current.ifscCode,
        accountHolderName: backendData.accountHolderName !== undefined ? backendData.accountHolderName : current.accountHolderName,
        invoicePrefix: backendData.invoicePrefix || current.invoicePrefix || 'INV',
        nextInvoiceNumber: backendData.nextInvoiceNumber || current.nextInvoiceNumber || 1,
        invoiceTerms: backendData.invoiceTerms !== undefined ? backendData.invoiceTerms : current.invoiceTerms,
        signatureUrl: backendData.signatureUrl !== undefined ? backendData.signatureUrl : current.signatureUrl,
        instagram: backendData.instagram !== undefined ? backendData.instagram : current.instagram,
      };

      localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('[BrandX Business API] Error syncing local business profile:', e);
    }
  }
}

export const businessApi = new BusinessApiService();
