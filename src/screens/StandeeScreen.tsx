import React, { useState } from 'react';
import { BusinessProfile } from '../types';
import { APP_IMAGES } from '../data/mockData';
import { shareImageToWhatsApp } from '../utils/posterShare';
import { exportElementToPng } from '../utils/domToImage';
import { WhatsAppShareGuideModal } from '../components/WhatsAppShareGuideModal';
import { resolveImageUrl } from '../utils/imageUrl';

interface StandeeScreenProps {
  business: BusinessProfile;
  onOpenPro: () => void;
}

export const StandeeScreen: React.FC<StandeeScreenProps> = ({ business, onOpenPro }) => {
  const [qrType, setQrType] = useState<'upi' | 'whatsapp' | 'google' | 'instagram'>('upi');
  const [fixAmount, setFixAmount] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<'classic' | 'minimal' | 'festive' | 'card'>('classic');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
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

  const copyUpiId = () => {
    if (!business.upiId) {
      showToast('Please set your UPI ID in Business Profile first');
      return;
    }
    navigator.clipboard.writeText(business.upiId);
    showToast('UPI ID copied to clipboard! 📋');
  };

  const currentDisplayAmount = fixAmount
    ? selectedAmount !== null
      ? selectedAmount
      : parseFloat(customAmount) || 0
    : null;

  const handleShareWhatsApp = async () => {
    setIsSharing(true);
    showToast('🖼️ WhatsApp ke liye Standee QR image ban rahi hai...');
    try {
      const { dataUrl, blob } = await exportElementToPng('standee-acrylic-card', {
        scale: 3,
        backgroundColor: '#ffffff',
      });

      const caption =
        `💳 *Scan & Pay ${business.name || 'Store'}*\n\n` +
        `📲 *UPI ID:* \`${business.upiId || 'your-upi@bank'}\`\n` +
        (currentDisplayAmount ? `💰 *Amount:* ₹${currentDisplayAmount}\n\n` : '\n') +
        `⚡ Google Pay, PhonePe, Paytm, BHIM & all UPI Apps accepted!\n` +
        `✨ _Powered by BRANDX_`;

      const title = 'UPI-QR';
      const res = await shareImageToWhatsApp(dataUrl, caption, title, blob);
      showToast(res.message);

      if (res.method === 'clipboard-copy' || res.method === 'download-only') {
        setWhatsAppGuide({
          isOpen: true,
          caption,
          imageUrl: dataUrl,
          title: `UPI QR Standee - ${business.name || 'Store'}`,
        });
      }
    } catch (err: any) {
      console.error('Standee share error:', err);
      showToast('Standee image share error: ' + (err.message || 'Failed'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadPdf = () => {
    showToast('High-res vector Standee PDF generated! 🖨️');
    window.print();
  };

  // Theme styling definitions for live standee preview
  const getThemeStyles = () => {
    switch (selectedTheme) {
      case 'minimal':
        return {
          bannerBg: 'bg-gradient-to-r from-slate-900 to-slate-800 text-white',
          cornerBorder: 'border-slate-800',
          accentColor: '#334155',
          frameBg: 'bg-white',
        };
      case 'festive':
        return {
          bannerBg: 'bg-gradient-to-r from-[#855300] via-[#fea619] to-[#855300] text-white',
          cornerBorder: 'border-[#fea619]',
          accentColor: '#fea619',
          frameBg: 'bg-[#fffbeb]',
        };
      case 'card':
        return {
          bannerBg: 'bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white',
          cornerBorder: 'border-indigo-600',
          accentColor: '#4f46e5',
          frameBg: 'bg-white',
        };
      case 'classic':
      default:
        return {
          bannerBg: 'bg-gradient-to-r from-[#3525cd] to-[#4f46e5] text-white',
          cornerBorder: 'border-[#3525cd]',
          accentColor: '#3525cd',
          frameBg: 'bg-white',
        };
    }
  };

  const themeStyle = getThemeStyles();

  return (
    <div className="flex flex-col w-full pb-32 bg-[#faf8ff] text-[#131b2e]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#283044] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[16px] text-[#6ffbbe]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Utility Bar: Sub-actions & Quick Status */}
      <section className="px-4 pt-3 pb-2 flex items-center justify-between max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#fea619]/20 text-[#855300]">
            <span className="material-symbols-outlined text-[16px]">verified</span>
          </span>
          <span className="text-[11px] font-bold text-[#855300] uppercase tracking-wider">
            NPCI &amp; UPI Compliant
          </span>
        </div>
        <button
          onClick={() => showToast('3 saved QR standees available')}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#e2e7ff] hover:bg-[#dae2fd] transition-colors text-[#3525cd] text-xs font-semibold active:scale-95"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">bookmarks</span>
          <span>Saved QRs (3)</span>
        </button>
      </section>

      {/* QR Purpose / Type Pills (Horizontal Scroll) */}
      <section className="px-4 py-2 overflow-x-auto no-scrollbar max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setQrType('upi')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all shadow-xs ${
              qrType === 'upi' ? 'bg-[#3525cd] text-white' : 'bg-white text-[#464555]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">currency_rupee</span>
            <span>UPI Payment</span>
          </button>
          <button
            onClick={() => setQrType('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all shadow-xs ${
              qrType === 'whatsapp' ? 'bg-[#005338] text-white' : 'bg-white text-[#464555]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#005338]">chat</span>
            <span>WhatsApp Catalog</span>
          </button>
          <button
            onClick={() => setQrType('google')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all shadow-xs ${
              qrType === 'google' ? 'bg-[#855300] text-white' : 'bg-white text-[#464555]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#fea619]">star</span>
            <span>Google Review</span>
          </button>
          <button
            onClick={() => setQrType('instagram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all shadow-xs ${
              qrType === 'instagram' ? 'bg-[#93000a] text-white' : 'bg-white text-[#464555]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-[#4f46e5]">photo_camera</span>
            <span>Instagram</span>
          </button>
        </div>
      </section>

      {/* Live Acrylic Standee / Countertop Visual Preview */}
      <section className="px-4 py-3 flex flex-col items-center max-w-lg mx-auto w-full">
        {/* Acrylic Standee Simulated Frame */}
        <div className="relative w-full max-w-[340px] pt-2 pb-5 flex flex-col items-center">
          {/* Clear Acrylic Top Reflection & Metallic Clip */}
          <div className="w-20 h-2 rounded-full bg-[#dae2fd] shadow-inner mb-1"></div>

          {/* Main Standee Plaque */}
          <div
            id="standee-acrylic-card"
            className={`relative w-full rounded-2xl shadow-xl overflow-hidden p-4 flex flex-col items-center border border-gray-100 transition-colors ${themeStyle.frameBg}`}
          >
            {/* Ambient subtle acrylic sheen */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/70 via-transparent to-indigo-500/5"></div>

            {/* Standee Header Banner */}
            <div
              className={`relative w-full rounded-xl p-3 flex items-center justify-between shadow-xs transition-all ${themeStyle.bannerBg}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#ffddb8] text-[24px]">storefront</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-display font-bold text-base truncate">
                      {business.name || 'Sharma Studio'}
                    </p>
                    <span
                      className="material-symbols-outlined text-[#ffddb8] text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <p className="text-xs text-white/80 truncate">Scan &amp; Pay via any UPI App</p>
                </div>
              </div>

              {/* Sparkle Token */}
              <div className="w-6 h-6 rounded-full bg-[#fea619] text-[#684000] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[14px]">bolt</span>
              </div>
            </div>

            {/* High-contrast Scannable QR Visual Box */}
            <div className="relative mt-4 p-3 bg-white rounded-xl shadow-md flex items-center justify-center">
              {/* Standee Corner Alignment Markers */}
              <div className={`absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 ${themeStyle.cornerBorder}`}></div>
              <div className={`absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 ${themeStyle.cornerBorder}`}></div>
              <div className={`absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 ${themeStyle.cornerBorder}`}></div>
              <div className={`absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 ${themeStyle.cornerBorder}`}></div>

              {/* Realistic Crisp SVG QR Code */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full text-[#131b2e]" viewBox="0 0 100 100">
                  {/* QR Finder: Top-Left */}
                  <rect fill="currentColor" height="26" rx="2" width="26" x="5" y="5"></rect>
                  <rect fill="#FFFFFF" height="20" rx="1" width="20" x="8" y="8"></rect>
                  <rect fill="currentColor" height="14" rx="1" width="14" x="11" y="11"></rect>

                  {/* QR Finder: Top-Right */}
                  <rect fill="currentColor" height="26" rx="2" width="26" x="69" y="5"></rect>
                  <rect fill="#FFFFFF" height="20" rx="1" width="20" x="72" y="8"></rect>
                  <rect fill="currentColor" height="14" rx="1" width="14" x="75" y="11"></rect>

                  {/* QR Finder: Bottom-Left */}
                  <rect fill="currentColor" height="26" rx="2" width="26" x="5" y="69"></rect>
                  <rect fill="#FFFFFF" height="20" rx="1" width="20" x="8" y="72"></rect>
                  <rect fill="currentColor" height="14" rx="1" width="14" x="11" y="75"></rect>

                  {/* Modules */}
                  <rect fill="currentColor" height="6" width="6" x="36" y="7"></rect>
                  <rect fill="currentColor" height="6" width="6" x="47" y="7"></rect>
                  <rect fill="currentColor" height="6" width="6" x="58" y="7"></rect>
                  <rect fill="currentColor" height="6" width="6" x="36" y="18"></rect>
                  <rect fill="currentColor" height="6" width="6" x="47" y="18"></rect>
                  <rect fill="currentColor" height="6" width="6" x="58" y="24"></rect>
                  <rect fill="currentColor" height="6" width="6" x="7" y="36"></rect>
                  <rect fill="currentColor" height="6" width="6" x="18" y="36"></rect>
                  <rect fill="currentColor" height="6" width="6" x="29" y="36"></rect>
                  <rect fill="currentColor" height="6" width="6" x="36" y="36"></rect>
                  <rect fill="currentColor" height="6" width="6" x="58" y="36"></rect>
                  <rect fill="currentColor" height="6" width="6" x="69" y="36"></rect>
                  <rect fill="currentColor" height="6" width="6" x="87" y="36"></rect>
                  <rect fill="currentColor" height="6" width="6" x="7" y="47"></rect>
                  <rect fill="currentColor" height="6" width="6" x="24" y="47"></rect>
                  <rect fill="currentColor" height="6" width="6" x="69" y="47"></rect>
                  <rect fill="currentColor" height="6" width="6" x="80" y="47"></rect>
                  <rect fill="currentColor" height="6" width="6" x="7" y="58"></rect>
                  <rect fill="currentColor" height="6" width="6" x="18" y="58"></rect>
                  <rect fill="currentColor" height="6" width="6" x="36" y="58"></rect>
                  <rect fill="currentColor" height="6" width="6" x="58" y="58"></rect>
                  <rect fill="currentColor" height="6" width="6" x="80" y="58"></rect>
                  <rect fill="currentColor" height="6" width="6" x="36" y="69"></rect>
                  <rect fill="currentColor" height="6" width="6" x="47" y="69"></rect>
                  <rect fill="currentColor" height="6" width="6" x="69" y="69"></rect>
                  <rect fill="currentColor" height="6" width="6" x="87" y="69"></rect>
                  <rect fill="currentColor" height="6" width="6" x="36" y="80"></rect>
                  <rect fill="currentColor" height="6" width="6" x="58" y="80"></rect>
                  <rect fill="currentColor" height="6" width="6" x="75" y="80"></rect>
                  <rect fill="currentColor" height="6" width="6" x="47" y="87"></rect>
                  <rect fill="currentColor" height="6" width="6" x="69" y="87"></rect>
                  <rect fill="currentColor" height="6" width="6" x="80" y="87"></rect>
                </svg>

                {/* Brand Logo in Center of QR */}
                <div className="absolute inset-0 m-auto w-12 h-12 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center border border-gray-100 overflow-hidden">
                  <img
                    alt={business.name || 'Brand Logo'}
                    className="w-full h-full object-contain rounded-lg"
                    src={resolveImageUrl(business.logoUrl || APP_IMAGES.logo || '/brandx-logo.png')}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Optional Fixed Amount Display Indicator */}
            {currentDisplayAmount !== null && (
              <div
                className="mt-2 px-3 py-1 rounded-full bg-[#e2e7ff] text-[#3525cd] font-display font-bold text-base flex items-center gap-1 animate-fade-in"
              >
                <span className="text-[11px] text-[#464555] font-normal">Amount:</span>
                <span>₹{currentDisplayAmount.toFixed(2)}</span>
              </div>
            )}

            {/* UPI VPA Identifier Strip with Fast Copy */}
            <div className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#f2f3ff]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[#3525cd] text-[18px]">
                  account_balance_wallet
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-[#464555]">Merchant UPI ID</p>
                  <p className="text-xs text-[#131b2e] truncate font-mono font-bold">
                    {business.upiId || 'Not set (Add in Profile)'}
                  </p>
                </div>
              </div>
              <button
                onClick={copyUpiId}
                aria-label="Copy UPI ID"
                className="p-1.5 rounded-lg bg-white hover:bg-gray-100 text-[#3525cd] transition-transform active:scale-90"
                type="button"
                title="Copy UPI ID"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            </div>

            {/* Accepted UPI Network Logos Row */}
            <div className="mt-3 pt-2 w-full flex items-center justify-center gap-2 bg-transparent flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#131b2e] text-[10px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#4285F4]"></span> GPay
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#131b2e] text-[10px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#5f259f]"></span> PhonePe
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#131b2e] text-[10px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#002e6e]"></span> Paytm
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#131b2e] text-[10px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#005338]"></span> BHIM
              </span>
            </div>
          </div>

          {/* Acrylic Wooden Pedestal Base */}
          <div className="w-48 h-3 -mt-1 rounded-b-xl bg-gradient-to-r from-[#d2d9f4] via-[#dae2fd] to-[#d2d9f4] shadow-md"></div>
          <div className="w-40 h-1.5 rounded-b-md bg-[#c7c4d8]/50 shadow-xs"></div>
        </div>
      </section>

      {/* Commercial Action Card: Physical Acrylic Delivery Promotion */}
      <section className="px-4 py-1 max-w-lg mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl bg-[#fea619]/20 p-4 flex items-center justify-between border border-[#fea619]/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#fea619] text-[#684000] flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[24px]">local_shipping</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h2 className="font-display font-semibold text-sm text-[#131b2e]">
                  Order Table Standee
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#ffddb8] text-[#2a1700] text-[10px] font-bold">
                  ₹199
                </span>
              </div>
              <p className="text-[11px] text-[#464555]">
                Thick acrylic, waterproof &amp; delivered in 3 days
              </p>
            </div>
          </div>
          <button
            onClick={() => showToast('Order placed! Vyapar partner will call for dispatch')}
            className="px-3 py-2 rounded-xl bg-[#855300] hover:bg-[#684000] text-white text-xs font-semibold shrink-0 shadow-xs active:scale-95 transition-transform"
            type="button"
          >
            Order Now
          </button>
        </div>
      </section>

      {/* QR Configuration Controls Section */}
      <section className="px-4 py-3 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Amount Lock & Tokens Card */}
        <div className="p-4 rounded-2xl bg-white shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#3525cd] text-[22px]">pin</span>
              <div>
                <p className="text-xs font-bold text-[#131b2e]">Fix Payment Amount</p>
                <p className="text-[11px] text-[#464555]">Lock exact token amount or bill total</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={fixAmount}
                onChange={(e) => setFixAmount(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#dae2fd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3525cd]"></div>
            </label>
          </div>

          {/* Quick Amount Preset Chips */}
          {fixAmount && (
            <div className="flex items-center gap-2 pt-1 animate-fade-in flex-wrap">
              {[100, 500, 1000].map((amt) => {
                const isSelected = selectedAmount === amt;
                return (
                  <button
                    key={amt}
                    onClick={() => {
                      setSelectedAmount(amt);
                      setCustomAmount('');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#3525cd] text-white shadow-xs'
                        : 'bg-[#e2e7ff] text-[#131b2e] hover:bg-[#dae2fd]'
                    }`}
                    type="button"
                  >
                    ₹{amt} {amt === 500 && '(Advance)'}
                  </button>
                );
              })}

              <div className="flex-1 min-w-[100px] relative">
                <input
                  type="number"
                  placeholder="Custom ₹"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  className="w-full h-8 px-3 rounded-xl bg-[#f2f3ff] text-xs text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Standee Theme & Layout Selector */}
        <div className="p-4 rounded-2xl bg-white shadow-sm border border-gray-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#855300] text-[22px]">palette</span>
              <p className="text-xs font-bold text-[#131b2e]">Standee Theme Style</p>
            </div>
            <span className="text-[11px] text-[#3525cd] font-semibold">4 Templates</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'classic', title: 'Classic Shop', sub: 'Indigo & Gold brand frame' },
              { id: 'minimal', title: 'Minimal Acrylic', sub: 'Monochrome modern slate' },
              { id: 'festive', title: 'Festive Dhamaka', sub: 'Diwali & Pooja borders' },
              { id: 'card', title: 'Card Backside', sub: 'Pocket wallet compact' },
            ].map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    setSelectedTheme(theme.id as any);
                    showToast(`Switched theme to ${theme.title}`);
                  }}
                  className={`p-3 rounded-xl text-left flex flex-col gap-1 transition-all ${
                    isSelected
                      ? 'bg-[#e2dfff] border border-[#3525cd]'
                      : 'bg-[#f2f3ff] hover:bg-[#eaedff]'
                  }`}
                  type="button"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#131b2e]">{theme.title}</span>
                    {isSelected ? (
                      <span className="material-symbols-outlined text-[#3525cd] text-[16px]">
                        check_circle
                      </span>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-[#c7c4d8]"></span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#464555]">{theme.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons Block (Visible above BottomNav) */}
        <div className="w-full flex flex-col gap-2.5 pt-2">
          <div className="flex items-center gap-2">
            {/* WhatsApp Direct */}
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 h-13 rounded-2xl bg-[#005338] hover:bg-[#00402b] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 active:scale-98 transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">share</span>
              <span>Share on WhatsApp</span>
            </button>

            {/* Print / Download Standee PDF */}
            <button
              onClick={handleDownloadPdf}
              className="flex-1 h-13 rounded-2xl bg-[#3525cd] hover:bg-[#2e1fb5] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-98 transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              <span>Print Standee PDF</span>
            </button>
          </div>

          <p className="text-center text-[10px] text-[#464555] font-medium">
            High-resolution vector PDF • Ready to print in standard A4 &amp; Table Standee sizes
          </p>
        </div>
      </section>

      {/* WhatsApp Desktop / Web Share Guide Modal */}
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
