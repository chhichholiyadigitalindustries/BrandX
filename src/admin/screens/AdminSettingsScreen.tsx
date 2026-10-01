/**
 * BRANDX Admin Settings Screen (/admin/settings)
 * Global feature flags, branding configuration, Gemini AI limits, and security toggles.
 */

import React, { useEffect, useState } from 'react';
import { settingsService } from '../services/settingsService';
import { AdminSettings } from '../types';
import { useAdminToast } from '../components/AdminToast';

export const AdminSettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useAdminToast();

  useEffect(() => {
    settingsService.getSettings().then((res) => {
      setSettings(res);
      setIsLoading(false);
    });
  }, []);

  const handleToggleFeature = (key: keyof AdminSettings['featureFlags']) => {
    if (!settings) return;
    const updated = {
      ...settings,
      featureFlags: {
        ...settings.featureFlags,
        [key]: !settings.featureFlags[key],
      },
    };
    setSettings(updated);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await settingsService.updateSettings(settings);
      showToast('BrandX settings and feature flags updated!');
    } catch (err: any) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="py-16 text-center text-gray-400">Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base">Global App Settings &amp; Feature Flags</h3>
          <p className="text-xs text-gray-400">Configure real-time super app feature toggles, AI parameters and branding.</p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-extrabold text-xs shadow-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[18px]">save</span>
          )}
          <span>Save Changes</span>
        </button>
      </div>

      {/* Feature Flags Section */}
      <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div>
          <h4 className="font-extrabold text-white text-sm">Super App Feature Flags</h4>
          <p className="text-xs text-gray-400">Enable or disable modules dynamically in user devices without app updates.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {[
            { key: 'dailyStatus', label: 'Daily Status & Suvichar', icon: 'calendar_month' },
            { key: 'posterMaker', label: 'Poster Studio & Templates', icon: 'photo_library' },
            { key: 'gstBilling', label: 'GST Tax Invoice & Billing', icon: 'receipt_long' },
            { key: 'khataLedger', label: 'Digital Khata Ledger', icon: 'menu_book' },
            { key: 'aiCopilot', label: 'Biz AI Copilot', icon: 'auto_awesome' },
            { key: 'voiceToBill', label: 'Voice-to-Bill Audio Transcriber', icon: 'mic' },
            { key: 'digitalDukaan', label: 'Digital Dukaan & E-Catalog', icon: 'storefront' },
            { key: 'nfcCards', label: 'NFC Smart Visiting Card', icon: 'contactless' },
            { key: 'qrStudio', label: 'UPI QR Acrylic Standee', icon: 'qr_code_2' },
          ].map((feat) => {
            const isEnabled = (settings.featureFlags as any)[feat.key];
            return (
              <div
                key={feat.key}
                onClick={() => handleToggleFeature(feat.key as any)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-white/[0.02] border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px]">{feat.icon}</span>
                  <span className="font-bold text-white text-xs truncate">{feat.label}</span>
                </div>
                <div
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                    isEnabled ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Engine & Gemini Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h4 className="font-extrabold text-white text-sm">AI Engine &amp; Quota Configuration</h4>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Gemini Model Version
              </label>
              <input
                type="text"
                value={settings.aiConfig.geminiModel}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiConfig: { ...settings.aiConfig, geminiModel: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Free Tier Daily Prompt Limit (per vyapari)
              </label>
              <input
                type="number"
                value={settings.aiConfig.maxDailyFreePrompts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiConfig: { ...settings.aiConfig, maxDailyFreePrompts: parseInt(e.target.value) || 15 },
                  })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* General App Info */}
        <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h4 className="font-extrabold text-white text-sm">Brand &amp; Support Info</h4>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">App Name</label>
              <input
                type="text"
                value={settings.general.appName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, appName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Support Email</label>
              <input
                type="email"
                value={settings.general.supportEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    general: { ...settings.general, supportEmail: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
