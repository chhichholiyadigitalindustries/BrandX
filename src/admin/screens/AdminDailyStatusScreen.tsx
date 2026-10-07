/**
 * BRANDX Admin Daily Status & Suvichar CMS (/admin/daily-status)
 * Allows Admin to upload today's morning poster, set quotes in Hindi/English/Hinglish,
 * preview exact 9:16 mobile poster, and publish live to all user devices.
 */

import React, { useEffect, useState } from 'react';
import { dailyStatusService } from '../services/dailyStatusService';
import { imageUploadService } from '../services/imageUploadService';
import { AdminDailyStatus, PosterLanguage } from '../types';
import { useAdminToast } from '../components/AdminToast';
import { resolveImageUrl } from '../../utils/imageUrl';
import { getIndiaDateString } from '../../utils/timezone';

export const AdminDailyStatusScreen: React.FC = () => {
  const [items, setItems] = useState<AdminDailyStatus[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdminDailyStatus | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useAdminToast();

  // Form states
  const [formDate, setFormDate] = useState(getIndiaDateString());
  const [formTitle, setFormTitle] = useState('');
  const [formHeadline, setFormHeadline] = useState('');
  const [formQuoteHindi, setFormQuoteHindi] = useState('');
  const [formQuoteEnglish, setFormQuoteEnglish] = useState('');
  const [formQuoteHinglish, setFormQuoteHinglish] = useState('');
  const [formLanguage, setFormLanguage] = useState<PosterLanguage>('hi');
  const [formCategory, setFormCategory] = useState<'suvichar' | 'morning' | 'festival' | 'business_tip' | 'motivation'>('suvichar');
  const [formTier, setFormTier] = useState<'FREE' | 'PRO'>('FREE');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const all = await dailyStatusService.getAll();
      setItems(all);
      if (all.length > 0 && !selectedItem) {
        setSelectedItem(all[0]);
      }
    } catch (e: any) {
      showToast(e?.message || 'Daily content load karne me samasya aayi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPreviewLoadError(false);
  }, [activeDisplayItem?.imageUrl]);

  const openNewForm = () => {
    setIsEditing(true);
    setSelectedItem(null);
    setFormDate(getIndiaDateString());
    setFormTitle('');
    setFormHeadline('');
    setFormQuoteHindi('');
    setFormQuoteEnglish('');
    setFormQuoteHinglish('');
    setFormLanguage('hi');
    setFormCategory('suvichar');
    setFormTier('FREE');
    setFormImageUrl('');
    setLocalPreviewUrl(null);
    setPreviewLoadError(false);
    setFormIsActive(true);
  };

  const openEditForm = (item: AdminDailyStatus) => {
    setIsEditing(true);
    setSelectedItem(item);
    setFormDate(item.date);
    setFormTitle(item.title);
    setFormHeadline(item.headline);
    setFormQuoteHindi(item.quoteHindi);
    setFormQuoteEnglish(item.quoteEnglish || '');
    setFormQuoteHinglish(item.quoteHinglish || '');
    setFormLanguage(item.language);
    setFormCategory(item.category);
    setFormTier(item.tier === 'PRO' ? 'PRO' : 'FREE');
    setFormImageUrl(item.imageUrl);
    setLocalPreviewUrl(null);
    setPreviewLoadError(false);
    setFormIsActive(item.isActive);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Create local blob preview URL for 0ms instantaneous rendering
      const objectUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objectUrl);
      setPreviewLoadError(false);

      setIsUploading(true);
      try {
        const res = await imageUploadService.uploadImage(file, 'daily-status');
        setFormImageUrl(res.url);
        showToast('Poster image permanently uploaded and stored in database!');
      } catch (err: any) {
        showToast(err.message || 'Image upload failed', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuoteHindi && !formHeadline) {
      showToast('Kripya Headline ya Hindi Suvichar bharein', 'error');
      return;
    }
    if (!formImageUrl) {
      showToast('Please upload or provide a status image URL', 'error');
      return;
    }

    try {
      const saved = await dailyStatusService.save({
        id: selectedItem?.id,
        date: formDate,
        title: formTitle || formHeadline || 'Morning Suvichar',
        headline: formHeadline || 'Morning Suvichar',
        quoteHindi: formQuoteHindi,
        quoteEnglish: formQuoteEnglish,
        quoteHinglish: formQuoteHinglish,
        language: formLanguage,
        category: formCategory,
        tier: formTier,
        imageUrl: formImageUrl,
        thumbnailUrl: formImageUrl,
        isActive: formIsActive,
        isPublished: true,
      });

      showToast(`Today's Daily Status published successfully to backend database!`);
      setIsEditing(false);
      setSelectedItem(saved);
      loadData();
    } catch (err: any) {
      showToast('Failed to save daily status: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this Daily Status?')) {
      try {
        await dailyStatusService.delete(id);
        showToast('Daily Status permanently deleted');
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
        loadData();
      } catch (err: any) {
        showToast('Delete failed: ' + err.message, 'error');
      }
    }
  };

  const activeDisplayItem = isEditing
    ? {
        headline: formHeadline || 'शुभ विचार',
        quoteHindi: formQuoteHindi,
        quoteEnglish: formQuoteEnglish,
        quoteHinglish: formQuoteHinglish,
        imageUrl: localPreviewUrl || formImageUrl,
        date: formDate,
        category: formCategory,
        tier: formTier,
        language: formLanguage,
      }
    : selectedItem;

  return (
    <div className="space-y-6">
      {/* Top action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base">Daily Suvichar &amp; 9:16 WhatsApp Poster CMS</h3>
          <p className="text-xs text-gray-400">Content uploaded here is permanently stored in PostgreSQL and synced to all user apps in real time.</p>
        </div>
        <button
          onClick={openNewForm}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Create New Daily Status</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & History List */}
        <div className="lg:col-span-7 space-y-6">
          {isEditing ? (
            /* Upload / Edit Form */
            <form onSubmit={handleSave} className="bg-[#0E1424] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h4 className="font-bold text-white text-sm">
                  {selectedItem ? 'Edit Daily Status' : 'Create & Publish Daily Poster'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Publish Date (IST)
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="suvichar" className="bg-[#0E1424]">Morning Suvichar</option>
                    <option value="morning" className="bg-[#0E1424]">Daily Morning</option>
                    <option value="festival" className="bg-[#0E1424]">Festival Special</option>
                    <option value="business_tip" className="bg-[#0E1424]">Vyapar Growth Tip</option>
                    <option value="motivation" className="bg-[#0E1424]">Daily Motivation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    User Tier Access
                  </label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FREE" className="bg-[#0E1424]">FREE (All Users)</option>
                    <option value="PRO" className="bg-[#0E1424]">PRO Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Poster Headline
                </label>
                <input
                  type="text"
                  required
                  value={formHeadline}
                  onChange={(e) => setFormHeadline(e.target.value)}
                  placeholder="e.g. शुभ बुधवार ✨ or शुभ प्रभात 🌅"
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Multi-language Quote Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Hindi Suvichar (Primary)</span>
                    <span className="text-[10px] text-gray-400">Main Poster Quote</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formQuoteHindi}
                    onChange={(e) => setFormQuoteHindi(e.target.value)}
                    placeholder="भगवान श्री गणेश जी आपके व्यापार में आने वाले सभी विघ्नों को दूर करें..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                    English Translation (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formQuoteEnglish}
                    onChange={(e) => setFormQuoteEnglish(e.target.value)}
                    placeholder="May Lord Ganesha remove all obstacles and bless your business with growth."
                    className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Upload Image Widget */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Permanent Poster Image (HD 9:16 recommended)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 cursor-pointer"
                  />
                  {isUploading && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></span>
                      Permanently storing in PostgreSQL...
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">
                    Or Direct Image Storage URL:
                  </label>
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="/api/v1/daily-content/media/... or https://..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {(localPreviewUrl || formImageUrl) && (
                  <div className="mt-3 flex items-center gap-3 bg-black/40 p-2.5 rounded-xl border border-white/10">
                    <div className="w-16 h-24 rounded-lg overflow-hidden border border-emerald-500/40 bg-black shrink-0 relative">
                      <img
                        src={localPreviewUrl || resolveImageUrl(formImageUrl)}
                        alt="Poster Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Poster Image Loaded</span>
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">
                        {formImageUrl || 'Local image selected for upload'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalPreviewUrl(null);
                          setFormImageUrl('');
                          setPreviewLoadError(false);
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit & Publish */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-extrabold text-xs shadow-xl flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  <span>Publish to BrandX Super App</span>
                </button>
              </div>
            </form>
          ) : (
            /* Historical List of Daily Statuses */
            <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm tracking-tight">Calendar Content History ({items.length})</h4>
                <button
                  onClick={loadData}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Refresh from Database"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading daily content from database...
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl text-gray-500 mb-2 block">event_busy</span>
                  <p className="font-bold text-white text-sm">No morning content available yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Create New Daily Status" above to upload content.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setPreviewLoadError(false);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        selectedItem?.id === item.id
                          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={resolveImageUrl(item.imageUrl)}
                          alt=""
                          className="w-12 h-16 rounded-xl object-cover border border-white/10 shrink-0 bg-slate-900"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate">{item.headline}</span>
                            <span className="font-mono text-[10px] text-gray-400">{item.date}</span>
                            {item.tier === 'PRO' && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-400/20 text-amber-300 font-bold text-[9px]">
                                PRO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-300 truncate mt-0.5">{item.quoteHindi}</p>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                            <span className="text-emerald-400 font-semibold">{item.sharesCount || 0} shares</span>
                            <span>•</span>
                            <span className="capitalize">{item.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(item);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white cursor-pointer"
                          title="Edit"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 cursor-pointer"
                          title="Delete"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Live 9:16 Mobile WhatsApp Poster Simulation */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="sticky top-20 w-full max-w-[320px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>User App Live Preview (9:16)</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono">1080x1920 HD</span>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-4 border-[#1e293b] bg-black flex flex-col justify-between p-4 text-white">
              {/* Poster Background Image */}
              {activeDisplayItem?.imageUrl && !previewLoadError ? (
                <img
                  src={
                    activeDisplayItem.imageUrl.startsWith('blob:') || activeDisplayItem.imageUrl.startsWith('data:')
                      ? activeDisplayItem.imageUrl
                      : resolveImageUrl(activeDisplayItem.imageUrl)
                  }
                  alt="Live Poster"
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.80]"
                  onError={() => {
                    console.warn('[POSTER_PREVIEW_LOAD_ERROR] Failed:', activeDisplayItem.imageUrl);
                    setPreviewLoadError(true);
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-[#0E1424] via-[#131b2e] to-[#0A0D18] flex items-center justify-center">
                  <div className="text-center p-4">
                    <span className="material-symbols-outlined text-4xl text-gray-600 mb-1">add_photo_alternate</span>
                    <p className="text-[11px] text-gray-400 font-medium">9:16 WhatsApp Poster Preview</p>
                  </div>
                </div>
              )}

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

              {/* Top Header Stamp */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] font-bold text-white uppercase">{activeDisplayItem?.date || getIndiaDateString()}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center p-1">
                  <img src="/brandx-logo.png" alt="BrandX" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Center Quote */}
              <div className="relative z-10 text-center px-2 py-4">
                <h3 className="font-extrabold text-lg sm:text-xl text-amber-300 drop-shadow-md leading-tight mb-2">
                  {activeDisplayItem?.headline || 'शुभ विचार'}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-white/95 leading-relaxed drop-shadow-lg">
                  "{activeDisplayItem?.quoteHindi || 'कर्म ही पूजा है।'}"
                </p>
                {activeDisplayItem?.quoteEnglish && (
                  <p className="text-[10px] text-white/80 italic mt-2 drop-shadow">
                    {activeDisplayItem.quoteEnglish}
                  </p>
                )}
              </div>

              {/* Bottom Simulated Business Stamp (as seen in user app) */}
              <div className="relative z-10 bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-xs text-white truncate">Sharma Photo Studio &amp; Print</p>
                  <p className="text-[9px] text-gray-300 truncate">📞 +91 94140 12345 • Jaipur</p>
                </div>
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[14px] text-emerald-300">share</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
