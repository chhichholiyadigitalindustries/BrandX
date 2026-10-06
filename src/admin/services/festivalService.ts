/**
 * BRANDX Admin Festival Management Service
 * Connects directly to backend PostgreSQL + Prisma Festival CMS (Single Source of Truth)
 */

import { AdminFestival } from '../types';
import { adminDailyContentApi } from './adminDailyContentApi';

function mapBackendToAdminFestival(b: any): AdminFestival {
  return {
    id: b.id,
    name: b.name,
    hindiName: b.hindiName || '',
    date: b.date || (b.festivalDate ? b.festivalDate.split('T')[0] : new Date().toISOString().split('T')[0]),
    description: b.description || '',
    bannerImageUrl: b.imageUrl || b.bannerUrl || '',
    postersCount: b.contentAssets?.length || 0,
    isActive: b.isActive !== false,
    priority: b.priority || 1,
    greetings: {
      hindi: b.description || 'त्योहार की हार्दिक शुभकामनाएं।',
      english: 'Warm festive greetings for joy and prosperity.',
    },
    tags: b.tags || ['Festival'],
  };
}

export const festivalService = {
  /**
   * Fetches festivals from backend database.
   * Never returns fake fallback data.
   */
  async getFestivals(): Promise<AdminFestival[]> {
    try {
      const res = await adminDailyContentApi.listFestivals();
      if (Array.isArray(res)) {
        return res.map(mapBackendToAdminFestival);
      }
      return [];
    } catch (e: any) {
      console.error('[festivalService] Failed to fetch festivals from backend:', e);
      return [];
    }
  },

  /**
   * Saves or updates festival in backend database.
   * Throws on failure.
   */
  async saveFestival(fest: Partial<AdminFestival>): Promise<AdminFestival> {
    const payload = {
      name: fest.name || 'New Festival',
      hindiName: fest.hindiName,
      description: fest.description,
      festivalDate: fest.date || new Date().toISOString().split('T')[0],
      date: fest.date || new Date().toISOString().split('T')[0],
      imageUrl: fest.bannerImageUrl,
      bannerUrl: fest.bannerImageUrl,
      priority: fest.priority || 1,
      tags: fest.tags || ['Festival'],
      isActive: fest.isActive ?? true,
    };

    if (fest.id && !fest.id.startsWith('fest_local_')) {
      const res = await adminDailyContentApi.updateFestival(fest.id, payload);
      return mapBackendToAdminFestival(res);
    } else {
      const res = await adminDailyContentApi.createFestival(payload);
      return mapBackendToAdminFestival(res);
    }
  },

  /**
   * Deletes festival permanently from backend database.
   */
  async deleteFestival(id: string): Promise<boolean> {
    await adminDailyContentApi.deleteFestival(id);
    return true;
  },
};
