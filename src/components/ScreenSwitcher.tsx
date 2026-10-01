import React, { useState } from 'react';
import { ScreenId } from '../types';

interface ScreenSwitcherProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenPro: () => void;
}

export const ScreenSwitcher: React.FC<ScreenSwitcherProps> = ({
  currentScreen,
  onNavigate,
  onOpenPro,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const screens: { id: ScreenId | 'pro'; label: string; icon: string; desc: string; num: number }[] = [
    { id: 'invoice', label: 'Tax Invoice Generator', icon: 'receipt_long', desc: 'Screen 1: GST Bill Maker', num: 1 },
    { id: 'pro', label: 'Unlock BRANDX Pro', icon: 'crown', desc: 'Screen 2: Paywall Modal', num: 2 },
    { id: 'templates', label: 'Template Library', icon: 'dashboard_customize', desc: 'Screen 3: 5,000+ Posters', num: 3 },
    { id: 'standee', label: 'UPI Standee & QR Maker', icon: 'qr_code_scanner', desc: 'Screen 4: Acrylic Table QR', num: 4 },
    { id: 'copilot', label: 'BRANDX AI Copilot', icon: 'auto_awesome', desc: 'Screen 5: AI Marketing Assistant', num: 5 },
    { id: 'onboarding', label: 'Business Profile Setup', icon: 'storefront', desc: 'Screen 6: Step 1 of 2 Profile', num: 6 },
    { id: 'auth', label: 'Welcome & Auth Login', icon: 'login', desc: 'Screen 7: WhatsApp/Phone Login', num: 7 },
    { id: 'editor', label: 'Create Studio Editor', icon: 'palette', desc: 'Screen 8: Poster Canvas Editor', num: 8 },
  ];

  return (
    <div className="fixed top-20 right-3 z-50">
      {/* Floating Toggle Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131b2e] text-white text-xs font-semibold shadow-xl border border-white/20 hover:bg-[#283044] active:scale-95 transition-all"
        title="Quickly switch between all 8 mockup screens"
      >
        <span className="material-symbols-outlined text-[15px] text-[#fea619]">layers</span>
        <span className="hidden sm:inline">Screen:</span>
        <span className="font-bold text-[#6ffbbe]">
          #{screens.find((s) => (s.id === 'pro' ? currentScreen === 'pro-modal' : s.id === currentScreen))?.num || 1}
        </span>
        <span className="material-symbols-outlined text-[14px]">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Screen Selection Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-72 max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 p-2 flex flex-col gap-1 animate-scale-in">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                All 8 App Screens
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                1-Click Jump
              </span>
            </div>

            {screens.map((item) => {
              const isActive =
                item.id === 'pro'
                  ? currentScreen === 'pro-modal'
                  : currentScreen === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsOpen(false);
                    if (item.id === 'pro') {
                      onOpenPro();
                    } else {
                      onNavigate(item.id as ScreenId);
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-[#3525cd] text-white shadow-sm'
                      : 'hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-snug truncate">{item.label}</p>
                    <p className={`text-[10px] truncate ${isActive ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {item.desc}
                    </p>
                  </div>
                  {isActive && (
                    <span className="material-symbols-outlined text-[16px] text-white shrink-0">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
