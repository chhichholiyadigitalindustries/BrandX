import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone, Check, Sparkles } from 'lucide-react';

interface PWAInstallBannerProps {
  onOpenPlayStoreModal: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onOpenPlayStoreModal }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed or explicitly dismissed in this session
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Top Smart Banner for Play Store / Install */}
      <div 
        id="pwa-install-banner"
        className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between gap-2 border-b border-blue-500/20 shadow-xs"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 p-0.5 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
            <img src="/brandx-logo.png" alt="BRANDX" className="w-full h-full object-contain rounded-md bg-[#0B0F19]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-100 truncate">BRANDX</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-500/30">
                Official App
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate">
              Create. Brand. Grow. — Install on your phone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable && (
            <button
              id="banner-install-btn"
              onClick={install}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {isIOS && (
            <button
              id="banner-ios-guide-btn"
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Install iOS</span>
            </button>
          )}

          <button
            id="dismiss-banner-btn"
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSGuide && (
        <div 
          id="ios-guide-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div 
            id="ios-guide-modal"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Install BRANDX on iPhone</h3>
              </div>
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 mb-5">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                <p>
                  Tap the <strong className="text-slate-900">Share</strong> icon <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at the bottom of your Safari screen.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                <p>
                  Scroll down the options list and select <strong className="text-slate-900">&quot;Add to Home Screen&quot;</strong>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                <p>
                  Tap <strong className="text-slate-900">&quot;Add&quot;</strong> in the top right corner. BRANDX will launch full-screen from your phone app grid!
                </p>
              </div>
            </div>

            <button
              id="close-ios-guide-btn"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
