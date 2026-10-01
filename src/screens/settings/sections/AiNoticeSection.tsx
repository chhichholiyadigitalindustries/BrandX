import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

export const AiNoticeSection: React.FC = () => {
  const { isHindi } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg">
            <span className="material-symbols-outlined text-[30px]">auto_awesome</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'AI उपयोग व डेटा नोटिस' : 'AI Usage & Data Notice'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'BrandX AI Copilot और जनरेटिव फीचर्स के डेटा उपयोग से जुड़े महत्वपूर्ण दिशानिर्देश।'
                : 'Transparency, user advisories, and data transmission rules for BrandX AI Copilot.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-full shrink-0">
          AI Assistance
        </span>
      </div>

      {/* 2. Clear Processing Disclosure */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">cloud_upload</span>
          <span>{isHindi ? 'AI डेटा ट्रांसमिशन प्रकटीकरण' : 'AI Data Transmission & Processing'}</span>
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isHindi
            ? 'जब आप BrandX में AI सुविधाओं (जैसे Biz AI Copilot, वॉइस बिलिंग या मार्केटिंग कैप्शन जनरेटर) का उपयोग करते हैं, तो आपका प्रॉम्प्ट, चयनित श्रेणी और अनुरोधित इनपुट सामग्री को प्रोसेसिंग के लिए हमारे कॉन्फ़िगर किए गए AI सेवा प्रदाता को सुरक्षित रूप से भेजा जाता है।'
            : 'When you interact with BrandX artificial intelligence features (including Biz AI Copilot, marketing caption generator, review replies, and Voice-to-Bill assistant), your prompt text, requested business category, and contextual instructions are sent securely to our configured backend AI service provider for processing.'}
        </p>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1">
          <span className="font-bold text-slate-200 block">Transmission Protocol:</span>
          <p>
            Prompts and creative requests are sent over encrypted HTTPS connections to BrandX servers and forwarded to the AI service using protected server-side credentials. Master API credentials remain strictly on protected servers and are never exposed to client browsers.
          </p>
        </div>
      </div>

      {/* 3. User Safety Advisories */}
      <div className="p-4 sm:p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-[22px]">warning</span>
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
            {isHindi ? 'उपयोगकर्ता सुरक्षा परामर्श (User Safety Advisory)' : 'Mandatory User Safety Advisory'}
          </h4>
        </div>

        <div className="space-y-3 text-xs leading-relaxed">
          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 font-bold shrink-0 mt-0.5">1.</span>
            <div>
              <strong className="text-amber-100 block">Do Not Enter Sensitive Credentials into AI Prompts:</strong>
              <span>
                Do not enter passwords, OTPs, debit/credit card numbers, bank PINs, net-banking credentials, Aadhaar numbers, or unnecessary sensitive personal information of yourself or your customers into AI prompt textboxes.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 font-bold shrink-0 mt-0.5">2.</span>
            <div>
              <strong className="text-amber-100 block">Review Generated Content Before Use:</strong>
              <span>
                Always review and verify AI-generated festive greetings, marketing messages, product descriptions, discount offers, and captions before sending them to customers, posting them online, or printing them.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 font-bold shrink-0 mt-0.5">3.</span>
            <div>
              <strong className="text-amber-100 block">AI Output Can Be Inaccurate:</strong>
              <span>
                Generative AI models are statistical text generators and may occasionally produce inaccurate, incomplete, hallucinated, or commercially unsuitable output. BrandX does not guarantee factual correctness.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 font-bold shrink-0 mt-0.5">4.</span>
            <div>
              <strong className="text-amber-100 block">No Legal, Tax or Professional Advice:</strong>
              <span>
                AI output does NOT constitute legal, tax, accounting, financial, or professional advice. Always consult a qualified professional for regulatory or tax compliance questions.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="text-amber-400 font-bold shrink-0 mt-0.5">5.</span>
            <div>
              <strong className="text-amber-100 block">Final User Responsibility:</strong>
              <span>
                You remain solely responsible for any content, marketing claims, offers, or communications created, dispatched, or published using BrandX AI features.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Best Practices for Indian Vyaparis */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3 text-xs">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">lightbulb</span>
          <span>{isHindi ? 'व्यापारियों के लिए सर्वोत्तम प्रथाएं' : 'Best Practices for Merchants'}</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-400">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <strong className="text-slate-200 block mb-1">Festive &amp; Sale Posters:</strong>
            Specify festival name, discount percentage, and product highlight (e.g. &quot;Diwali 20% off on sweets&quot;) rather than general unspecific requests.
          </div>
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <strong className="text-slate-200 block mb-1">Customer Reviews &amp; Captions:</strong>
            Use AI to refine polite Hinglish or English replies for Google Maps reviews, but check customer name and transaction context before publishing.
          </div>
        </div>
      </div>
    </div>
  );
};
