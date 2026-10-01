import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

export const SharingNoticeSection: React.FC = () => {
  const { isHindi } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <span className="material-symbols-outlined text-[30px]">share</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'व्हाट्सएप व शेयरिंग नोटिस' : 'WhatsApp & External Sharing Notice'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'जानें कि जब आप बिल, खाता तगादा या पोस्टर शेयर करते हैं तो डेटा कैसे भेजा जाता है।'
                : 'Understand how data is prepared, reviewed, and transmitted when you use share features.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full shrink-0">
          User-Controlled
        </span>
      </div>

      {/* 2. Core Operational Architecture */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified</span>
          <span>{isHindi ? 'शेयरिंग कैसे कार्य करती है? (How Sharing Works)' : 'How Sharing Works'}</span>
        </h4>

        <div className="space-y-3 text-xs leading-relaxed text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <strong className="text-white block font-bold">1. The User Controls the Actual Sharing Action:</strong>
            <p className="text-slate-400 text-[11px]">
              BrandX does not automatically send messages or bills without your explicit command. You must initiate each share action by tapping &quot;Share on WhatsApp&quot;, &quot;Send Taqada&quot;, or &quot;Share Poster&quot;.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <strong className="text-white block font-bold">2. BrandX Prepares the Content Locally:</strong>
            <p className="text-slate-400 text-[11px]">
              BrandX prepares the formatted message text, itemized bill summary, payment reminder link, or image asset (such as an invoice PDF or festival graphic) and hands it off to your device&apos;s native share dialog or WhatsApp intent.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
            <strong className="text-white block font-bold">3. The Destination Platform Handles Final Transmission:</strong>
            <p className="text-slate-400 text-[11px]">
              Once handed off, the destination platform (e.g., WhatsApp, Telegram, Gmail, SMS, or Bluetooth) manages the actual delivery over its own network under its respective privacy terms and end-to-end encryption protocols. BrandX does not intercept your WhatsApp chats.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Verification Advisory */}
      <div className="p-4 sm:p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-[20px]">fact_check</span>
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
            {isHindi ? 'प्राप्तकर्ता व सामग्री सत्यापन की ज़िम्मेदारी' : 'Recipient & Content Verification Advisory'}
          </h4>
        </div>

        <p className="text-xs text-amber-100 leading-relaxed">
          {isHindi
            ? 'किसी भी ग्राहक को बिल, बकाया राशि या पेमेंट लिंक भेजने से पहले, कृपया व्हाट्सएप स्क्रीन पर प्राप्तकर्ता का फ़ोन नंबर और संदेश का विवरण अवश्य जांच लें।'
            : 'Always verify the recipient\'s mobile number and the message content in WhatsApp or your messaging application before tapping the final "Send" button.'}
        </p>

        <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-1 pl-1">
          <li>Ensure the bill amount and discount match your physical counter transaction.</li>
          <li>Confirm your shop&apos;s UPI ID is correctly formatted on invoice payment links.</li>
          <li>Do not send unsolicited marketing spam to customers without their consent.</li>
        </ul>
      </div>
    </div>
  );
};
