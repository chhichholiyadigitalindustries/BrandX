/**
 * BRANDX Admin Festival Management Service
 * Connects directly to backend PostgreSQL + Prisma Festival CMS
 */

import { AdminFestival } from '../types';
import { adminDailyContentApi } from './adminDailyContentApi';

const STORAGE_KEY = 'brandx_admin_festivals_cache';

function getCachedFestivals(): AdminFestival[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveToCache(items: AdminFestival[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }
}

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
  async getFestivals(): Promise<AdminFestival[]> {
    try {
      const res = await adminDailyContentApi.listFestivals();
      if (Array.isArray(res) && res.length > 0) {
        const mapped = res.map(mapBackendToAdminFestival);
        saveToCache(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Backend festival fetch failed, using cache:', e);
    }
    return getCachedFestivals();
  },

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

    let savedItem: AdminFestival;

    try {
      if (fest.id && !fest.id.startsWith('fest_local_')) {
        const res = await adminDailyContentApi.updateFestival(fest.id, payload);
        savedItem = mapBackendToAdminFestival(res);
      } else {
        const res = await adminDailyContentApi.createFestival(payload);
        savedItem = mapBackendToAdminFestival(res);
      }
    } catch (e) {
      console.warn('Backend festival save failed, updating cache:', e);
      savedItem = {
        id: fest.id || `fest_local_${Date.now()}`,
        name: payload.name,
        hindiName: payload.hindiName || '',
        date: payload.date,
        description: payload.description || '',
        bannerImageUrl: payload.imageUrl || '',
        postersCount: fest.postersCount || 0,
        isActive: payload.isActive,
        priority: payload.priority,
        greetings: fest.greetings || {
          hindi: 'त्योहार की हार्दिक शुभकामनाएं।',
          english: 'Warm festive greetings.',
        },
        tags: payload.tags,
      };
    }

    const items = getCachedFestivals();
    const idx = items.findIndex((i) => i.id === savedItem.id);
    if (idx >= 0) items[idx] = savedItem;
    else items.unshift(savedItem);
    saveToCache(items);

    return savedItem;
  },

  async deleteFestival(id: string): Promise<boolean> {
    try {
      if (!id.startsWith('fest_local_')) {
        await adminDailyContentApi.deleteFestival(id);
      }
    } catch (e) {
      console.warn('Backend festival delete failed:', e);
    }
    const items = getCachedFestivals();
    saveToCache(items.filter((i) => i.id !== id));
    return true;
  },
};
