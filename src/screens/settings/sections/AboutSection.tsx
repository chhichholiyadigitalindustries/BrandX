import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface AboutSectionProps {
  onNavigateToLegal?: (docId: string) => void;
}

const OPEN_SOURCE_NOTICES = [
  { component: 'Client Document & PDF Export Utilities', license: 'MIT License' },
  { component: 'Vector Interface Icons & Graphics', license: 'ISC License' },
  { component: 'Canvas Image Rendering Utilities', license: 'MIT License' },
  { component: 'Mobile Device Bridge & File Access Layer', license: 'MIT License' },
  { component: 'Fluid Motion & Animation Controllers', license: 'MIT License' },
];

export const AboutSection: React.FC<AboutSectionProps> = ({ onNavigateToLegal }) => {
  const { isHindi } = useLanguage();
  const [showLicensesModal, setShowLicensesModal] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header with Actual BrandX Logo Asset */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 mx-auto shadow-2xl flex items-center justify-center overflow-hidden">
          <img
            src="/brandx-logo.png"
            alt="BrandX Logo"
            className="w-full h-full object-contain rounded-3xl bg-[#0B0F19]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
            }}
          />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Brand<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400">X</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5 max-w-md mx-auto leading-relaxed">
            All-in-One Digital Business Super App<br />
            for Indian Retailers, Shopkeepers &amp; MSMEs.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-300 pt-2">
          <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 font-semibold">
            Version 1.0.0
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 font-semibold">
            Build 2026.09.PROD
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800 font-bold">
            Production Ready
          </span>
        </div>
      </div>

      {/* 2. About BrandX (Concise User-Facing Overview) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">storefront</span>
          <span>{isHindi ? 'BrandX के बारे में' : 'About BrandX'}</span>
        </h4>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          &ldquo;BrandX helps Indian retailers, shopkeepers and MSMEs manage everyday business activities from one place — including billing, digital business tools, customer management, marketing and AI-powered business assistance.&rdquo;
        </p>
      </div>

      {/* 3. Company & Operating Entity (Clean Public Information) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">corporate_fare</span>
          <span>{isHindi ? 'कंपनी की जानकारी' : 'Company & Operating Entity'}</span>
        </h4>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-800/80 gap-1">
            <span className="text-slate-400">Legal Operating Entity</span>
            <span className="font-semibold text-white">BRANDX Technologies India</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-slate-800/80 gap-1">
            <span className="text-slate-400">Jurisdiction &amp; Headquarters</span>
            <span className="font-semibold text-white">New Delhi, Republic of India</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-1">
            <span className="text-slate-400">Official Support Email</span>
            <a
              href="mailto:support@brandx.in"
              className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
            >
              <span>support@brandx.in</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        </div>
      </div>

      {/* 4. Security & Trust (High-Level User Guidance) */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified_user</span>
          <span>{isHindi ? 'सुरक्षा और विश्वास' : 'Security & Trust'}</span>
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          BrandX is designed with security and privacy in mind. Keep your password and OTP confidential and review the information you share through the app.
        </p>
      </div>

      {/* 5. Legal & Policies Navigation Cards */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-[18px]">gavel</span>
          <span>{isHindi ? 'कानूनी नियम व नीतियां' : 'Legal & Policies'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigateToLegal && onNavigateToLegal('terms')}
            className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-blue-300">
                Terms of Service
              </span>
              <span className="text-[10px] text-slate-400">Platform terms</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateToLegal && onNavigateToLegal('privacy')}
            className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <span className="material-symbols-outlined text-[20px]">privacy_tip</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-emerald-300">
                Privacy Policy
              </span>
              <span className="text-[10px] text-slate-400">Data protections</span>
            </div>
          </button>

          <button
            onClick={() => (onNavigateToLegal ? onNavigateToLegal('licenses') : setShowLicensesModal(true))}
            className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 text-left transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
              <span className="material-symbols-outlined text-[20px]">code</span>
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-purple-300">
                Open Source Licenses
              </span>
              <span className="text-[10px] text-slate-400">Software notices</span>
            </div>
          </button>
        </div>
      </div>

      {/* 6. Footer */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          {onNavigateToLegal && (
            <>
              <button
                onClick={() => onNavigateToLegal('terms')}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                Terms of Service
              </button>
              <span className="text-slate-700">•</span>
              <button
                onClick={() => onNavigateToLegal('privacy')}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-slate-700">•</span>
            </>
          )}
          <button
            onClick={() => setShowLicensesModal(true)}
            className="text-slate-400 hover:text-white underline cursor-pointer"
          >
            Open Source Licenses
          </button>
        </div>

        <span className="text-[11px] text-slate-500">
          &copy; 2026 BRANDX Technologies India. All rights reserved.
        </span>
      </div>

      {/* Open Source Licenses Modal */}
      {showLicensesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowLicensesModal(false)}
        >
          <div
            className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto shadow-2xl space-y-4 animate-scale-in text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-[22px]">code</span>
                <h3 className="font-extrabold text-base text-white">Open Source Software Notices</h3>
              </div>
              <button
                onClick={() => setShowLicensesModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              BrandX acknowledges open-source software libraries used under standard permissive licenses:
            </p>

            <div className="divide-y divide-slate-800 text-xs">
              {OPEN_SOURCE_NOTICES.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <span className="font-medium text-white">{item.component}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 text-[10px] font-mono border border-slate-800">
                    {item.license}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowLicensesModal(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
