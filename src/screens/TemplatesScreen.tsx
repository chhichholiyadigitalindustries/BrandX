import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { APP_IMAGES, POSTER_IMAGES } from '../data/mockData';
import { TemplateItem, DailyCalendarItem, BusinessProfile, KhataCustomer, InvoiceData, StoreProduct, ScreenId } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { EmptyState } from '../components/EmptyState';
import { getDynamicDailyPosters, HINDI_DAYS } from '../utils/dailyPosters';
import { generateDailySuvichar } from '../services/geminiService';
import { shareDailyPosterToWhatsApp, generateBrandedPosterBlob } from '../utils/posterShare';
import { WhatsAppShareGuideModal } from '../components/WhatsAppShareGuideModal';
import { dailyContentApi } from '../services/dailyContentApi';
import { resolveImageUrl } from '../utils/imageUrl';
import { getIndiaDateString } from '../utils/timezone';

interface TemplatesScreenProps {
  business?: BusinessProfile;
  customers?: KhataCustomer[];
  invoice?: InvoiceData;
  products?: StoreProduct[];
  onSelectTemplate: (template: TemplateItem) => void;
  onOpenPro: () => void;
  onOpenDailyStatus?: (item: DailyCalendarItem) => void;
  onNavigate?: (screen: ScreenId) => void;
}

export const TemplatesScreen: React.FC<TemplatesScreenProps> = ({
  business,
  customers = [],
  invoice,
  products = [],
  onSelectTemplate,
  onOpenPro,
  onOpenDailyStatus,
  onNavigate,
}) => {
  const { t } = useLanguage();
  const [activeMainTab, setActiveMainTab] = useState<'templates' | 'calendar'>('templates');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({ 'diwali-50': true });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic 365 Days Daily Posters State
  const [dailyOffset, setDailyOffset] = useState(0);
  const [dailySubTab, setDailySubTab] = useState<'today' | 'tomorrow' | 'festivals'>('today');
  const [isGeneratingAiSuvichar, setIsGeneratingAiSuvichar] = useState(false);
  const [customAiPosters, setCustomAiPosters] = useState<DailyCalendarItem[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Real Database CMS Content State
  const [backendTodayPosters, setBackendTodayPosters] = useState<DailyCalendarItem[]>([]);
  const [backendTomorrowPosters, setBackendTomorrowPosters] = useState<DailyCalendarItem[]>([]);
  const [backendFestivalPosters, setBackendFestivalPosters] = useState<DailyCalendarItem[]>([]);
  const [backendTemplates, setBackendTemplates] = useState<TemplateItem[]>([]);
  const [hasLoadedBackend, setHasLoadedBackend] = useState(false);
  const [dbCategories, setDbCategories] = useState<{ label: string; icon?: string }[]>([]);

  const [whatsAppGuide, setWhatsAppGuide] = useState<{
    isOpen: boolean;
    caption: string;
    imageUrl: string;
    title: string;
  }>({
    isOpen: false,
    caption: '',
    imageUrl: '',
    title: '',
  });

  // 365 Days Dynamic Daily Posters Engine
  const {
    todayPosters: baseTodayPosters,
    tomorrowPosters,
    festivalPosters,
    todayFormatted,
    tomorrowFormatted,
    todayHindiDate,
  } = getDynamicDailyPosters(dailyOffset);

  React.useEffect(() => {
    let isMounted = true;
    async function fetchCmsData() {
      try {
        const todayStr = getIndiaDateString();
        const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const tomorrowDateStr = getIndiaDateString(tomorrowDate);

        const [todayRes, tomorrowList, fests, postersRes, catsRes] = await Promise.all([
          dailyContentApi.getTodayContent({ date: todayStr }),
          dailyContentApi.getContentByDate(tomorrowDateStr),
          dailyContentApi.listFestivals(),
          dailyContentApi.listPosters({
            categoryId: activeCategory !== 'All' ? activeCategory : undefined,
            search: searchQuery || undefined,
          }),
          dailyContentApi.listCategories(),
        ]);

        if (!isMounted) return;

        if (todayRes) {
          setBackendTodayPosters([
            {
              id: todayRes.id,
              title: todayRes.title,
              category: 'Daily Suvichar',
              dateLabel: `आज (${todayHindiDate})`,
              imageUrl: resolveImageUrl(todayRes.imageUrl),
              headline: todayRes.headline || todayRes.title,
              subheadline: todayRes.quoteHindi || todayRes.contentText || '',
              quoteHindi: todayRes.quoteHindi || todayRes.contentText || undefined,
              badge: todayRes.contentType || 'TODAY STATUS',
            },
          ]);
        } else {
          setBackendTodayPosters([]);
        }

        if (tomorrowList && tomorrowList.length > 0) {
          setBackendTomorrowPosters(
            tomorrowList.map((t) => ({
              id: t.id,
              title: t.title,
              category: 'Daily Suvichar',
              dateLabel: `कल (${tomorrowFormatted})`,
              imageUrl: resolveImageUrl(t.imageUrl),
              headline: t.headline || t.title,
              subheadline: t.quoteHindi || t.contentText || '',
              quoteHindi: t.quoteHindi || t.contentText || undefined,
              badge: t.contentType || 'TOMORROW',
            }))
          );
        } else {
          setBackendTomorrowPosters([]);
        }

        if (fests && fests.length > 0) {
          setBackendFestivalPosters(
            fests.map((f) => ({
              id: f.id,
              title: f.name,
              category: 'Festival',
              dateLabel: f.festivalDate ? f.festivalDate.split('T')[0] : 'Upcoming',
              imageUrl: resolveImageUrl(f.imageUrl || f.bannerUrl || POSTER_IMAGES.morningSuvichar || ''),
              headline: f.hindiName || f.name,
              subheadline: f.description || 'Festive greetings for your business',
              quoteHindi: f.description || undefined,
              badge: 'FESTIVAL',
            }))
          );
        } else {
          setBackendFestivalPosters([]);
        }

        if (postersRes?.items && postersRes.items.length > 0) {
          setBackendTemplates(
            postersRes.items.map((p: any) => ({
              id: p.id,
              title: p.title || p.headline || 'Poster',
              category: p.category || p.categoryRel?.name || (typeof p.category === 'string' ? p.category : '') || p.contentType || 'General',
              categoryIcon: '🎨',
              tier: p.tier || 'FREE',
              format: (p.aspectRatio === '9:16' ? 'Story 9:16' : '1:1 Sq') as any,
              imageUrl: resolveImageUrl(p.imageUrl),
              headlineDefault: p.headline || p.title,
              subheadlineDefault: p.quoteHindi || p.description || undefined,
              createdAt: p.createdAt,
            }))
          );
        } else {
          setBackendTemplates([]);
        }

        if (catsRes && catsRes.length > 0) {
          setDbCategories([
            { label: 'All' },
            ...catsRes.map((c) => ({ label: c.name, icon: '🏷️' })),
          ]);
        }

        setHasLoadedBackend(true);
      } catch {
        if (isMounted) setHasLoadedBackend(true);
      }
    }
    fetchCmsData();

    // Real-time synchronization: listen for Daily Status / Poster CMS updates
    const handleSync = () => {
      fetchCmsData();
    };
    window.addEventListener('brandx:daily-content-updated', handleSync);
    window.addEventListener('brandx:posters-updated', handleSync);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('brandx_content_sync');
      bc.onmessage = () => {
        fetchCmsData();
      };
    } catch {}

    return () => {
      isMounted = false;
      window.removeEventListener('brandx:daily-content-updated', handleSync);
      window.removeEventListener('brandx:posters-updated', handleSync);
      if (bc) bc.close();
    };
  }, [dailyOffset, activeCategory, searchQuery]);

  const todayPosters = [
    ...customAiPosters,
    ...(hasLoadedBackend && backendTodayPosters.length > 0
      ? backendTodayPosters
      : hasLoadedBackend && customAiPosters.length === 0
      ? []
      : baseTodayPosters),
  ];

  const tomorrowPostersDisplay =
    hasLoadedBackend && backendTomorrowPosters.length > 0
      ? backendTomorrowPosters
      : hasLoadedBackend
      ? []
      : tomorrowPosters;

  const festivalPostersDisplay =
    hasLoadedBackend && backendFestivalPosters.length > 0
      ? backendFestivalPosters
      : hasLoadedBackend
      ? []
      : festivalPosters;

  const currentDisplayPosters =
    dailySubTab === 'today'
      ? todayPosters
      : dailySubTab === 'tomorrow'
      ? tomorrowPostersDisplay
      : festivalPostersDisplay;

  const handleRefreshDailyPosters = () => {
    setDailyOffset((prev) => prev + 1);
    showToast('🔄 Naye Daily Posters aur Suvichar load ho gaye!');
  };

  const handleGenerateAiSuvichar = async () => {
    setIsGeneratingAiSuvichar(true);
    showToast('✨ AI naya daily status likh raha hai...');
    try {
      const now = new Date();
      const dayName = HINDI_DAYS[now.getDay()];
      const res = await generateDailySuvichar(
        business?.name || 'My Shop',
        business?.category || 'Retail Business',
        dayName
      );
      const newPost: DailyCalendarItem = {
        id: `ai-suvichar-${Date.now()}`,
        title: `AI विशेष • ${res.headline}`,
        category: 'Daily Suvichar',
        dateLabel: `आज (${todayHindiDate})`,
        imageUrl: POSTER_IMAGES.morningSuvichar,
        headline: res.headline,
        subheadline: res.subheadline,
        quoteHindi: res.quoteHindi,
        badge: res.badge || 'AI CREATED',
      };
      setCustomAiPosters((prev) => [newPost, ...prev]);
      setDailySubTab('today');
      showToast('✨ Naya AI Daily Suvichar taiyar ho gaya!');
    } catch {
      showToast('Suvichar generate karne me samasya aayi.');
    } finally {
      setIsGeneratingAiSuvichar(false);
    }
  };

  // Home Dashboard Quick Stats Calculations
  const totalUdhar = customers.reduce((acc, c) => acc + (c.totalDue > 0 ? c.totalDue : 0), 0);
  const invoiceSubtotal = invoice?.items.reduce((acc, it) => acc + it.qty * it.rate, 0) || 0;
  const totalDueCount = customers.filter((c) => c.totalDue > 0).length;

  const defaultCategories = [
    { label: 'All' },
    { label: 'Suvichar', icon: '🌸' },
    { label: 'Morning', icon: '🌅' },
    { label: 'Festival', icon: '🪔' },
    { label: 'Business', icon: '💼' },
    { label: 'Motivation', icon: '🚀' },
    { label: 'Offers', icon: '🔥' },
  ];

  const extraCategories = useMemo(() => {
    const existingLabels = new Set(defaultCategories.map((c) => c.label.toLowerCase()));
    const extras: { label: string; icon?: string }[] = [];
    backendTemplates.forEach((t) => {
      if (t.category && !existingLabels.has(t.category.toLowerCase())) {
        existingLabels.add(t.category.toLowerCase());
        const label = t.category.charAt(0).toUpperCase() + t.category.slice(1);
        extras.push({ label, icon: '🏷️' });
      }
    });
    return extras;
  }, [backendTemplates]);

  const categories = dbCategories.length > 0 ? dbCategories : [...defaultCategories, ...extraCategories];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = !prev[id];
      showToast(next ? 'Template saved to bookmarks!' : 'Removed from bookmarks');
      return { ...prev, [id]: next };
    });
  };

  // Pure single source of truth: only real database records, zero demo/mock data
  const templatesToFilter = backendTemplates;
  const filteredTemplates = templatesToFilter.filter((item) => {
    const itemCat = (item.category || '').toLowerCase();
    const activeCat = activeCategory.toLowerCase();
    const matchesCategory =
      activeCategory === 'All' ||
      itemCat.includes(activeCat) ||
      activeCat.includes(itemCat) ||
      (activeCat === 'festival' && itemCat.includes('fest')) ||
      (activeCat === 'morning' && (itemCat.includes('morning') || itemCat.includes('prabhat')));

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === '' ||
      item.title.toLowerCase().includes(q) ||
      itemCat.includes(q) ||
      (item.headlineDefault && item.headlineDefault.toLowerCase().includes(q)) ||
      (item.subheadlineDefault && item.subheadlineDefault.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const handleShareDailyStatusWhatsApp = async (cal: DailyCalendarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharingId(cal.id);
    dailyContentApi.trackEvent({
      contentId: cal.id,
      eventType: 'WHATSAPP_CLICK',
      metadata: { title: cal.headline },
    });
    showToast('🖼️ WhatsApp ke liye branded poster image ban rahi hai...');
    try {
      const res = await shareDailyPosterToWhatsApp(cal, business);
      showToast(res.message);
      if (res.method === 'clipboard-copy' || res.method === 'download-only') {
        setWhatsAppGuide({
          isOpen: true,
          caption: res.caption || '',
          imageUrl: res.dataUrl || cal.imageUrl,
          title: cal.headline,
        });
      }
    } catch (err: any) {
      showToast('Sharing me samasya aayi: ' + (err.message || 'Error'));
    } finally {
      setSharingId(null);
    }
  };

  const handleDownloadPoster = async (cal: DailyCalendarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(cal.id);
    dailyContentApi.trackEvent({
      contentId: cal.id,
      eventType: 'DOWNLOAD',
      metadata: { title: cal.headline },
    });
    showToast('📥 High-Res Poster Image taiyar ho rahi hai...');
    try {
      const { blob } = await generateBrandedPosterBlob(cal, business);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cal.title.replace(/[^a-zA-Z0-9]/g, '_')}_poster.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('✅ Poster image successfully gallery / downloads me save ho gayi!');
    } catch (err: any) {
      showToast('Download error: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCustomizeDailyStatus = (cal: DailyCalendarItem) => {
    dailyContentApi.trackEvent({
      contentId: cal.id,
      eventType: 'VIEW',
      metadata: { title: cal.headline },
    });
    const templateFromCal: TemplateItem = {
      id: cal.id,
      title: cal.title,
      category: cal.category,
      categoryIcon: '🗓️',
      tier: 'FREE',
      format: 'Story 9:16',
      imageUrl: cal.imageUrl,
      headlineDefault: cal.headline,
      subheadlineDefault: cal.quoteHindi || cal.subheadline,
    };
    onSelectTemplate(templateFromCal);
  };

  return (
    <div className="flex flex-col w-full pb-32 bg-[#0B0F19] text-white min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-4 space-y-4">
        
        {/* TASK 9: Home Dashboard Quick Stats (Computed from localStorage) */}
        <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E1B4B] rounded-3xl p-4 sm:p-5 border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <div>
                <h2 className="text-sm font-extrabold text-white tracking-wide">{t.quickStatsTitle}</h2>
                <p className="text-[11px] text-slate-400">{business?.name || 'Your MSME Store'}</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-cyan-300 border border-blue-500/30">
              ● Live Local Data
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* 1. Total Outstanding Udhar */}
            <div
              onClick={() => onNavigate?.('khata')}
              className="p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                  {t.totalUdhar}
                </span>
                <span className="text-xs">📒</span>
              </div>
              <div className="text-base sm:text-lg font-black text-red-400 mt-1">
                ₹{totalUdhar.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>{totalDueCount} pending</span>
                <span className="text-red-400 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>

            {/* 2. Current Invoice Total */}
            <div
              onClick={() => onNavigate?.('invoice')}
              className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  {t.activeBilling}
                </span>
                <span className="text-xs">🧾</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-1">
                ₹{invoiceSubtotal.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>{invoice?.items.length || 0} items</span>
                <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>

            {/* 3. Khata Customers Count */}
            <div
              onClick={() => onNavigate?.('khata')}
              className="p-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                  {t.totalCustomers}
                </span>
                <span className="text-xs">👥</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white mt-1">
                {customers.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>Total ledger</span>
                <span className="text-blue-400 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>

            {/* 4. Dukaan Store Products Count */}
            <div
              onClick={() => onNavigate?.('dukaan')}
              className="p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                  {t.totalProducts}
                </span>
                <span className="text-xs">🌐</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white mt-1">
                {products.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>Online Dukaan</span>
                <span className="text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </div>

          {/* Refer & Earn High-Conversion Banner */}
          <div
            onClick={() => onNavigate?.('referrals')}
            className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-teal-500/15 border border-amber-400/30 hover:border-amber-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.005] group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-xl shadow-md shrink-0 ring-2 ring-amber-300/30">
                🎁
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                    Refer & Earn BrandX Coins
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    100 Coins = ₹1
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                  Invite MSME friends & earn <span className="font-bold text-amber-300">100–500 coins</span> per referral. Cashout to UPI or Bank!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate?.('wallet');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600/50 transition-colors"
              >
                🪙 Wallet
              </button>
              <div className="flex items-center gap-1 text-xs font-extrabold text-amber-300 group-hover:translate-x-0.5 transition-transform">
                <span>Start Earning</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Top Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 flex items-center h-11 px-3.5 rounded-2xl bg-[#131B2E] border border-white/10 shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-[20px] mr-2">search</span>
            <input
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
              placeholder={t.searchPlaceholder}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            )}
          </div>

          {/* Main Tab Switcher */}
          <div className="flex bg-[#131B2E] p-1 rounded-2xl border border-white/10 text-xs shrink-0">
            <button
              onClick={() => setActiveMainTab('templates')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainTab === 'templates'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🎨</span>
              <span>Marketing Posters</span>
            </button>

            <button
              onClick={() => setActiveMainTab('calendar')}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMainTab === 'calendar'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🗓️</span>
              <span>आज का स्टेटस ({todayHindiDate.split(',')[0]})</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </button>
          </div>
        </div>

        {/* TAB 1: Marketing Poster Templates Library */}
        {activeMainTab === 'templates' && (
          <div className="space-y-4">
            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.label;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setActiveCategory(cat.label)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow font-bold'
                        : 'bg-[#131B2E] text-slate-300 hover:bg-slate-800 border border-white/10'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {cat.icon && <span>{cat.icon}</span>}
                  </button>
                );
              })}
            </div>

            {/* Featured Festival Pack Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 p-6 border border-white/15 shadow-xl text-white">
              <div className="relative z-10 max-w-lg space-y-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 uppercase tracking-wider">
                  🪔 FESTIVAL SPECIAL PACK
                </span>
                <h2 className="text-xl font-black">Diwali &amp; Festive 2024 Pack</h2>
                <p className="text-xs text-slate-300">
                  Ready-to-share posters in Hindi, Gujarati &amp; English with auto-brand stamp of {business?.name || 'your shop'}.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveCategory('Festival');
                      showToast('Diwali collection loaded!');
                    }}
                    className="px-4 py-2 bg-white text-slate-900 font-bold text-xs rounded-xl shadow hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
                  >
                    Explore Pack 🪔
                  </button>
                </div>
              </div>
            </div>

            {/* Templates Grid or Empty State */}
            {filteredTemplates.length === 0 ? (
              <EmptyState
                icon="photo_library"
                title={
                  templatesToFilter.length === 0
                    ? 'Abhi koi marketing poster uplabdh nahi hai'
                    : 'Koi poster match nahi hua'
                }
                description={
                  templatesToFilter.length === 0
                    ? 'Admin CMS dwara Daily Status ya poster publish karne par yahan sabhi real posters dikhenge.'
                    : 'Kripya doosra search term ya category filter try karein.'
                }
                actionLabel={templatesToFilter.length === 0 ? 'Refresh Posters' : 'Reset Search & Filters'}
                onAction={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => {
                  const isBookmarked = !!bookmarkedIds[template.id];
                  return (
                    <div
                      key={template.id}
                      onClick={() => onSelectTemplate(template)}
                      className="group bg-[#131B2E] hover:bg-[#1A243B] border border-white/10 hover:border-blue-500/50 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-square overflow-hidden bg-slate-900">
                        <img
                          src={resolveImageUrl(template.imageUrl)}
                          alt={template.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        
                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow ${
                            template.tier === 'PRO' ? 'bg-amber-400 text-amber-950' : 'bg-emerald-400 text-emerald-950'
                          }`}>
                            {template.tier}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-sm text-white">
                            {template.format}
                          </span>
                        </div>

                        <button
                          onClick={(e) => toggleBookmark(template.id, e)}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isBookmarked ? 'bookmark' : 'bookmark_border'}
                          </span>
                        </button>
                      </div>

                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                              {template.category}
                            </span>
                            {template.createdAt && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                {new Date(template.createdAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate mt-1">
                            {template.title}
                          </h3>
                          {template.subheadlineDefault && (
                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                              {template.subheadlineDefault}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">brush</span> Custom Canvas
                          </span>
                          <span className="font-bold text-blue-400 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                            Edit & Brand <span>→</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Aaj Ka Status & Daily Suvichar / Festival Calendar */}
        {activeMainTab === 'calendar' && (
          <div className="space-y-4">
            {/* Live Daily Engine Control Banner */}
            <div className="bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E1B4B] border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30">🗓️</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Live 365 Days Auto-Updating
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-white">
                      {todayHindiDate}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Har din naye morning suvichar, tyohar aur offer posters aapke dukan ke naam ke sath.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefreshDailyPosters}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow"
                    title="Naye Posters Load Karein"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Naye Posters 🔄</span>
                  </button>

                  <button
                    onClick={handleGenerateAiSuvichar}
                    disabled={isGeneratingAiSuvichar}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isGeneratingAiSuvichar ? 'hourglass_empty' : 'auto_awesome'}
                    </span>
                    <span>{isGeneratingAiSuvichar ? 'Likh raha hai...' : 'AI Suvichar ✨'}</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tabs: Today, Tomorrow, Upcoming Festivals */}
              <div className="flex items-center gap-2 border-t border-white/10 pt-3 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setDailySubTab('today')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    dailySubTab === 'today'
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>🌟 आज का स्टेटस</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                    {todayPosters.length}
                  </span>
                </button>

                <button
                  onClick={() => setDailySubTab('tomorrow')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    dailySubTab === 'tomorrow'
                      ? 'bg-blue-600 text-white font-black shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>📅 कल का स्टेटस</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                    {tomorrowPosters.length}
                  </span>
                </button>

                <button
                  onClick={() => setDailySubTab('festivals')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    dailySubTab === 'festivals'
                      ? 'bg-purple-600 text-white font-black shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>🪔 आगामी त्यौहार व जयंती</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                    {festivalPosters.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Daily Items Feed */}
            {currentDisplayPosters.length === 0 ? (
              <div className="py-16 text-center bg-[#131B2E] border border-white/10 rounded-3xl p-8 shadow-xl">
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-3 block">event_busy</span>
                <h3 className="text-base font-bold text-white mb-1">
                  {dailySubTab === 'today'
                    ? 'Aaj ka content available nahi hai.'
                    : dailySubTab === 'tomorrow'
                    ? 'Kal ke liye koi content available nahi hai.'
                    : 'No content available for this festival.'}
                </h3>
                <p className="text-xs text-slate-400">
                  Naya content jald hi Admin CMS dwara schedule aur publish kiya jayega.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentDisplayPosters.map((cal) => (
                  <div
                    key={cal.id}
                    className="bg-[#131B2E] border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-amber-500/40 transition-all"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                      <img
                        src={resolveImageUrl(cal.imageUrl)}
                        alt={cal.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131B2E] via-transparent to-transparent" />

                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 uppercase shadow">
                          {cal.dateLabel}
                        </span>
                        {cal.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-sm">
                            {cal.badge}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleDownloadPoster(cal, e)}
                          disabled={downloadingId === cal.id}
                          title="Poster Image Download Karein"
                          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {downloadingId === cal.id ? 'hourglass_empty' : 'download'}
                          </span>
                        </button>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-base font-extrabold text-white drop-shadow-md">{cal.headline}</h3>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <p className="text-xs text-slate-300 leading-relaxed font-serif italic">
                        "{cal.quoteHindi || cal.subheadline}"
                      </p>

                      {/* Auto-Brand Stamp Preview */}
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-outlined text-blue-400 text-[16px]">verified</span>
                          <span className="font-bold text-white truncate">{business?.name || 'Your Business Name'}</span>
                        </div>
                        <span className="text-slate-400 font-mono shrink-0">+91 {business?.phone}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleCustomizeDailyStatus(cal)}
                          className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">tune</span>
                          <span>Customize 🎨</span>
                        </button>

                        <button
                          onClick={(e) => handleShareDailyStatusWhatsApp(cal, e)}
                          disabled={sharingId === cal.id}
                          className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer disabled:opacity-75"
                        >
                          <span>💬</span>
                          <span>{sharingId === cal.id ? 'Image Bheji ja rahi...' : 'WhatsApp Status'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Web Desktop Share Guide Modal */}
      <WhatsAppShareGuideModal
        isOpen={whatsAppGuide.isOpen}
        onClose={() => setWhatsAppGuide((prev) => ({ ...prev, isOpen: false }))}
        caption={whatsAppGuide.caption}
        imageUrl={whatsAppGuide.imageUrl}
        title={whatsAppGuide.title}
      />
    </div>
  );
};
