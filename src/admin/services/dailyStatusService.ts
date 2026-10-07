/**
 * BRANDX Admin Daily Status & Suvichar CMS Service
 * Connects directly to backend PostgreSQL + Prisma DailyContent CMS (Single Source of Truth)
 */

import { AdminDailyStatus } from '../types';
import { adminDailyContentApi } from './adminDailyContentApi';
import { getIndiaDateString } from '../../utils/timezone';

function mapBackendToAdminStatus(b: any): AdminDailyStatus {
  const dateStr = b.date || (b.contentDate ? b.contentDate.split('T')[0] : getIndiaDateString());
  return {
    id: b.id,
    date: dateStr,
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
    tier: b.tier,
    status: b.status,
    visibility: b.visibility,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export const dailyStatusService = {
  /**
   * Fetches all daily content records from the backend database.
   * Never returns fake fallback data. If database is empty, returns empty list.
   */
  async getAll(): Promise<AdminDailyStatus[]> {
    try {
      const res = await adminDailyContentApi.listDailyContent({ limit: 100 });
      if (res && Array.isArray(res.items)) {
        return res.items.map(mapBackendToAdminStatus);
      }
      return [];
    } catch (e: any) {
      console.error('[dailyStatusService] Failed to fetch daily content from backend:', e);
      throw new Error(e?.message || 'Daily content backend se load nahi ho saka');
    }
  },

  /**
   * Gets today's morning content based on Asia/Kolkata date
   */
  async getTodayStatus(): Promise<AdminDailyStatus | null> {
    const items = await this.getAll();
    const today = getIndiaDateString();
    return items.find((i) => i.date === today && i.isActive) || items[0] || null;
  },

  /**
   * Gets a specific daily content record by its backend ID
   */
  async getById(id: string): Promise<AdminDailyStatus | null> {
    try {
      const item = await adminDailyContentApi.getDailyContentById(id);
      if (item) return mapBackendToAdminStatus(item);
    } catch (e) {
      console.error(`[dailyStatusService] Failed to fetch item ${id}:`, e);
    }
    return null;
  },

  /**
   * Saves or updates daily content permanently in the backend database.
   * Throws an explicit error if database save fails.
   */
  async save(status: Partial<AdminDailyStatus>): Promise<AdminDailyStatus> {
    const payload = {
      title: status.title || 'Daily Status',
      headline: status.headline || status.title || 'Daily Status',
      quoteHindi: status.quoteHindi || '',
      quoteEnglish: status.quoteEnglish,
      quoteHinglish: status.quoteHinglish,
      contentText: status.quoteHindi || '',
      language: status.language || 'hi',
      category: status.category || 'suvichar',
      imageUrl: status.imageUrl,
      thumbnailUrl: status.thumbnailUrl || status.imageUrl,
      aspectRatio: status.aspectRatio || '9:16',
      date: status.date || getIndiaDateString(),
      isPublished: status.isPublished ?? true,
      isActive: status.isActive ?? true,
      publishAt: status.publishDateTime || new Date().toISOString(),
      tags: status.tags || [],
      tier: status.tier || 'FREE',
      status: status.status || 'PUBLISHED',
      visibility: status.visibility || 'PUBLIC',
    };

    if (!payload.imageUrl) {
      throw new Error('Image URL zaroori hai. Kripya pehle image upload karein.');
    }

    let result: any;
    if (status.id && !status.id.startsWith('ds_local_')) {
      const res = await adminDailyContentApi.updateDailyContent(status.id, payload);
      result = mapBackendToAdminStatus(res);
    } else {
      const res = await adminDailyContentApi.createDailyContent(payload);
      result = mapBackendToAdminStatus(res);
    }
    notifyContentUpdate();
    return result;
  },

  /**
   * Deletes daily content permanently from backend database.
   */
  async delete(id: string): Promise<boolean> {
    await adminDailyContentApi.deleteDailyContent(id);
    notifyContentUpdate();
    return true;
  },
};

export function notifyContentUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('brandx:daily-content-updated'));
    window.dispatchEvent(new CustomEvent('brandx:posters-updated'));
    try {
      const bc = new BroadcastChannel('brandx_content_sync');
      bc.postMessage({ type: 'CONTENT_UPDATED', timestamp: Date.now() });
      bc.close();
    } catch {}
  }
}
