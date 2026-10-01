import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { useLanguage } from '../context/LanguageContext';

interface ProFeatureGuardProps {
  featureName: string;
  featureDescription?: string;
  onOpenPro: () => void;
  children: React.ReactNode;
  fallbackOverlay?: boolean;
}

export const ProFeatureGuard: React.FC<ProFeatureGuardProps> = ({
  featureName,
  featureDescription,
  onOpenPro,
  children,
  fallbackOverlay = false,
}) => {
  const { isPro, isLoading } = useSubscription();
  const { isHindi } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <div className="w-8 h-8 border-3 border-[#3525cd] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-gray-500 font-medium">Checking authorization...</span>
      </div>
    );
  }

  if (isPro) {
    return <>{children}</>;
  }

  // Locked State for Free Users
  return (
    <div className="relative min-h-[450px] w-full flex items-center justify-center p-4">
      {fallbackOverlay && (
        <div className="absolute inset-0 filter blur-sm pointer-events-none opacity-20 overflow-hidden select-none">
          {children}
        </div>
      )}

      <div className="relative z-10 max-w-md w-full bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md border border-[#3525cd]/20 rounded-3xl p-6 sm:p-8 text-center shadow-xl flex flex-col items-center animate-fade-in">
        {/* Lock & Pro Header Badge */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3525cd]/15 to-amber-500/15 border border-[#3525cd]/30 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-3xl text-[#3525cd]">lock</span>
          </div>
          <span className="absolute -top-1.5 -right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs border border-white">
            PRO
          </span>
        </div>

        {/* Feature Lock Title */}
        <h3 className="text-lg sm:text-xl font-display font-extrabold text-[#131b2e] dark:text-white mb-2">
          {featureName}
        </h3>

        {/* Clear Requirement Message */}
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4 max-w-xs leading-relaxed">
          {isHindi
            ? `यह फ़ीचर BrandX Pro के साथ उपलब्ध है। Pro में अपग्रेड करके ${featureName} का पूरा लाभ उठाएं।`
            : `This feature is available with BrandX Pro. ${featureDescription || 'Upgrade now to unlock high-growth tools for your business.'}`}
        </p>

        {/* Pro Benefits Highlight */}
        <div className="w-full bg-[#eaedff] dark:bg-[#1a233b] rounded-2xl p-3.5 mb-6 text-left flex flex-col gap-2 border border-[#3525cd]/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#131b2e] dark:text-gray-200">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 font-bold">check_circle</span>
            <span>{isHindi ? 'असीमित GST इनवॉइस और बिलिंग' : 'Unlimited GST Invoices & POS Billing'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#131b2e] dark:text-gray-200">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 font-bold">check_circle</span>
            <span>{isHindi ? 'कस्टम UPI QR व पेमेंट स्टैंडी' : 'Smart UPI Standee & QR Studio'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#131b2e] dark:text-gray-200">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 font-bold">check_circle</span>
            <span>{isHindi ? 'डिजिटल विज़िटिंग कार्ड व ऑनलाइन दुकान' : 'Digital Visiting Card & Product Catalog'}</span>
          </div>
        </div>

        {/* Upgrade CTA */}
        <button
          onClick={onOpenPro}
          type="button"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#3525cd] to-[#4e39ff] hover:from-[#2a1cb3] hover:to-[#3e2adc] text-white font-display font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>{isHindi ? 'BrandX Pro में अपग्रेड करें' : 'Upgrade to Pro'}</span>
        </button>

        <p className="text-[11px] text-gray-400 mt-3">
          {isHindi ? 'शुरू करें मात्र ₹199/महीने से • कभी भी रद्द करें' : 'Starting at ₹199/mo • Cancel anytime'}
        </p>
      </div>
    </div>
  );
};
