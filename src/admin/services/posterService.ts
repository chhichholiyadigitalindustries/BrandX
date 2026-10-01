/**
 * BRANDX Admin Poster Library Service
 * Connects directly to backend PostgreSQL + Prisma ContentAsset / Poster CMS
 */

import { AdminPoster } from '../types';
import { adminDailyContentApi } from './adminDailyContentApi';

const STORAGE_KEY = 'brandx_admin_poster_library_cache';

function getCachedPosters(): AdminPoster[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveToCache(items: AdminPoster[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }
}

function mapBackendToAdminPoster(b: any): AdminPoster {
  return {
    id: b.id,
    title: b.title,
    category: b.category?.name || b.contentType || 'Festival',
    imageUrl: b.imageUrl,
    thumbnailUrl: b.thumbnailUrl || b.imageUrl,
    headlineDefault: b.title,
    subheadlineDefault: b.description || undefined,
    aspectRatio: b.aspectRatio || '1:1',
    isTrending: Boolean(b.isFeatured),
    isPremium: b.tier === 'PRO',
    status: b.isPublished ? 'published' : 'draft',
    sharesCount: b.sharesCount || 0,
    downloadsCount: b.downloadsCount || 0,
    tags: b.tags || [],
    createdAt: b.createdAt ? b.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

export const posterService = {
  async getPosters(params?: { category?: string; search?: string; tier?: 'FREE' | 'PRO' }): Promise<AdminPoster[]> {
    try {
      const res = await adminDailyContentApi.listPosters({
        limit: 100,
        search: params?.search || undefined,
      });
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        let mapped = res.items.map(mapBackendToAdminPoster);
        if (params?.category && params.category !== 'all' && params.category !== 'All') {
          mapped = mapped.filter((p) => p.category.toLowerCase().includes(params.category!.toLowerCase()));
        }
        if (params?.tier) {
          mapped = mapped.filter((p) => (params.tier === 'PRO' ? p.isPremium : !p.isPremium));
        }
        saveToCache(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Backend poster fetch failed, using cache:', e);
    }
    let cached = getCachedPosters();
    if (params?.category && params.category !== 'all' && params.category !== 'All') {
      cached = cached.filter((p) => p.category.toLowerCase().includes(params.category!.toLowerCase()));
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      cached = cached.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return cached;
  },

  async savePoster(poster: Partial<AdminPoster>): Promise<AdminPoster> {
    const payload = {
      title: poster.title || 'New Poster',
      description: poster.subheadlineDefault || '',
      imageUrl: poster.imageUrl || '',
      thumbnailUrl: poster.thumbnailUrl || poster.imageUrl || '',
      contentType: poster.category?.toUpperCase() || 'BUSINESS',
      aspectRatio: poster.aspectRatio || '1:1',
      format: poster.aspectRatio === '9:16' ? 'Story 9:16' : '1:1 Sq',
      tier: poster.isPremium ? 'PRO' : 'FREE',
      tags: poster.tags || ['Poster'],
      isPublished: poster.status !== 'draft',
      isFeatured: Boolean(poster.isTrending),
    };

    let savedItem: AdminPoster;

    try {
      if (poster.id && !poster.id.startsWith('pos_local_')) {
        const res = await adminDailyContentApi.updatePoster(poster.id, payload);
        savedItem = mapBackendToAdminPoster(res);
      } else {
        const res = await adminDailyContentApi.createPoster(payload);
        savedItem = mapBackendToAdminPoster(res);
      }
    } catch (e) {
      console.warn('Backend poster save failed, updating cache:', e);
      savedItem = {
        id: poster.id || `pos_local_${Date.now()}`,
        title: payload.title,
        category: poster.category || 'Business',
        imageUrl: payload.imageUrl,
        thumbnailUrl: payload.thumbnailUrl,
        headlineDefault: poster.headlineDefault || payload.title,
        subheadlineDefault: poster.subheadlineDefault,
        aspectRatio: payload.aspectRatio as any,
        isTrending: payload.isFeatured,
        isPremium: payload.tier === 'PRO',
        status: payload.isPublished ? 'published' : 'draft',
        sharesCount: poster.sharesCount || 0,
        downloadsCount: poster.downloadsCount || 0,
        tags: payload.tags,
        createdAt: new Date().toISOString().split('T')[0],
      };
    }

    const items = getCachedPosters();
    const idx = items.findIndex((i) => i.id === savedItem.id);
    if (idx >= 0) items[idx] = savedItem;
    else items.unshift(savedItem);
    saveToCache(items);

    return savedItem;
  },

  async deletePoster(id: string): Promise<boolean> {
    try {
      if (!id.startsWith('pos_local_')) {
        await adminDailyContentApi.deletePoster(id);
      }
    } catch (e) {
      console.warn('Backend poster delete failed:', e);
    }
    const items = getCachedPosters();
    saveToCache(items.filter((i) => i.id !== id));
    return true;
  },
};
