/**
 * BRANDX — 365-Day Daily Status & Poster Library API Client
 * Connects frontend screens to real PostgreSQL + Prisma content CMS endpoints
 */

import { authApi, ApiResponse } from './authApi';

import { API_BASE_URL } from '../config/env';
const BASE_URL = API_BASE_URL;

export interface BackendDailyContent {
  id: string;
  title: string;
  description?: string | null;
  contentText?: string | null;
  headline?: string | null;
  quoteHindi?: string | null;
  quoteEnglish?: string | null;
  quoteHinglish?: string | null;
  imageUrl: string;
  thumbnailUrl?: string | null;
  contentType: string;
  language: string;
  categoryId?: string | null;
  festivalId?: string | null;
  contentDate?: string | null;
  date?: string | null;
  aspectRatio: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  publishAt?: string | null;
  expiresAt?: string | null;
  sharesCount: number;
  downloadsCount: number;
  viewsCount: number;
  tags: string[];
  categoryRel?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  festival?: {
    id: string;
    name: string;
    hindiName?: string | null;
    slug: string;
    festivalDate: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendFestival {
  id: string;
  name: string;
  hindiName?: string | null;
  slug: string;
  description?: string | null;
  festivalDate: string;
  date?: string;
  year: number;
  language?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  priority: number;
  tags: string[];
  isActive: boolean;
  dailyContents?: BackendDailyContent[];
  contentAssets?: BackendContentAsset[];
}

export interface BackendContentCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface BackendContentAsset {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  thumbnailUrl?: string | null;
  contentType: string;
  categoryId?: string | null;
  festivalId?: string | null;
  language: string;
  aspectRatio: string;
  format: string;
  tier: 'FREE' | 'PRO';
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  viewsCount: number;
  sharesCount: number;
  downloadsCount: number;
  category?: BackendContentCategory | null;
  festival?: BackendFestival | null;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDayItem {
  date: string;
  contentCount: number;
  hasFestival: boolean;
  title?: string;
}

export interface CalendarFeedResponse {
  today: BackendDailyContent | null;
  upcomingFestivals: BackendFestival[];
  calendarDays: CalendarDayItem[];
}

export const dailyContentApi = {
  /**
   * Get today's featured or primary daily content
   */
  async getTodayContent(params?: {
    date?: string;
    language?: string;
    categoryId?: string;
    contentType?: string;
  }): Promise<BackendDailyContent | null> {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.append('date', params.date);
    if (params?.language) searchParams.append('language', params.language);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.contentType) searchParams.append('contentType', params.contentType);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${BASE_URL}/daily-content/today${qs}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data: ApiResponse<BackendDailyContent | null> = await res.json();
    return data.data || null;
  },

  /**
   * Get content for a specific date (YYYY-MM-DD)
   */
  async getContentByDate(date: string, language?: string): Promise<BackendDailyContent[]> {
    const qs = language ? `?language=${encodeURIComponent(language)}` : '';
    const res = await fetch(`${BASE_URL}/daily-content/date/${encodeURIComponent(date)}${qs}`);
    if (!res.ok) return [];

    const data: ApiResponse<BackendDailyContent[]> = await res.json();
    return data.data || [];
  },

  /**
   * Get content item by ID
   */
  async getContentById(id: string): Promise<BackendDailyContent | null> {
    const res = await fetch(`${BASE_URL}/daily-content/${encodeURIComponent(id)}`);
    if (!res.ok) return null;

    const data: ApiResponse<BackendDailyContent> = await res.json();
    return data.data || null;
  },

  /**
   * List published daily content with filters and pagination
   */
  async listDailyContent(params?: {
    page?: number;
    limit?: number;
    date?: string;
    categoryId?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    search?: string;
  }): Promise<{ items: BackendDailyContent[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.date) searchParams.append('date', params.date);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.festivalId) searchParams.append('festivalId', params.festivalId);
    if (params?.language) searchParams.append('language', params.language);
    if (params?.contentType) searchParams.append('contentType', params.contentType);
    if (params?.search) searchParams.append('search', params.search);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${BASE_URL}/daily-content${qs}`);
    if (!res.ok) return { items: [], total: 0 };

    const data: ApiResponse<BackendDailyContent[]> = await res.json();
    return {
      items: data.data || [],
      total: (data as any).pagination?.total || (data.data?.length || 0),
    };
  },

  /**
   * Get 365-day calendar feed
   */
  async getCalendarFeed(params?: {
    startDate?: string;
    endDate?: string;
    language?: string;
  }): Promise<CalendarFeedResponse> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.language) searchParams.append('language', params.language);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${BASE_URL}/daily-content/calendar${qs}`);
    if (!res.ok) {
      return { today: null, upcomingFestivals: [], calendarDays: [] };
    }

    const data: ApiResponse<CalendarFeedResponse> = await res.json();
    return data.data || { today: null, upcomingFestivals: [], calendarDays: [] };
  },

  /**
   * List active Indian festivals from CMS
   */
  async listFestivals(params?: { year?: number; language?: string }): Promise<BackendFestival[]> {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.language) searchParams.append('language', params.language);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${BASE_URL}/daily-content/festivals${qs}`);
    if (!res.ok) return [];

    const data: ApiResponse<BackendFestival[]> = await res.json();
    return data.data || [];
  },

  /**
   * Get festival details and assets by ID
   */
  async getFestivalContent(festivalId: string): Promise<BackendFestival | null> {
    const res = await fetch(`${BASE_URL}/daily-content/festivals/${encodeURIComponent(festivalId)}`);
    if (!res.ok) return null;

    const data: ApiResponse<BackendFestival> = await res.json();
    return data.data || null;
  },

  /**
   * List content categories
   */
  async listCategories(): Promise<BackendContentCategory[]> {
    const res = await fetch(`${BASE_URL}/daily-content/categories`);
    if (!res.ok) return [];

    const data: ApiResponse<BackendContentCategory[]> = await res.json();
    return data.data || [];
  },

  /**
   * List marketing posters from CMS (derived from DailyContent single source of truth)
   */
  async listPosters(params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    category?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    aspectRatio?: string;
    tier?: string;
    search?: string;
  }): Promise<{ items: BackendContentAsset[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.festivalId) searchParams.append('festivalId', params.festivalId);
    if (params?.language) searchParams.append('language', params.language);
    if (params?.contentType) searchParams.append('contentType', params.contentType);
    if (params?.aspectRatio) searchParams.append('aspectRatio', params.aspectRatio);
    if (params?.tier) searchParams.append('tier', params.tier);
    if (params?.search) searchParams.append('search', params.search);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    let res = await fetch(`${BASE_URL}/daily-content/posters${qs}`);
    if (!res.ok) {
      res = await fetch(`${BASE_URL}/marketing-posters${qs}`);
    }
    if (!res.ok) return { items: [], total: 0 };

    const data: ApiResponse<BackendContentAsset[]> = await res.json();
    return {
      items: data.data || [],
      total: (data as any).pagination?.total || (data.data?.length || 0),
    };
  },

  /**
   * Alias for listPosters
   */
  async listMarketingPosters(params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    category?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    aspectRatio?: string;
    tier?: string;
    search?: string;
  }) {
    return this.listPosters(params);
  },

  /**
   * Real Analytics Event Tracking
   */
  async trackEvent(data: {
    contentId?: string;
    assetId?: string;
    eventType: 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'WHATSAPP_CLICK' | 'FAVORITE';
    metadata?: any;
  }): Promise<boolean> {
    try {
      const activeBizId = typeof window !== 'undefined' ? localStorage.getItem('brandx_active_business_id') : null;
      const token = authApi.getAccessToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (activeBizId) headers['x-business-id'] = activeBizId;

      const res = await fetch(`${BASE_URL}/daily-content/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      return res.ok;
    } catch {
      return false;
    }
  },
};
