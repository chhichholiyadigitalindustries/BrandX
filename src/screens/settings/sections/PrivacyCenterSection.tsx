import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

export const PrivacyCenterSection: React.FC = () => {
  const { isHindi } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <span className="material-symbols-outlined text-[30px]">privacy_tip</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'प्राइवेसी केंद्र (Privacy Center)' : 'BrandX Privacy Center'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'सरल भाषा में जानें कि BrandX कौन-सी जानकारी प्रोसेस करता है और उसका क्या उपयोग होता है।'
                : 'Clear, straightforward explanation of what data is processed and why.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full shrink-0">
          DPDPA 2023 Aligned
        </span>
      </div>

      {/* 2. Transparent Core Commitments */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">handshake</span>
          <span>{isHindi ? 'हमारी स्पष्ट प्रतिबद्धताएं (Core Commitments)' : 'Our Core Commitments'}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>We Do NOT Sell Your Data</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isHindi
                ? 'BrandX आपकी व्यक्तिगत जानकारी, खाता बही या ग्राहकों का डेटा किसी विज्ञापनदाता या डेटा ब्रोकर को नहीं बेचता।'
                : 'BrandX does not sell, rent, or monetize your business ledger, invoices, or customer details to third-party data brokers.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <span className="material-symbols-outlined text-[18px]">hub</span>
              <span>Essential Infrastructure Only</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Data may be processed or shared with service providers only where strictly necessary to provide the service, comply with law, maintain security, or process requested functionality.
            </p>
          </div>
        </div>
      </div>

      {/* 3. What Information BrandX May Process */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400 text-[18px]">inventory_2</span>
          <span>{isHindi ? 'BrandX कौन-सी जानकारी प्रोसेस कर सकता है?' : 'What Information BrandX May Process'}</span>
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          {isHindi
            ? 'हम केवल वही डेटा प्रोसेस करते हैं जो आपके द्वारा ऐप में इनपुट किया जाता है या सेवा संचालन के लिए तकनीकी रूप से आवश्यक है:'
            : 'We process information that you voluntarily enter into BrandX tools or that is necessary for operating the software:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">Account Information</span>
            <p className="text-[11px] text-slate-400">Mobile number, name, email address, profile photo, and login method.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">Business Profile</span>
            <p className="text-[11px] text-slate-400">Shop name, business category, shop address, city, state, PIN code, and logo.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">GST &amp; Business Details</span>
            <p className="text-[11px] text-slate-400">GSTIN, PAN number, and UPI VPA ID entered by you for invoices and QR standees.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">Customer Khata Ledger</span>
            <p className="text-[11px] text-slate-400">Customer names, phone numbers, and Udhar/Jama transaction entries recorded by merchant.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">Product &amp; Inventory</span>
            <p className="text-[11px] text-slate-400">Item names, stock quantities, rates, tax rates, and product images in Digital Dukaan.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">Invoice &amp; Billing Data</span>
            <p className="text-[11px] text-slate-400">Invoice numbers, customer names, line items, totals, payment modes, and dates.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">Subscription &amp; Payments</span>
            <p className="text-[11px] text-slate-400">Subscription plan tier, status, order ID, and transaction references (no card numbers stored).</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">AI Requests &amp; Content</span>
            <p className="text-[11px] text-slate-400">Prompts, captions, and business queries you submit to Biz AI Copilot.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 block">Technical &amp; Session Info</span>
            <p className="text-[11px] text-slate-400">Client user-agent, operating system, IP address, and authentication session timestamps.</p>
          </div>
        </div>
      </div>

      {/* 4. Why Data Is Used */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-[18px]">psychology</span>
          <span>{isHindi ? 'डेटा का उपयोग किस उद्देश्य से किया जाता है?' : 'Why Data Is Used'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">check_circle</span>
            <span className="text-slate-300"><strong>Provide BrandX services:</strong> Enable core invoicing, POS billing, posters, and Khata.</span>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">check_circle</span>
            <span className="text-slate-300"><strong>Authenticate users:</strong> Verify phone numbers, manage sessions, and protect account access.</span>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">check_circle</span>
            <span className="text-slate-300"><strong>Save business data:</strong> Synchronize your shop records to the persistent cloud database.</span>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">check_circle</span>
            <span className="text-slate-300"><strong>Generate user-requested features:</strong> Create PDF bills, marketing graphics, and AI creative.</span>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">check_circle</span>
            <span className="text-slate-300"><strong>Provide support:</strong> Diagnose app bugs, troubleshoot invoices, and answer merchant queries.</span>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">check_circle</span>
            <span className="text-slate-300"><strong>Maintain security:</strong> Detect unauthorized account access, fraud, and rate-limit abuses.</span>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">check_circle</span>
            <span className="text-slate-300"><strong>Process subscriptions:</strong> Validate Pro memberships and maintain payment reconciliation.</span>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <span className="material-symbols-outlined text-blue-400 text-[18px] shrink-0">check_circle</span>
            <span className="text-slate-300"><strong>Improve reliability:</strong> Enhance system uptime, performance, and legal compliance under Indian law.</span>
          </div>
        </div>
      </div>

      {/* 5. Service Provider Disclosure Statement */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-2 text-xs">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400 text-[18px]">dns</span>
          <span>{isHindi ? 'सेवा प्रदाता और कानूनी प्रकटीकरण' : 'Service Providers & Statutory Disclosure'}</span>
        </h4>
        <p className="text-slate-300 leading-relaxed">
          BrandX relies on reputable cloud infrastructure partners to operate our SaaS suite. Your data may be processed or shared with service providers where necessary to provide the service, comply with law, maintain security, or process requested functionality:
        </p>
        <ul className="list-disc list-inside text-slate-400 space-y-1 pl-2">
          <li><strong>Authentication &amp; SMS Services:</strong> User authentication, SMS OTP routing, and session token management.</li>
          <li><strong>Cloud Database &amp; Hosting Infrastructure:</strong> Multi-tenant database storage, daily backups, and secure cloud server infrastructure.</li>
          <li><strong>Artificial Intelligence Services:</strong> Generating text and creative prompts explicitly submitted by you.</li>
          <li><strong>Authorized Payment Gateways:</strong> Handling Pro subscription payments under PCI-DSS compliant protocols.</li>
        </ul>
      </div>
    </div>
  );
};
