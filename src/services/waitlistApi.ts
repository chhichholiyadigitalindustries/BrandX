/**
 * BRANDX — VIP Launch Waitlist API Client
 */

import { API_BASE_URL } from '../config/env';

export interface WaitlistPayload {
  name?: string;
  phone: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  city?: string;
}

export interface WaitlistResponse {
  success: boolean;
  message?: string;
  data?: {
    id?: string;
    phone: string;
    name?: string;
    businessName?: string;
    isExisting?: boolean;
    createdAt?: string;
  };
  error?: string;
}

export const waitlistApi = {
  async joinWaitlist(payload: WaitlistPayload): Promise<WaitlistResponse> {
    try {
      const res = await fetch(`${API_BASE_URL}/public/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return {
          success: true,
          message: json.message,
          data: json.data,
        };
      }

      return {
        success: false,
        error: json?.message || json?.error?.message || 'Failed to submit waitlist registration',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error connecting to waitlist service',
      };
    }
  },
};
