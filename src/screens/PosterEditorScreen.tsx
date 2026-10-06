import React, { useState } from 'react';
import { BusinessProfile, TemplateItem } from '../types';
import { APP_IMAGES, POSTER_IMAGES } from '../data/mockData';
import { shareImageToWhatsApp } from '../utils/posterShare';
import { exportElementToPng } from '../utils/domToImage';
import { WhatsAppShareGuideModal } from '../components/WhatsAppShareGuideModal';
import { resolveImageUrl } from '../utils/imageUrl';

interface PosterEditorScreenProps {
  business: BusinessProfile;
  initialTemplate?: TemplateItem | null;
  initialHeadline?: string;
  initialBody?: string;
  onBack: () => void;
  onOpenPro: () => void;
}

export const PosterEditorScreen: React.FC<PosterEditorScreenProps> = ({
  business,
  initialTemplate,
  initialHeadline,
  initialBody,
  onBack,
  onOpenPro,
}) => {
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16' | '16:9' | '4:5'>('1:1');
  const [headline, setHeadline] = useState(
    initialHeadline || initialTemplate?.headlineDefault || initialTemplate?.title || 'Diwali 50% Dhamaka Sale'
  );
  const [bodyText, setBodyText] = useState(
    initialBody || initialTemplate?.subheadlineDefault || 'Festive portraits, family shoot & video albums par Flat 40% OFF. Book before 15th Nov!'
  );
  const [bgImage, setBgImage] = useState(
    initialTemplate?.imageUrl || APP_IMAGES.diwaliTemplate
  );

  React.useEffect(() => {
    if (initialHeadline) {
      setHeadline(initialHeadline);
    } else if (initialTemplate?.headlineDefault) {
      setHeadline(initialTemplate.headlineDefault);
    } else if (initialTemplate?.title) {
      setHeadline(initialTemplate.title);
    }

    if (initialBody) {
      setBodyText(initialBody);
    } else if (initialTemplate?.subheadlineDefault) {
      setBodyText(initialTemplate.subheadlineDefault);
    }

    if (initialTemplate?.imageUrl) {
      setBgImage(initialTemplate.imageUrl);
    }
  }, [initialTemplate, initialHeadline, initialBody]);
  const [selectedFont, setSelectedFont] = useState<'Rozha One' | 'Poppins' | 'Inter' | 'Mukta'>('Rozha One');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textAlignment, setTextAlignment] = useState<'center' | 'left' | 'right'>('center');
  const [badgeText, setBadgeText] = useState('FLAT 50% OFF 🔥');
  const [showBadge, setShowBadge] = useState(true);
  const [showBrandStamp, setShowBrandStamp] = useState(true);
  const [overlayDarkness, setOverlayDarkness] = useState(40);
  const [activeTab, setActiveTab] = useState<'text' | 'bg' | 'brand' | 'stickers'>('text');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const sampleBackgrounds = [
    { label: 'हिन्दी दिवस 🇮🇳', url: POSTER_IMAGES.hindiDiwas },
    { label: 'शुभ सोमवार 🔱', url: POSTER_IMAGES.shiva },
    { label: 'शुभ मंगलवार 🚩', url: POSTER_IMAGES.hanuman },
    { label: 'शुभ बुधवार 🐘', url: POSTER_IMAGES.ganesha },
    { label: 'शुभ गुरुवार ✨', url: POSTER_IMAGES.saibaba },
    { label: 'शुभ शुक्रवार 🪙', url: POSTER_IMAGES.lakshmi },
    { label: 'शुभ शनिवार ⚖️', url: POSTER_IMAGES.shanidev },
    { label: 'शुभ रविवार ☀️', url: POSTER_IMAGES.suryadev },
    { label: 'शुभ प्रभात 🌅', url: POSTER_IMAGES.morningSuvichar },
    { label: 'Diwali Festive', url: APP_IMAGES.diwaliTemplate },
    { label: 'Studio Wedding', url: APP_IMAGES.weddingTemplate },
    { label: 'Cafe & Food', url: APP_IMAGES.coffeeTemplate },
    { label: 'Salon & Spa', url: APP_IMAGES.salonTemplate },
    { label: 'Clearance Sale', url: APP_IMAGES.flashSaleTemplate },
  ];

  const quickBadges = [
    'FLAT 50% OFF 🔥',
    'DIWALI DHAMAKA 🪔',
    '100% PURE VEG 🌿',
    'MADE IN INDIA 🇮🇳',
    'FREE HOME DELIVERY 🚚',
    'COD AVAILABLE 💵',
    'GRAND OPENING 🎉',
    'BUY 1 GET 1 FREE 🎁',
    'LIMITED SLOTS ⏳',
    'WEEKEND SPECIAL ⚡',
  ];

  const colorPalette = [
    { name: 'White', hex: '#ffffff' },
    { name: 'Gold', hex: '#fbbf24' },
    { name: 'Rose Red', hex: '#f43f5e' },
    { name: 'Emerald', hex: '#34d399' },
    { name: 'Cyan', hex: '#38bdf8' },
    { name: 'Amber', hex: '#f59e0b' },
  ];

  const aiSlogans = [
    'Festive yaadon ko banayein hamesha ke liye khoobsurat! 📸',
    'Diwali ki shubh shuruat hamare studio ke saath! ✨',
    'Limited festival slots available. Aaj hi WhatsApp par book karein! 📲',
    'Hamari dukan, aapka vishwas. 100% best quality guaranteed! 🤝',
  ];

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setBgImage(ev.target.result as string);
          showToast('Custom photo uploaded to canvas!');
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const captureCanvasData = async () => {
    return exportElementToPng('poster-studio-canvas', {
      scale: 3,
      backgroundColor: '#0B0F19',
      allowTaint: true,
    });
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    showToast('📥 High-Resolution Poster Image taiyar ho rahi hai...');
    try {
      const { dataUrl } = await captureCanvasData();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `brandx_${(headline || 'poster').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('✅ High-Resolution Poster Gallery / Downloads me save ho gaya! 📥');
    } catch (err: any) {
      showToast('Download error: ' + (err.message || 'Failed'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = async () => {
    setIsSharing(true);
    showToast('🖼️ WhatsApp ke liye branded poster image ban rahi hai...');
    try {
      const { dataUrl, blob } = await captureCanvasData();
      const caption =
        `*${headline}*\n\n` +
        (bodyText ? `${bodyText}\n\n` : '') +
        `🏬 *${business.name}*\n` +
        (business.address ? `📍 ${business.address}, ${business.city}\n` : '') +
        (business.phone ? `📞 Call / WhatsApp: +91 ${business.phone}` : '');

      const title = (headline || 'Poster').replace(/[^a-zA-Z0-9]/g, '_');
      const res = await shareImageToWhatsApp(dataUrl, caption, title, blob);
      showToast(res.message);
      if (res.method === 'clipboard-copy' || res.method === 'download-only') {
        setWhatsAppGuide({
          isOpen: true,
          caption: res.caption || caption,
          imageUrl: dataUrl,
          title: headline,
        });
      }
    } catch (err: any) {
      showToast('Sharing error: ' + (err.message || 'Failed'));
    } finally {
      setIsSharing(false);
    }
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

      {/* Top Studio Action Bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-[#131B2E] border-b border-white/10 shadow-lg max-w-4xl mx-auto w-full rounded-b-2xl">
        <button
          onClick={onBack}
          aria-label="Back to templates"
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-transform"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-white">🎨 Poster Studio Canvas</span>
        </div>

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-xl border border-white/10">
          {(['1:1', '9:16', '16:9', '4:5'] as const).map((ratio) => (
            <button
              key={ratio}
              onClick={() => {
                setAspectRatio(ratio);
                showToast(`Canvas resized to ${ratio}`);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                aspectRatio === ratio
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Live Interactive Canvas Preview */}
      <div className="px-4 py-4 flex items-center justify-center max-w-xl mx-auto w-full">
        <div
          id="poster-studio-canvas"
          className={`relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/20 transition-all duration-300 flex flex-col justify-between ${
            aspectRatio === '1:1'
              ? 'aspect-square max-w-[380px]'
              : aspectRatio === '9:16'
              ? 'aspect-[9/16] max-h-[500px] max-w-[320px]'
              : aspectRatio === '4:5'
              ? 'aspect-[4/5] max-w-[360px]'
              : 'aspect-[16/9] max-w-[480px]'
          }`}
          style={{ backgroundColor: '#0B0F19' }}
        >
          {/* Background Image Layer */}
          <img
            src={bgImage}
            alt="Poster Background"
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />

          {/* Adjustable Darkness Overlay */}
          <div
            className="absolute inset-0 bg-black transition-opacity"
            style={{ opacity: overlayDarkness / 100 }}
          />

          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />

          {/* Canvas Top Bar: Brand Watermark & Badge */}
          <div className="relative z-10 p-3 flex items-center justify-between">
            {showBrandStamp ? (
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                <img
                  src={resolveImageUrl(business.logoUrl || APP_IMAGES.logo)}
                  alt="Shop Logo"
                  className="w-5 h-5 rounded-full object-cover bg-white"
                />
                <span className="font-bold text-xs text-white tracking-wide truncate max-w-[130px]">
                  {business.name}
                </span>
                <span className="material-symbols-outlined text-[14px] text-blue-400">
                  verified
                </span>
              </div>
            ) : (
              <div />
            )}

            {/* Sticker Badge */}
            {showBadge && (
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-3 py-1 rounded-full text-[10px] font-black shadow-lg tracking-wide transform -rotate-2 animate-bounce">
                {badgeText}
              </div>
            )}
          </div>

          {/* Canvas Center Content: Headline & Offer Body */}
          <div className={`relative z-10 px-5 py-3 flex flex-col my-auto ${
            textAlignment === 'center' ? 'items-center text-center' : textAlignment === 'left' ? 'items-start text-left' : 'items-end text-right'
          }`}>
            <h2
              className="font-black text-xl sm:text-2xl leading-tight drop-shadow-lg"
              style={{
                fontFamily: selectedFont === 'Rozha One' ? 'Rozha One, serif' : selectedFont,
                color: textColor,
              }}
            >
              {headline}
            </h2>

            <p
              className="mt-2 text-xs sm:text-sm font-medium leading-relaxed drop-shadow-md max-w-sm text-white/95"
              style={{
                fontFamily: selectedFont === 'Rozha One' ? 'Inter, sans-serif' : selectedFont,
              }}
            >
              {bodyText}
            </p>
          </div>

          {/* Canvas Footer Stamp: Contact & WhatsApp Direct */}
          {showBrandStamp && (
            <div className="relative z-10 p-2.5 bg-black/75 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-white text-[10px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[12px]">💬</span>
                <span className="font-mono font-bold tracking-wider truncate">
                  +91 {business.phone}
                </span>
              </div>

              <div className="flex items-center gap-1 truncate max-w-[120px]">
                <span className="material-symbols-outlined text-[13px] text-amber-400">
                  location_on
                </span>
                <span className="truncate">{business.city}</span>
              </div>

              {business.instagram && (
                <div className="flex items-center gap-0.5 text-blue-300">
                  <span>{business.instagram}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Studio Control Tabs */}
      <div className="px-4 max-w-xl mx-auto w-full space-y-3">
        {/* Tab Headers */}
        <div className="flex items-center justify-between bg-[#131B2E] rounded-2xl p-1 shadow border border-white/10">
          {[
            { id: 'text', label: 'Text & Colors', icon: 'title' },
            { id: 'bg', label: 'Photo & BG', icon: 'photo' },
            { id: 'stickers', label: 'Badges & Trust', icon: 'loyalty' },
            { id: 'brand', label: 'Brand Overlay', icon: 'branding_watermark' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Text, Fonts & Colors */}
        {activeTab === 'text' && (
          <div className="p-4 bg-[#131B2E] rounded-2xl shadow border border-white/10 space-y-3 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">POSTER HEADLINE</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#1E293B] border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">OFFER / SUBTEXT</label>
              <textarea
                rows={2}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-[#1E293B] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Font Family & Alignment */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">FONT STYLE</label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value as any)}
                  className="w-full h-9 px-2 rounded-xl bg-[#1E293B] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Rozha One">Rozha One (Festive Serif)</option>
                  <option value="Poppins">Poppins (Modern Bold)</option>
                  <option value="Mukta">Mukta (Devanagari / Hindi)</option>
                  <option value="Inter">Inter (Clean Minimal)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">ALIGNMENT</label>
                <div className="flex bg-[#1E293B] p-0.5 rounded-xl border border-white/10">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setTextAlignment(align)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        textAlignment === align ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-slate-300">TEXT COLOR</label>
              <div className="flex items-center gap-2">
                {colorPalette.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => setTextColor(col.hex)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      textColor === col.hex ? 'scale-125 border-blue-400 shadow' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  />
                ))}
              </div>
            </div>

            {/* AI Slogan Suggestions */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                1-Click Slogan Ideas
              </span>
              <div className="space-y-1">
                {aiSlogans.map((slogan, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBodyText(slogan);
                      showToast('Slogan applied to canvas!');
                    }}
                    className="w-full text-left text-[11px] p-2 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-slate-200 transition-colors"
                  >
                    "{slogan}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Photo & Background */}
        {activeTab === 'bg' && (
          <div className="p-4 bg-[#131B2E] rounded-2xl shadow border border-white/10 space-y-3 animate-fade-in">
            <label className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow active:scale-95">
              <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
              <span>Upload Custom Photo / Product Image</span>
              <input type="file" accept="image/*" className="sr-only" onChange={handleCustomImageUpload} />
            </label>

            {/* Overlay Darkness Slider */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Darken Background Overlay</span>
                <span>{overlayDarkness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={overlayDarkness}
                onChange={(e) => setOverlayDarkness(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Sample Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300">BACKGROUND PRESETS</span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {sampleBackgrounds.map((bg) => (
                  <button
                    key={bg.label}
                    onClick={() => {
                      setBgImage(bg.url);
                      showToast(`Background set to ${bg.label}`);
                    }}
                    className="flex flex-col items-center gap-1 rounded-xl overflow-hidden border border-white/10 p-1 hover:border-blue-500 transition-all bg-[#1E293B]"
                  >
                    <img src={bg.url} alt={bg.label} className="w-full h-14 object-cover rounded-lg" />
                    <span className="text-[9px] font-bold text-slate-300 truncate w-full text-center">
                      {bg.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Badges & Trust Stickers */}
        {activeTab === 'stickers' && (
          <div className="p-4 bg-[#131B2E] rounded-2xl shadow border border-white/10 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Show Offer Sticker / Badge</span>
              <input
                type="checkbox"
                checked={showBadge}
                onChange={(e) => setShowBadge(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300">1-CLICK TRUST BADGES</span>
              <div className="flex flex-wrap gap-2">
                {quickBadges.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setBadgeText(b);
                      setShowBadge(true);
                      showToast(`Badge updated: ${b}`);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      badgeText === b
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'bg-[#1E293B] text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Brand Overlay Stamp */}
        {activeTab === 'brand' && (
          <div className="p-4 bg-[#131B2E] rounded-2xl shadow border border-white/10 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Auto-Brand Stamp</p>
                <p className="text-[11px] text-slate-400">Shows shop logo, name, phone &amp; city on the poster</p>
              </div>
              <input
                type="checkbox"
                checked={showBrandStamp}
                onChange={(e) => setShowBrandStamp(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#1E293B] text-xs text-slate-300 space-y-1 border border-white/10">
              <span className="font-bold text-white">Active Stamp Details:</span>
              <p>🏪 {business.name}</p>
              <p>📞 +91 {business.phone}</p>
              <p>📍 {business.address}, {business.city}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex gap-3">
          <button
            onClick={handleShareWhatsApp}
            disabled={isSharing}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span>💬</span>
            <span>{isSharing ? 'Image Bheji ja rahi...' : 'Share to WhatsApp Status'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>{isDownloading ? 'Saving Image...' : 'Export HD Poster'}</span>
          </button>
        </div>
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
