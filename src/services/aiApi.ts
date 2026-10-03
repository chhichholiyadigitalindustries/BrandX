/**
 * BRANDX — Unified AI Copilot Client API
 * Connects BrandX frontend directly to BrandX Backend server-side Gemini endpoints.
 * ZERO API keys are stored in or exposed to the browser.
 */

import { authApi } from './authApi';

import { API_BASE_URL } from '../config/env';
const BASE_URL = API_BASE_URL;

export interface AIQuotaInfo {
  limit: number;
  used: number;
  remaining: number;
  period: 'daily';
  isPro: boolean;
}

export interface AIChatResponse {
  reply: string;
  language: string;
  model: string;
  usage?: {
    inputTokens?: number | null;
    outputTokens?: number | null;
  };
  quota?: AIQuotaInfo;
}

export interface AIReviewReplyResponse {
  reply: string;
  language: string;
  tone: string;
  rating: number;
  quota?: AIQuotaInfo;
}

export interface AIWhatsappCampaignResponse {
  campaignTitle: string;
  message: string;
  cta: string;
  caption?: string;
  quota?: AIQuotaInfo;
}

export interface AICaptionResponse {
  headline: string;
  caption: string;
  hashtags: string[];
  platform: string;
  language: string;
  quota?: AIQuotaInfo;
}

export interface AIBusinessInsightsResponse {
  metrics: {
    businessName: string;
    category: string;
    city?: string;
    khata: {
      totalCustomers: number;
      debtorCustomersCount: number;
      totalOutstandingUdhaar: number;
      totalAdvanceJama: number;
    };
    invoices: {
      totalInvoices: number;
      totalRevenue: number;
      recentInvoicesCount30Days: number;
      recentRevenue30Days: number;
      unpaidInvoicesCount: number;
    };
    inventory: {
      totalProducts: number;
      lowStockCount: number;
      outOfStockCount: number;
    };
  };
  insights: {
    summary: string;
    khataInsights: string;
    salesInsights: string;
    stockInsights: string;
    actionableSuggestions: string[];
    disclaimer: string;
  };
  quota?: AIQuotaInfo;
}

class AIApiClient {
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

  private checkOnline(): void {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('AI Copilot ke liye internet connection required hai.');
    }
  }

  private handleResponseError(res: Response, json: any, defaultMessage: string): never {
    if (res.status === 503) {
      throw new Error(json?.message || 'AI service is temporarily busy. Please try again in a moment.');
    }
    throw new Error(json?.message || json?.error?.message || defaultMessage);
  }

  /**
   * 1. Multi-language Chat endpoint
   */
  async chat(
    message: string,
    language: string = 'hinglish',
    context?: any
  ): Promise<AIChatResponse> {
    this.checkOnline();

    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message, language, context }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.handleResponseError(res, json, 'AI chat generation failed');
    }

    return json.data;
  }

  /**
   * 2. Review Reply Generator
   */
  async generateReviewReply(params: {
    review: string;
    rating: number;
    language?: string;
    businessName?: string;
    tone?: string;
  }): Promise<AIReviewReplyResponse> {
    this.checkOnline();

    const res = await fetch(`${BASE_URL}/ai/generate-review-reply`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.handleResponseError(res, json, 'Review reply generation failed');
    }

    return json.data;
  }

  /**
   * 3. WhatsApp Campaign Generator
   */
  async generateWhatsappCampaign(params: {
    purpose: string;
    festival?: string;
    businessType?: string;
    businessName?: string;
    language?: string;
    offer?: string;
    contactPhone?: string;
    upiId?: string;
    address?: string;
  }): Promise<AIWhatsappCampaignResponse> {
    this.checkOnline();

    const res = await fetch(`${BASE_URL}/ai/generate-whatsapp-campaign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.handleResponseError(res, json, 'WhatsApp campaign generation failed');
    }

    return json.data;
  }

  /**
   * 4. Social Media & Poster Caption Generator
   */
  async generateCaption(params: {
    topic: string;
    businessName?: string;
    language?: string;
    platform?: string;
  }): Promise<AICaptionResponse> {
    this.checkOnline();

    const res = await fetch(`${BASE_URL}/ai/generate-caption`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.handleResponseError(res, json, 'Caption generation failed');
    }

    return json.data;
  }

  /**
   * 5. Aggregated Business Insights
   */
  async businessInsights(params?: {
    language?: string;
    timeframe?: string;
  }): Promise<AIBusinessInsightsResponse> {
    this.checkOnline();

    const res = await fetch(`${BASE_URL}/ai/business-insights`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params || {}),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.handleResponseError(res, json, 'Business insights generation failed');
    }

    return json.data;
  }

  /**
   * 6. User AI Daily Quota Status
   */
  async getQuota(): Promise<AIQuotaInfo> {
    this.checkOnline();

    const res = await fetch(`${BASE_URL}/ai/quota`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.handleResponseError(res, json, 'Failed to fetch AI quota');
    }

    return json.data;
  }

  /**
   * 7. Legacy Generic Generator
   */
  async generateLegacy(type: string, prompt: string, params?: any): Promise<{ text: string; tokensUsed: number }> {
    this.checkOnline();

    const res = await fetch(`${BASE_URL}/ai/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ type, prompt, params }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.handleResponseError(res, json, 'AI generation failed');
    }

    return json.data;
  }
}

export const aiApi = new AIApiClient();
