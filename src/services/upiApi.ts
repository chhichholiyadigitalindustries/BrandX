/**
 * BRANDX — Central Business UPI API Client
 * Provides single source of truth for business-specific UPI operations
 */

import { authApi, ApiResponse } from './authApi';
import { API_BASE_URL } from '../config/env';

const BASE_URL = API_BASE_URL;

export interface BusinessUpiDetails {
  upiId: string;
  upiLinked: boolean;
  merchantName: string;
  category?: string;
  isConfigured: boolean;
  businessId: string;
}

export interface GeneratedUpiPayload {
  upiId: string;
  merchantName: string;
  amount: number | null;
  note: string | null;
  upiUri: string;
  qrDataUrl: string;
  businessId: string;
}

class BusinessUpiApiService {
  private getHeaders(): HeadersInit {
    const token = authApi.getAccessToken();
    const activeBizId = typeof window !== 'undefined' ? localStorage.getItem('brandx_active_business_id') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (activeBizId) headers['x-business-id'] = activeBizId;
    return headers;
  }

  /**
   * Fetch authenticated business's verified UPI details from PostgreSQL
   */
  async getUpiDetails(): Promise<ApiResponse<BusinessUpiDetails>> {
    const res = await fetch(`${BASE_URL}/upi/details`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Update and persist business owner's verified UPI ID in PostgreSQL
   */
  async updateUpi(upiId: string): Promise<ApiResponse<{ upiId: string; upiLinked: boolean }>> {
    const res = await fetch(`${BASE_URL}/upi`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ upiId }),
    });
    return res.json();
  }

  /**
   * Request backend generated QR payload with verification
   */
  async generateQr(options?: { amount?: number; note?: string }): Promise<ApiResponse<GeneratedUpiPayload>> {
    const res = await fetch(`${BASE_URL}/upi/generate-qr`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(options || {}),
    });
    return res.json();
  }
}

export const upiApi = new BusinessUpiApiService();
