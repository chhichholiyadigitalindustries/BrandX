/**
 * BRANDX Admin Announcement Service
 * Manages in-app popups, notices, feature launches, and maintenance alerts.
 */

import { AdminAnnouncement } from '../types';

const STORAGE_KEY = 'brandx_admin_announcements';

const INITIAL_ANNOUNCEMENTS: AdminAnnouncement[] = [];

function getStoredAnnouncements(): AdminAnnouncement[] {
  if (typeof window === 'undefined') return INITIAL_ANNOUNCEMENTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_ANNOUNCEMENTS;
}

function saveAnnouncements(items: AdminAnnouncement[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }
}

export const announcementService = {
  async getAnnouncements(): Promise<AdminAnnouncement[]> {
    await new Promise((r) => setTimeout(r, 200));
    return getStoredAnnouncements();
  },

  async saveAnnouncement(ann: Partial<AdminAnnouncement>): Promise<AdminAnnouncement> {
    await new Promise((r) => setTimeout(r, 250));
    const list = getStoredAnnouncements();
    let saved: AdminAnnouncement;

    if (ann.id) {
      const idx = list.findIndex((a) => a.id === ann.id);
      if (idx >= 0) {
        saved = { ...list[idx], ...ann } as AdminAnnouncement;
        list[idx] = saved;
      } else {
        saved = { ...ann, id: ann.id, createdAt: new Date().toISOString(), viewsCount: 0, clicksCount: 0 } as AdminAnnouncement;
        list.unshift(saved);
      }
    } else {
      saved = {
        id: `ann_${Date.now()}`,
        title: ann.title || 'New Announcement',
        message: ann.message || '',
        bannerUrl: ann.bannerUrl,
        actionUrl: ann.actionUrl,
        actionLabel: ann.actionLabel,
        priority: ann.priority || 'medium',
        targetAudience: ann.targetAudience || 'all',
        startDate: ann.startDate || new Date().toISOString().split('T')[0],
        endDate: ann.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: ann.status || 'active',
        viewsCount: 0,
        clicksCount: 0,
        createdAt: new Date().toISOString(),
      };
      list.unshift(saved);
    }

    saveAnnouncements(list);
    return saved;
  },

  async deleteAnnouncement(id: string): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    const list = getStoredAnnouncements();
    saveAnnouncements(list.filter((a) => a.id !== id));
    return true;
  },
};
