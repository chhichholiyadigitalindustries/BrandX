import { AdminPoster } from '../types';
import { adminDailyContentApi } from './adminDailyContentApi';
import { notifyContentUpdate } from './dailyStatusService';

function mapBackendToAdminPoster(b: any): AdminPoster {
  const cat = b.categoryRel?.name || (typeof b.category === 'string' ? b.category : '') || b.contentType || 'Festival';
  return {
    id: b.id,
    title: b.title || b.headline || 'Poster',
    category: cat,
    imageUrl: b.imageUrl,
    thumbnailUrl: b.thumbnailUrl || b.imageUrl,
    headlineDefault: b.headline || b.title,
    subheadlineDefault: b.quoteHindi || b.description || undefined,
    aspectRatio: b.aspectRatio || '9:16',
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
   * Fetches real marketing posters derived from DailyContent backend database.
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
   * Saves or updates poster in DailyContent backend database (Single Source of Truth).
   */
  async savePoster(poster: Partial<AdminPoster>): Promise<AdminPoster> {
    const payload = {
      title: poster.title || 'Marketing Poster',
      headline: poster.headlineDefault || poster.title || 'Marketing Poster',
      quoteHindi: poster.subheadlineDefault || '',
      description: poster.subheadlineDefault || '',
      contentText: poster.subheadlineDefault || '',
      imageUrl: poster.imageUrl || '',
      thumbnailUrl: poster.thumbnailUrl || poster.imageUrl || '',
      category: poster.category || 'suvichar',
      contentType: (poster.category?.toUpperCase() || 'SUVICHAR') as any,
      aspectRatio: poster.aspectRatio || '9:16',
      tier: poster.isPremium ? 'PRO' : 'FREE',
      tags: poster.tags || ['Poster'],
      isPublished: poster.status !== 'draft',
      isActive: poster.status !== 'draft',
      isFeatured: Boolean(poster.isTrending),
    };

    if (!payload.imageUrl) {
      throw new Error('Image URL zaroori hai. Kripya poster image upload karein.');
    }

    let res: any;
    if (poster.id && !poster.id.startsWith('pos_local_') && !poster.id.startsWith('ds_local_')) {
      res = await adminDailyContentApi.updateDailyContent(poster.id, payload);
    } else {
      res = await adminDailyContentApi.createDailyContent(payload);
    }
    notifyContentUpdate();
    return mapBackendToAdminPoster(res);
  },

  /**
   * Deletes poster permanently from DailyContent backend database.
   */
  async deletePoster(id: string): Promise<boolean> {
    await adminDailyContentApi.deleteDailyContent(id);
    notifyContentUpdate();
    return true;
  },
};
