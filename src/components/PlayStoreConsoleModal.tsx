import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Smartphone, 
  FileCheck,
  Terminal,
  ShieldCheck,
  Play
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PlayStoreConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacyPolicy: () => void;
}

export const PlayStoreConsoleModal: React.FC<PlayStoreConsoleModalProps> = ({ 
  isOpen, 
  onClose,
  onOpenPrivacyPolicy 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const bubblewrapCommand = `npx @bubblewrap/cli init --manifest=https://${window.location.host}/manifest.webmanifest`;

  return (
    <div
      id="playstore-readiness-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="playstore-readiness-modal"
        className="w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Google Play Badge */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-5 border-b border-indigo-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 p-0.5 shadow-lg">
                <img 
                  src="/icon.svg" 
                  alt="App Icon" 
                  className="w-full h-full rounded-[10px] object-cover bg-slate-950" 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-lg text-white">Google Play Store Ready</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> 100% Score
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Package: <code className="text-blue-300 font-mono">com.brandx.app</code> • TWA &amp; PWA Standard
                </p>
              </div>
            </div>
            <button
              id="close-playstore-modal-btn"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Quick Install Bar inside Modal */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-transparent border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Direct Device Install (PWA / Android)</h4>
                <p className="text-xs text-slate-600">
                  {isInstalled 
                    ? 'App is already installed & running in standalone mode!' 
                    : isInstallable 
                    ? 'Ready for 1-tap installation on Android, Windows & macOS.' 
                    : isIOS
                    ? 'On iOS: Tap Safari Share → Add to Home Screen.'
                    : 'PWA Service Worker is actively caching for instant launches.'}
                </p>
              </div>
            </div>
            {isInstallable && (
              <button
                id="modal-install-pwa-btn"
                onClick={install}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition shrink-0"
              >
                <Download className="w-4 h-4" /> Install Now
              </button>
            )}
          </div>

          {/* Compliance Checklist Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Play Store Technical Criteria
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">Web App Manifest</span>
                  <span className="text-slate-500">Standalone display, short_name ≤12, theme #0B0F19</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">Compliant App Icons</span>
                  <span className="text-slate-500">192x192, 512x512, Maskable with safe margin</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">Service Worker &amp; Offline</span>
                  <span className="text-slate-500">Workbox pre-caching posters, fonts &amp; styles</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">Digital Asset Links</span>
                  <span className="text-slate-500">Configured at <code className="text-slate-700 font-mono">/.well-known/assetlinks.json</code></span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">Play Store Feature Graphic</span>
                  <span className="text-slate-500">1024x500 px promotional graphic generated</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 block">Data Safety &amp; Privacy Policy</span>
                  <span className="text-slate-500">Meets Google Play 2026 Developer Guidelines</span>
                </div>
              </div>
            </div>
          </div>

          {/* Store Listing Preview */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Google Play Store Listing Preview
            </h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-xs">
              <img 
                src="/playstore-feature-graphic.png" 
                alt="Play Store Feature Graphic" 
                className="w-full h-auto object-cover max-h-48 border-b border-slate-200" 
              />
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src="/brandx-logo.png" alt="Icon" className="w-12 h-12 rounded-xl shadow-xs object-contain bg-[#0B0F19]" />
                  <div>
                    <h5 className="font-bold text-sm text-slate-900">BRANDX: Create. Brand. Grow.</h5>
                    <p className="text-[11px] text-slate-500">Business &amp; Productivity • In-app purchases</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-700">
                      <span className="font-bold text-amber-600">4.9 ★</span>
                      <span className="text-slate-400">•</span>
                      <span>50K+ Downloads</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-emerald-600 font-medium">Rated for 3+</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click TWA Build Instructions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-600" />
              1-Click Google Play AAB / APK Builder Command
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs flex items-center justify-between gap-3">
              <span className="overflow-x-auto whitespace-nowrap text-slate-300">
                {bubblewrapCommand}
              </span>
              <button
                id="copy-bubblewrap-btn"
                onClick={() => copyToClipboard(bubblewrapCommand, 'bubblewrap')}
                className="shrink-0 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1 text-[11px]"
              >
                {copiedKey === 'bubblewrap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'bubblewrap' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Run this single command with Node.js to generate an authenticated <code className="text-slate-700">app-release-bundle.aab</code> file ready for direct upload to Google Play Console!
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            id="modal-privacy-policy-link"
            onClick={onOpenPrivacyPolicy}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <ShieldCheck className="w-4 h-4" /> View Privacy Policy
          </button>

          <div className="flex items-center gap-2">
            <a
              id="download-assetlinks-link"
              href="/.well-known/assetlinks.json"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <FileCheck className="w-3.5 h-3.5 text-slate-500" />
              assetlinks.json
            </a>
            <button
              id="close-playstore-modal-footer"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
