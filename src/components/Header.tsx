import React, { useState } from 'react';
import { ScreenId, BusinessProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { resolveImageUrl } from '../utils/imageUrl';

interface HeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenPro: () => void;
  onOpenAdmin?: () => void;
  onOpenPlayStore?: () => void;
  onLogout?: () => void;
  business?: BusinessProfile;
  unreadNotifications?: boolean;
  isPro?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  onOpenPro,
  onOpenAdmin,
  onOpenPlayStore,
  onLogout,
  business,
  unreadNotifications = false,
  isPro = false,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { t, language, toggleLanguage, isHindi } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'templates':
        return isHindi ? 'पोस्टर्स व स्टेटस' : 'Posters & Status';
      case 'invoice':
        return isHindi ? 'GST व POS बिलिंग' : 'GST & POS Billing';
      case 'khata':
        return isHindi ? 'डिजिटल खाता' : 'Digital Khata';
      case 'dukaan':
        return isHindi ? 'डिजिटल दुकान' : 'Digital Dukaan';
      case 'standee':
        return isHindi ? 'UPI स्टैंडी' : 'UPI Standee';
      case 'editor':
        return isHindi ? 'कैनवास एडिटर' : 'Canvas Editor';
      case 'copilot':
        return isHindi ? 'AI वॉइस कोपायलट' : 'AI Voice Copilot';
      case 'onboarding':
        return isHindi ? 'बिज़नेस प्रोफ़ाइल' : 'Business KYC';
      case 'referrals':
        return isHindi ? 'रेफर व कमाएं' : 'Refer & Earn';
      case 'wallet':
        return isHindi ? 'सिक्का वॉलेट' : 'Coin Wallet';
      case 'settings':
        return isHindi ? 'सेटिंग्स व सुरक्षा' : 'Settings & Privacy';
      case 'auth':
      case 'login':
        return isHindi ? 'साइन इन' : 'Sign In';
      default:
        return 'BrandX';
    }
  };

  const showBackButton = currentScreen !== 'templates';

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-[#0B0F19]/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] pt-safe border-b border-slate-800/80">
      <div className="h-16 px-4 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          {showBackButton ? (
            <button
              onClick={() => onNavigate('templates')}
              aria-label="Go to Home"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors text-white active:scale-95 shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
          ) : null}

          <div
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer min-w-0"
            onClick={() => onNavigate('templates')}
          >
            {/* Official BrandX Logo Lockup */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl p-0.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shrink-0 shadow-md flex items-center justify-center overflow-hidden">
              <img
                src="/brandx-logo.png"
                alt="BrandX Logo"
                className="w-full h-full object-contain rounded-[10px] bg-[#0B0F19]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-[15px] tracking-tight text-white leading-none">
                  Brand<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400">X</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 font-bold border border-blue-500/30 truncate max-w-[100px] sm:max-w-none">
                  {getScreenTitle()}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold truncate hidden xs:block mt-0.5">
                {business?.name || 'Super App for Indian MSMEs'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            title={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-blue-400">translate</span>
            <span className="text-[11px]">{isHindi ? 'हि' : 'EN'}</span>
          </button>

          {/* Theme Toggle (Dark / Light) */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Pro VIP Badge Trigger */}
          <button
            onClick={onOpenPro}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs font-extrabold transition-all cursor-pointer shadow-md ${
              isPro
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-amber-950 ring-1 ring-amber-300'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white hover:brightness-110'
            }`}
          >
            <span
              className="material-symbols-outlined text-[15px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            <span className="hidden xs:inline">{isPro ? 'PRO VIP' : 'PRO (₹1)'}</span>
          </button>

          {/* Profile & Account Switcher Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1 p-0.5 rounded-full hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
              title="Profile & Account Menu"
            >
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/40 bg-slate-800"
                src={resolveImageUrl(business?.logoUrl || '/brandx-logo.png')}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                }}
              />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-[#111827] rounded-3xl shadow-2xl border border-slate-700 z-50 p-2 flex flex-col gap-1 text-white animate-scale-in">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs font-extrabold text-white truncate">
                      {business?.ownerName || 'My Account'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {business?.name || 'My Business'}
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded-full">
                      ● Active Business Account
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('onboarding');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">storefront</span>
                    <span>{isHindi ? 'बिज़नेस प्रोफ़ाइल व KYC' : 'Business Profile & KYC'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('standee');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                    <span>{isHindi ? 'UPI स्टैंडी स्टूडियो' : 'UPI Standee Studio'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('referrals');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-emerald-400">card_giftcard</span>
                    <span>{isHindi ? 'रेफर व कमाएं (सिक्के)' : 'Refer & Earn (Coins)'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('wallet');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-amber-400">account_balance_wallet</span>
                    <span>{isHindi ? 'सिक्का वॉलेट व निकासी' : 'Coin Wallet & Cashout'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('copilot');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    <span>{isHindi ? 'बिज़ AI कोपायलट' : 'Biz AI Copilot'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-blue-400">settings</span>
                    <span>{isHindi ? 'सेटिंग्स, सुरक्षा व लीगल' : 'Settings, Privacy & Security'}</span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onLogout) {
                        onLogout();
                      } else {
                        onNavigate('auth');
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>{isHindi ? 'लॉगआउट / खाता बदलें' : 'Logout / Switch Account'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
