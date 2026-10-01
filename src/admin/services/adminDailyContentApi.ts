/**
 * BRANDX Admin Daily Content, Festivals & Poster CMS API Client
 * Sends authenticated requests with Admin JWT & RBAC to backend endpoints
 */

import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';
const BASE_URL = API_BASE_URL;

function getAdminHeaders(): HeadersInit {
  const token = adminAuthService.getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const adminDailyContentApi = {
  // ============================================================
  // DAILY STATUS / CONTENT CMS
  // ============================================================

  async listDailyContent(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    isPublished?: boolean;
    isFeatured?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.festivalId) searchParams.append('festivalId', params.festivalId);
    if (params?.language) searchParams.append('language', params.language);
    if (params?.contentType) searchParams.append('contentType', params.contentType);
    if (params?.isPublished !== undefined) searchParams.append('isPublished', String(params.isPublished));
    if (params?.isFeatured !== undefined) searchParams.append('isFeatured', String(params.isFeatured));
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${BASE_URL}/admin/daily-content${qs}`, {
      headers: getAdminHeaders(),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to list daily content');
    }
    return {
      items: data.data || [],
      total: data.pagination?.total || data.data?.length || 0,
    };
  },

  async getDailyContentById(id: string) {
    const res = await fetch(`${BASE_URL}/admin/daily-content/${encodeURIComponent(id)}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Content not found');
    }
    return data.data;
  },

  async createDailyContent(payload: any) {
    const res = await fetch(`${BASE_URL}/admin/daily-content`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to create daily content');
    }
    return data.data;
  },

  async updateDailyContent(id: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/daily-content/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to update daily content');
    }
    return data.data;
  },

  async deleteDailyContent(id: string) {
    const res = await fetch(`${BASE_URL}/admin/daily-content/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to delete daily content');
    }
    return true;
  },

  async publishDailyContent(id: string) {
    const res = await fetch(`${BASE_URL}/admin/daily-content/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to publish content');
    }
    return data.data;
  },

  async unpublishDailyContent(id: string) {
    const res = await fetch(`${BASE_URL}/admin/daily-content/${encodeURIComponent(id)}/unpublish`, {
      method: 'POST',
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to unpublish content');
    }
    return data.data;
  },

  async scheduleDailyContent(id: string, schedule: { publishAt: string; expiresAt?: string }) {
    const res = await fetch(`${BASE_URL}/admin/daily-content/${encodeURIComponent(id)}/schedule`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(schedule),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to schedule content');
    }
    return data.data;
  },

  async uploadImage(imageBase64: string, fileName?: string, mimeType?: string, folder?: string) {
    const res = await fetch(`${BASE_URL}/admin/daily-content/upload-image`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify({ imageBase64, fileName, mimeType, folder }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to upload image');
    }
    return data.data; // { url, key }
  },

  // ============================================================
  // FESTIVALS CMS
  // ============================================================

  async listFestivals(params?: { year?: number; language?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.language) searchParams.append('language', params.language);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${BASE_URL}/admin/festivals${qs}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to fetch festivals');
    }
    return data.data || [];
  },

  async createFestival(payload: any) {
    const res = await fetch(`${BASE_URL}/admin/festivals`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to create festival');
    }
    return data.data;
  },

  async updateFestival(id: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/festivals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to update festival');
    }
    return data.data;
  },

  async deleteFestival(id: string) {
    const res = await fetch(`${BASE_URL}/admin/festivals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to delete festival');
    }
    return true;
  },

  // ============================================================
  // CONTENT CATEGORIES CMS
  // ============================================================

  async listCategories() {
    const res = await fetch(`${BASE_URL}/admin/content-categories`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to fetch categories');
    }
    return data.data || [];
  },

  async createCategory(payload: any) {
    const res = await fetch(`${BASE_URL}/admin/content-categories`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to create category');
    }
    return data.data;
  },

  async updateCategory(id: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/content-categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to update category');
    }
    return data.data;
  },

  async deleteCategory(id: string) {
    const res = await fetch(`${BASE_URL}/admin/content-categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to delete category');
    }
    return true;
  },

  // ============================================================
  // POSTER ASSETS CMS
  // ============================================================

  async listPosters(params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    festivalId?: string;
    language?: string;
    contentType?: string;
    aspectRatio?: string;
    tier?: string;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.festivalId) searchParams.append('festivalId', params.festivalId);
    if (params?.language) searchParams.append('language', params.language);
    if (params?.contentType) searchParams.append('contentType', params.contentType);
    if (params?.aspectRatio) searchParams.append('aspectRatio', params.aspectRatio);
    if (params?.tier) searchParams.append('tier', params.tier);
    if (params?.search) searchParams.append('search', params.search);

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${BASE_URL}/admin/posters${qs}`, {
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to fetch posters');
    }
    return {
      items: data.data || [],
      total: data.pagination?.total || data.data?.length || 0,
    };
  },

  async createPoster(payload: any) {
    const res = await fetch(`${BASE_URL}/admin/posters`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to create poster');
    }
    return data.data;
  },

  async updatePoster(id: string, payload: any) {
    const res = await fetch(`${BASE_URL}/admin/posters/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to update poster');
    }
    return data.data;
  },

  async deletePoster(id: string) {
    const res = await fetch(`${BASE_URL}/admin/posters/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAdminHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error?.message || 'Failed to delete poster');
    }
    return true;
  },
};
