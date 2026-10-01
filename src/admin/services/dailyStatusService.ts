/**
 * BRANDX Admin Daily Status & Suvichar CMS Service
 * Connects directly to backend PostgreSQL + Prisma DailyContent CMS
 */

import { AdminDailyStatus } from '../types';
import { adminDailyContentApi } from './adminDailyContentApi';

const STORAGE_KEY = 'brandx_admin_daily_status_cache';

function getCachedStatuses(): AdminDailyStatus[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveToCache(items: AdminDailyStatus[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }
}

function mapBackendToAdminStatus(b: any): AdminDailyStatus {
  return {
    id: b.id,
    date: b.date || (b.contentDate ? b.contentDate.split('T')[0] : new Date().toISOString().split('T')[0]),
    title: b.title,
    headline: b.headline || b.title,
    quoteHindi: b.quoteHindi || b.contentText || '',
    quoteEnglish: b.quoteEnglish || undefined,
    quoteHinglish: b.quoteHinglish || undefined,
    language: (b.language || 'hi').toLowerCase() as any,
    category: (b.category || 'suvichar') as any,
    imageUrl: b.imageUrl,
    thumbnailUrl: b.thumbnailUrl || b.imageUrl,
    aspectRatio: b.aspectRatio || '9:16',
    isActive: b.isActive !== false,
    isPublished: b.isPublished !== false,
    publishDateTime: b.publishAt || b.publishDateTime || b.createdAt,
    sharesCount: b.sharesCount || 0,
    downloadsCount: b.downloadsCount || 0,
    tags: b.tags || [],
    authorAdminId: b.authorAdminId || b.createdBy || 'adm_system',
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export const dailyStatusService = {
  async getAll(): Promise<AdminDailyStatus[]> {
    try {
      const res = await adminDailyContentApi.listDailyContent({ limit: 100 });
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        const mapped = res.items.map(mapBackendToAdminStatus);
        saveToCache(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Backend daily content fetch failed, using cache:', e);
    }
    return getCachedStatuses();
  },

  async getTodayStatus(): Promise<AdminDailyStatus | null> {
    const items = await this.getAll();
    const today = new Date().toISOString().split('T')[0];
    return items.find((i) => i.date === today && i.isActive) || items[0] || null;
  },

  async getById(id: string): Promise<AdminDailyStatus | null> {
    try {
      const item = await adminDailyContentApi.getDailyContentById(id);
      if (item) return mapBackendToAdminStatus(item);
    } catch {
      const cached = getCachedStatuses();
      return cached.find((i) => i.id === id) || null;
    }
    return null;
  },

  async save(status: Partial<AdminDailyStatus>): Promise<AdminDailyStatus> {
    const payload = {
      title: status.title || 'Daily Status',
      headline: status.headline,
      quoteHindi: status.quoteHindi,
      quoteEnglish: status.quoteEnglish,
      quoteHinglish: status.quoteHinglish,
      contentText: status.quoteHindi,
      language: status.language || 'hi',
      category: status.category || 'suvichar',
      imageUrl: status.imageUrl,
      thumbnailUrl: status.thumbnailUrl || status.imageUrl,
      aspectRatio: status.aspectRatio || '9:16',
      date: status.date || new Date().toISOString().split('T')[0],
      isPublished: status.isPublished ?? true,
      isActive: status.isActive ?? true,
      publishAt: status.publishDateTime || new Date().toISOString(),
      tags: status.tags || [],
    };

    let savedItem: AdminDailyStatus;

    try {
      if (status.id && !status.id.startsWith('ds_local_')) {
        const res = await adminDailyContentApi.updateDailyContent(status.id, payload);
        savedItem = mapBackendToAdminStatus(res);
      } else {
        const res = await adminDailyContentApi.createDailyContent(payload);
        savedItem = mapBackendToAdminStatus(res);
      }
    } catch (e) {
      console.warn('Direct backend save failed, updating cache:', e);
      savedItem = {
        id: status.id || `ds_local_${Date.now()}`,
        date: payload.date,
        title: payload.title,
        headline: payload.headline || '',
        quoteHindi: payload.quoteHindi || '',
        quoteEnglish: payload.quoteEnglish,
        quoteHinglish: payload.quoteHinglish,
        language: payload.language as any,
        category: payload.category as any,
        imageUrl: payload.imageUrl || '',
        thumbnailUrl: payload.thumbnailUrl || '',
        aspectRatio: payload.aspectRatio as any,
        isActive: payload.isActive,
        isPublished: payload.isPublished,
        publishDateTime: payload.publishAt,
        sharesCount: status.sharesCount || 0,
        downloadsCount: status.downloadsCount || 0,
        tags: payload.tags,
        authorAdminId: 'adm_local',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const items = getCachedStatuses();
    const idx = items.findIndex((i) => i.id === savedItem.id);
    if (idx >= 0) items[idx] = savedItem;
    else items.unshift(savedItem);
    saveToCache(items);

    return savedItem;
  },

  async delete(id: string): Promise<boolean> {
    try {
      if (!id.startsWith('ds_local_')) {
        await adminDailyContentApi.deleteDailyContent(id);
      }
    } catch (e) {
      console.warn('Backend delete failed:', e);
    }
    const items = getCachedStatuses();
    saveToCache(items.filter((i) => i.id !== id));
    return true;
  },
};
