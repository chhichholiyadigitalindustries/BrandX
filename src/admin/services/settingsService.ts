/**
 * BRANDX Admin App Settings & Feature Flags Service
 * Manages platform configuration, AI keys, branding tokens, and modules toggle.
 */

import { AdminSettings } from '../types';

const STORAGE_KEY = 'brandx_admin_settings_v1';

const DEFAULT_SETTINGS: AdminSettings = {
  general: {
    appName: 'BrandX',
    tagline: 'All-in-One Business Super App for Indian Vyaparis, Retailers & MSMEs',
    supportEmail: 'support@brandx.in',
    supportPhone: '+91 98765 43210',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.brandx.app',
    appVersion: '1.3.0',
  },
  branding: {
    primaryColor: '#005338',
    accentColor: '#3525cd',
    logoUrl: '/brandx-logo.png',
    faviconUrl: '/favicon.ico',
  },
  content: {
    autoPublishDailyStatus: true,
    dailyStatusPublishTime: '05:00',
    watermarkEnabled: true,
    watermarkText: 'BrandX Super App',
  },
  featureFlags: {
    dailyStatus: true,
    posterMaker: true,
    aiCopilot: true,
    digitalDukaan: true,
    nfcCards: true,
    qrStudio: true,
    gstBilling: true,
    khataLedger: true,
    voiceToBill: true,
  },
  aiConfig: {
    geminiModel: 'gemini-3.8-flash',
    maxDailyFreePrompts: 15,
    voiceAudioEnabled: true,
  },
  security: {
    requireTwoFactorForAdmins: false,
    sessionTimeoutMinutes: 120,
    maintenanceMode: false,
  },
};

function getStoredSettings(): AdminSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_SETTINGS;
}

export const settingsService = {
  async getSettings(): Promise<AdminSettings> {
    await new Promise((r) => setTimeout(r, 150));
    return getStoredSettings();
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    await new Promise((r) => setTimeout(r, 300));
    const current = getStoredSettings();
    const merged: AdminSettings = {
      ...current,
      ...settings,
      general: { ...current.general, ...(settings.general || {}) },
      branding: { ...current.branding, ...(settings.branding || {}) },
      content: { ...current.content, ...(settings.content || {}) },
      featureFlags: { ...current.featureFlags, ...(settings.featureFlags || {}) },
      aiConfig: { ...current.aiConfig, ...(settings.aiConfig || {}) },
      security: { ...current.security, ...(settings.security || {}) },
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {}
    }

    return merged;
  },
};
