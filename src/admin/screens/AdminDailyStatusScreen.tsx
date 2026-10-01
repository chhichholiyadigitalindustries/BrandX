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

export const AdminDailyStatusScreen: React.FC = () => {
  const [items, setItems] = useState<AdminDailyStatus[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdminDailyStatus | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useAdminToast();

  // Form states
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTitle, setFormTitle] = useState('');
  const [formHeadline, setFormHeadline] = useState('');
  const [formQuoteHindi, setFormQuoteHindi] = useState('');
  const [formQuoteEnglish, setFormQuoteEnglish] = useState('');
  const [formQuoteHinglish, setFormQuoteHinglish] = useState('');
  const [formLanguage, setFormLanguage] = useState<PosterLanguage>('hi');
  const [formCategory, setFormCategory] = useState<'suvichar' | 'morning' | 'festival' | 'business_tip' | 'motivation'>('suvichar');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const loadData = async () => {
    setIsLoading(false);
    const all = await dailyStatusService.getAll();
    setItems(all);
    if (all.length > 0 && !selectedItem) {
      setSelectedItem(all[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewForm = () => {
    setIsEditing(true);
    setSelectedItem(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTitle('');
    setFormHeadline('');
    setFormQuoteHindi('');
    setFormQuoteEnglish('');
    setFormQuoteHinglish('');
    setFormLanguage('hi');
    setFormCategory('suvichar');
    setFormImageUrl('');
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
    setFormImageUrl(item.imageUrl);
    setFormIsActive(item.isActive);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const res = await imageUploadService.uploadImage(file, 'daily-status');
        setFormImageUrl(res.url);
        showToast('Poster image uploaded successfully!');
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
        title: formTitle,
        headline: formHeadline,
        quoteHindi: formQuoteHindi,
        quoteEnglish: formQuoteEnglish,
        quoteHinglish: formQuoteHinglish,
        language: formLanguage,
        category: formCategory,
        imageUrl: formImageUrl,
        thumbnailUrl: formImageUrl,
        isActive: formIsActive,
        isPublished: true,
      });

      showToast(`Today's Daily Status published successfully!`);
      setIsEditing(false);
      setSelectedItem(saved);
      loadData();
    } catch (err: any) {
      showToast('Failed to save daily status: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this Daily Status?')) {
      await dailyStatusService.delete(id);
      showToast('Daily Status deleted');
      loadData();
    }
  };

  const activeDisplayItem = isEditing
    ? {
        headline: formHeadline || 'शुभ विचार',
        quoteHindi: formQuoteHindi,
        quoteEnglish: formQuoteEnglish,
        quoteHinglish: formQuoteHinglish,
        imageUrl: formImageUrl,
        date: formDate,
        category: formCategory,
        language: formLanguage,
      }
    : selectedItem;

  return (
    <div className="space-y-6">
      {/* Top action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base">Daily Suvichar &amp; 9:16 WhatsApp Poster CMS</h3>
          <p className="text-xs text-gray-400">Content uploaded here appears instantly on all vyapari home screens.</p>
        </div>
        <button
          onClick={openNewForm}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
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
                  className="text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                    Publish Date
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
                    <option value="festival" className="bg-[#0E1424]">Festival Special</option>
                    <option value="business_tip" className="bg-[#0E1424]">Vyapar Growth Tip</option>
                    <option value="motivation" className="bg-[#0E1424]">Daily Motivation</option>
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

                <div>
                  <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                    Hinglish Caption (For WhatsApp Text)
                  </label>
                  <textarea
                    rows={2}
                    value={formQuoteHinglish}
                    onChange={(e) => setFormQuoteHinglish(e.target.value)}
                    placeholder="Shubh Budhwar! Bhagwan Ganesha aapke business me hamesha barkat banaye rakhein."
                    className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Poster 9:16 Image Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Poster Visual / Background Image (9:16 Preferred)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-white/20 hover:border-emerald-400/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/[0.02]">
                    <span className="material-symbols-outlined text-[28px] text-emerald-400 mb-1">cloud_upload</span>
                    <span className="text-xs font-bold text-white">Click to Upload 9:16 Graphic</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP supported</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>

                  {formImageUrl && (
                    <div className="w-16 h-24 rounded-xl border border-white/20 overflow-hidden shrink-0 bg-black">
                      <img src={formImageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                {isUploading && <p className="text-xs text-emerald-400 font-semibold mt-1">Uploading image...</p>}
              </div>

              {/* Direct Image URL option */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5">
                  Or enter Direct Image URL:
                </label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://example.com/poster.jpg"
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit & Publish */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300"
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
              <h4 className="font-bold text-white text-sm tracking-tight">Calendar Content History</h4>
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      selectedItem?.id === item.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-12 h-16 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs truncate">{item.headline}</span>
                          <span className="font-mono text-[10px] text-gray-400">{item.date}</span>
                        </div>
                        <p className="text-[11px] text-gray-300 truncate mt-0.5">{item.quoteHindi}</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                          <span className="text-emerald-400 font-semibold">{item.sharesCount.toLocaleString('en-IN')} shares</span>
                          <span>•</span>
                          <span>{item.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(item);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white"
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
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                        title="Delete"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
              {activeDisplayItem?.imageUrl ? (
                <img
                  src={activeDisplayItem.imageUrl}
                  alt="Live Poster"
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.75]"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-[#0E1424] via-[#131b2e] to-[#0A0D18]" />
              )}

              {/* Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

              {/* Top Header Stamp */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] font-bold text-white uppercase">{activeDisplayItem?.date}</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <span className="text-[9px] font-extrabold text-white">BX</span>
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
