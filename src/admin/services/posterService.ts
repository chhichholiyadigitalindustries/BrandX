/**
 * BRANDX Admin Poster Library Service
 * Connects directly to backend PostgreSQL + Prisma ContentAsset / Poster CMS (Single Source of Truth)
 */

import { AdminPoster } from '../types';
import { adminDailyContentApi } from './adminDailyContentApi';

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
  /**
   * Fetches real posters from the backend database.
   * Returns empty array if none exist.
   */
  async getPosters(params?: { category?: string; search?: string; tier?: 'FREE' | 'PRO' }): Promise<AdminPoster[]> {
    try {
      const res = await adminDailyContentApi.listPosters({
        limit: 100,
        search: params?.search || undefined,
      });
      if (res && Array.isArray(res.items)) {
        let mapped = res.items.map(mapBackendToAdminPoster);
        if (params?.category && params.category !== 'all' && params.category !== 'All') {
          mapped = mapped.filter((p) => p.category.toLowerCase().includes(params.category!.toLowerCase()));
        }
        if (params?.tier) {
          mapped = mapped.filter((p) => (params.tier === 'PRO' ? p.isPremium : !p.isPremium));
        }
        return mapped;
      }
      return [];
    } catch (e: any) {
      console.error('[posterService] Failed to fetch posters from backend:', e);
      return [];
    }
  },

  /**
   * Saves or updates poster in backend database.
   * Throws on failure.
   */
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

    if (!payload.imageUrl) {
      throw new Error('Image URL zaroori hai. Kripya poster image upload karein.');
    }

    if (poster.id && !poster.id.startsWith('pos_local_')) {
      const res = await adminDailyContentApi.updatePoster(poster.id, payload);
      return mapBackendToAdminPoster(res);
    } else {
      const res = await adminDailyContentApi.createPoster(payload);
      return mapBackendToAdminPoster(res);
    }
  },

  /**
   * Deletes poster permanently from backend database.
   */
  async deletePoster(id: string): Promise<boolean> {
    await adminDailyContentApi.deletePoster(id);
    return true;
  },
};
