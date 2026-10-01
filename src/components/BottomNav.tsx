import React, { useState } from 'react';
import { ScreenId } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../hooks/useSubscription';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenPro: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  onOpenPro,
}) => {
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const { t, isHindi } = useLanguage();
  const { isPro } = useSubscription();

  // If in full editor mode, pro modal or settings, hide bottom bar
  if (currentScreen === 'pro-modal' || currentScreen === 'editor' || currentScreen === 'settings') {
    return null;
  }

  return (
    <>
      {/* Create Quick Drawer Modal */}
      {showCreateDrawer && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fade-in"
          onClick={() => setShowCreateDrawer(false)}
        >
          <div
            className="w-full max-w-lg bg-[#131B2E] border-t border-white/20 rounded-t-3xl p-5 shadow-2xl pb-10 flex flex-col gap-4 animate-slide-up text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-1" />
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {isHindi ? 'नया बिज़नेस एसेट बनाएं 🚀' : 'Create New Business Asset 🚀'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isHindi ? 'चुनें कि आप क्या बनाना या प्रबंधित करना चाहते हैं' : 'Choose what you want to create or manage'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateDrawer(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowCreateDrawer(false);
                  onNavigate('editor');
                }}
                className="p-3.5 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-white/10 flex flex-col items-start text-left gap-2 transition-all active:scale-95 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-[20px]">palette</span>
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">
                    {isHindi ? 'त्योहार पोस्टर' : 'Festival Poster'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isHindi ? 'दीवाली, सेल व बैनर' : 'Diwali, Sales & Banners'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateDrawer(false);
                  onNavigate('invoice');
                }}
                className="p-3.5 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-white/10 flex flex-col items-start text-left gap-2 transition-all active:scale-95 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white block">
                      {isHindi ? 'बिल व GST इनवॉइस' : 'Bill & GST Invoice'}
                    </span>
                    {!isPro && (
                      <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                        PRO
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isHindi ? 'POS व A4 टैक्स इनवॉइस' : 'POS & A4 Tax Invoice'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateDrawer(false);
                  onNavigate('khata');
                }}
                className="p-3.5 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-white/10 flex flex-col items-start text-left gap-2 transition-all active:scale-95 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow">
                  <span className="text-xl">📒</span>
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">
                    {isHindi ? 'डिजिटल खाता' : 'Digital Khata'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isHindi ? 'उधार व तगादा रिमाइंडर' : 'Udhar & WhatsApp Taqada'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateDrawer(false);
                  onNavigate('dukaan');
                }}
                className="p-3.5 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-white/10 flex flex-col items-start text-left gap-2 transition-all active:scale-95 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
                  <span className="text-xl">🌐</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white block">
                      {isHindi ? 'डिजिटल दुकान' : 'Digital Dukaan'}
                    </span>
                    {!isPro && (
                      <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                        PRO
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isHindi ? 'बायो-लिंक व कैटलॉग' : 'Bio-link & Catalog'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateDrawer(false);
                  onNavigate('standee');
                }}
                className="p-3.5 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-white/10 flex flex-col items-start text-left gap-2 transition-all active:scale-95 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-white block">
                      {isHindi ? 'UPI स्टैंडी QR' : 'UPI Standee QR'}
                    </span>
                    {!isPro && (
                      <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase">
                        PRO
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isHindi ? 'टेबलटॉप QR डिज़ाइनर' : 'Tabletop QR Designer'}
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateDrawer(false);
                  onNavigate('copilot');
                }}
                className="p-3.5 rounded-2xl bg-[#1E293B] hover:bg-slate-800 border border-white/10 flex flex-col items-start text-left gap-2 transition-all active:scale-95 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                </div>
                <div>
                  <span className="font-bold text-xs text-white block">
                    {isHindi ? 'AI वॉइस कोपायलट' : 'AI Voice Copilot'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isHindi ? 'कैप्शन व रिव्यूज़' : 'Captions & Reviews'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-[#0F172A]/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_25px_rgba(0,0,0,0.6)]">
        <div className="relative flex justify-around items-center h-16 px-2 max-w-lg mx-auto">
          
          {/* 1. Posters & Daily Status */}
          <button
            onClick={() => onNavigate('templates')}
            className={`flex flex-col items-center justify-center gap-1 w-14 h-full transition-colors cursor-pointer ${
              currentScreen === 'templates'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: currentScreen === 'templates' ? "'FILL' 1" : "'FILL' 0" }}
            >
              palette
            </span>
            <span className="text-[10px]">{t.navPosters}</span>
          </button>

          {/* 2. Billing & Invoices */}
          <button
            onClick={() => onNavigate('invoice')}
            className={`flex flex-col items-center justify-center gap-1 w-14 h-full transition-colors cursor-pointer relative ${
              currentScreen === 'invoice'
                ? 'text-blue-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: currentScreen === 'invoice' ? "'FILL' 1" : "'FILL' 0" }}
              >
                receipt_long
              </span>
              {!isPro && (
                <span className="absolute -top-1.5 -right-3.5 bg-amber-500 text-slate-950 text-[7px] font-black px-1 rounded-full uppercase leading-tight shadow-xs">
                  PRO
                </span>
              )}
            </div>
            <span className="text-[10px]">{t.navBilling}</span>
          </button>

          {/* 3. Center Floating Quick Create Button */}
          <div className="relative -top-4 flex flex-col items-center justify-center">
            <button
              onClick={() => setShowCreateDrawer(true)}
              aria-label="Create Studio"
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 hover:scale-105 text-white flex items-center justify-center shadow-lg shadow-blue-600/50 active:scale-95 transition-all cursor-pointer border border-white/20"
            >
              <span className="material-symbols-outlined text-[26px]">add</span>
            </button>
            <span className="text-[10px] text-slate-400 font-bold mt-0.5">{t.navCreate}</span>
          </div>

          {/* 4. Customer Khata */}
          <button
            onClick={() => onNavigate('khata')}
            className={`flex flex-col items-center justify-center gap-1 w-14 h-full transition-colors cursor-pointer ${
              currentScreen === 'khata'
                ? 'text-rose-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-[18px]">📒</span>
            <span className="text-[10px]">{t.navKhata}</span>
          </button>

          {/* 5. Digital Dukaan */}
          <button
            onClick={() => onNavigate('dukaan')}
            className={`flex flex-col items-center justify-center gap-1 w-14 h-full transition-colors cursor-pointer relative ${
              currentScreen === 'dukaan'
                ? 'text-indigo-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <span className="text-[18px]">🌐</span>
              {!isPro && (
                <span className="absolute -top-1.5 -right-3.5 bg-amber-500 text-slate-950 text-[7px] font-black px-1 rounded-full uppercase leading-tight shadow-xs">
                  PRO
                </span>
              )}
            </div>
            <span className="text-[10px]">{t.navDukaan}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
