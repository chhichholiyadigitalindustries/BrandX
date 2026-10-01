import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface HelpSupportSectionProps {
  onNavigateToLegal?: (docId: string) => void;
}

const FAQS = [
  {
    q: 'How does GST Invoice calculation work in BrandX?',
    qHindi: 'BrandX में GST इनवॉइस गणना कैसे काम करती है?',
    a: 'BrandX automatically calculates intra-state (CGST + SGST) or inter-state (IGST) based on your shop state and customer state. You can also generate non-GST retail bills or estimates.',
    aHindi: 'BrandX आपकी दुकान के राज्य और ग्राहक के राज्य के आधार पर स्वचालित रूप से CGST + SGST या IGST की गणना करता है। आप बिना GST वाले बिल भी बना सकते हैं।',
  },
  {
    q: 'Can I use BrandX without an active internet connection?',
    qHindi: 'क्या मैं इंटरनेट के बिना BrandX का उपयोग कर सकता हूँ?',
    a: 'Yes! BrandX is built as an offline-first app. Invoices, Khata ledgers, and products are cached securely on your device and synchronize to your cloud account when connection restores.',
    aHindi: 'हाँ! BrandX ऑफ़लाइन काम करता है। बिल और खाता डेटा डिवाइस में सुरक्षित रहता है और इंटरनेट आने पर स्वतः क्लाउड में सिंक हो जाता है।',
  },
  {
    q: 'Is my customer phone number and Khata ledger private?',
    qHindi: 'क्या मेरे ग्राहकों का फ़ोन नंबर और खाता बही सुरक्षित है?',
    a: 'Yes. All data is partitioned under your authenticated tenant account. BrandX does not sell, rent, or distribute your customer numbers to third-party brokers.',
    aHindi: 'हाँ। आपका संपूर्ण डेटा केवल आपके खाते में सुरक्षित रहता है। BrandX इसे किसी तीसरे पक्ष को कभी नहीं बेचता।',
  },
  {
    q: 'How do I download physical QR standees for UPI payments?',
    qHindi: 'UPI पेमेंट के लिए QR स्टैंडी कैसे डाउनलोड करें?',
    a: 'Navigate to "UPI Standee Studio", choose your preferred tabletop theme, verify your shop UPI ID, and tap "Download High-Res PDF" to print and laminate for your counter.',
    aHindi: 'UPI स्टैंडी स्टूडियो में जाएं, मनपसंद डिज़ाइन चुनें, अपनी UPI ID सत्यापित करें और दुकान के काउंटर पर लगाने हेतु प्रिंट करने के लिए PDF डाउनलोड करें।',
  },
  {
    q: 'How do I cancel my Pro subscription?',
    qHindi: 'मैं अपना प्रो सब्सक्रिप्शन कैसे रद्द कर सकता हूँ?',
    a: 'Go to Settings > Subscription & Billing and tap "Cancel Auto-Renewal", or manage it directly from your UPI app mandate settings.',
    aHindi: 'सेटिंग्स > सब्सक्रिप्शन में जाएं और "Cancel Auto-Renewal" पर टैप करें, या अपने UPI ऐप की मैंडेट सेटिंग्स से प्रबंधित करें।',
  },
];

export const HelpSupportSection: React.FC<HelpSupportSectionProps> = ({
  onNavigateToLegal,
}) => {
  const { isHindi } = useLanguage();

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Bug Report Form State
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugCategory, setBugCategory] = useState('Invoicing / Billing');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSubmitted, setBugSubmitted] = useState(false);

  const handleSubmitBug = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:support@brandx.in?subject=[BUG%20REPORT]%20${encodeURIComponent(bugCategory)}&body=${encodeURIComponent(
      `Issue Category: ${bugCategory}\n\nDescription:\n${bugDescription}\n\nClient User-Agent:\n${navigator.userAgent}\nTimestamp:\n${new Date().toISOString()}`
    )}`;
    window.open(mailto, '_blank');
    setBugSubmitted(true);
    setTimeout(() => {
      setBugSubmitted(false);
      setShowBugModal(false);
      setBugDescription('');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
            <span className="material-symbols-outlined text-[30px]">support_agent</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {isHindi ? 'सहायता व संपर्क केंद्र' : 'Help & Support Desk'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHindi
                ? 'व्यापारियों के लिए 24/7 सहायता, अक्सर पूछे जाने वाले प्रश्न और समस्या निवारण।'
                : 'Merchant assistance, FAQs, bug reporting, and direct contact channels.'}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-full shrink-0">
          Official Support
        </span>
      </div>

      {/* 2. Direct Contact Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Email Support */}
        <a
          href="mailto:support@brandx.in?subject=BrandX%20Merchant%20Support%20Request"
          className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 transition group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
            <span className="material-symbols-outlined text-[20px]">mail</span>
          </div>
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-blue-300">
              Email Help Desk
            </span>
            <span className="text-[11px] text-slate-400 font-mono">support@brandx.in</span>
          </div>
        </a>

        {/* Response Window Notice */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              Support Desk Response
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Within 24-48 business hours</span>
          </div>
        </div>

        {/* Report a Bug */}
        <button
          onClick={() => setShowBugModal(true)}
          className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 flex items-center gap-3 transition group cursor-pointer text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
            <span className="material-symbols-outlined text-[20px]">bug_report</span>
          </div>
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-purple-300">
              {isHindi ? 'बग रिपोर्ट करें' : 'Report a Bug'}
            </span>
            <span className="text-[11px] text-slate-400">
              {isHindi ? 'तकनीकी समस्या भेजें' : 'Submit technical issue'}
            </span>
          </div>
        </button>
      </div>

      {/* 3. Frequently Asked Questions */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-[18px]">quiz</span>
          <span>{isHindi ? 'अक्सर पूछे जाने वाले प्रश्न (FAQs)' : 'Frequently Asked Questions'}</span>
        </h4>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-950/70 border border-slate-800/80 overflow-hidden transition"
              >
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-bold text-white hover:text-cyan-300 cursor-pointer"
                >
                  <span>{isHindi ? faq.qHindi : faq.q}</span>
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">
                    {isOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50">
                    {isHindi ? faq.aHindi : faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Specialized Policy Inquiries */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">policy</span>
          <span>{isHindi ? 'सुरक्षा, प्राइवेसी व कानूनी सवाल' : 'Security, Privacy & Legal Inquiries'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <strong className="text-white block font-bold">Security Reporting</strong>
            <p className="text-[11px] text-slate-400">Report suspicious account access or potential security bugs.</p>
            <a
              href="mailto:support@brandx.in?subject=[SECURITY%20DISCLOSURE]%20Report"
              className="text-cyan-400 hover:underline inline-block pt-1 text-[11px]"
            >
              Email Security Desk →
            </a>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <strong className="text-white block font-bold">Privacy Inquiries</strong>
            <p className="text-[11px] text-slate-400">Questions about personal data processing and DPDPA compliance.</p>
            {onNavigateToLegal ? (
              <button
                onClick={() => onNavigateToLegal('privacy')}
                className="text-cyan-400 hover:underline inline-block pt-1 text-[11px] cursor-pointer"
              >
                Read Privacy Policy →
              </button>
            ) : (
              <a href="mailto:support@brandx.in?subject=Privacy%20Inquiry" className="text-cyan-400 hover:underline inline-block pt-1 text-[11px]">
                Email Privacy Desk →
              </a>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <strong className="text-white block font-bold">Legal Terms</strong>
            <p className="text-[11px] text-slate-400">Review Terms &amp; Conditions and statutory compliance notices.</p>
            {onNavigateToLegal ? (
              <button
                onClick={() => onNavigateToLegal('terms')}
                className="text-cyan-400 hover:underline inline-block pt-1 text-[11px] cursor-pointer"
              >
                Read Terms &amp; Conditions →
              </button>
            ) : (
              <a href="mailto:support@brandx.in?subject=Legal%20Inquiry" className="text-cyan-400 hover:underline inline-block pt-1 text-[11px]">
                Email Legal Desk →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bug Report Modal */}
      {showBugModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowBugModal(false)}
        >
          <div
            className="bg-[#131B2E] border border-white/20 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scale-in text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-[22px]">bug_report</span>
                <h3 className="font-extrabold text-base text-white">
                  {isHindi ? 'तकनीकी बग रिपोर्ट करें' : 'Report an Issue / Bug'}
                </h3>
              </div>
              <button
                onClick={() => setShowBugModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {bugSubmitted ? (
              <div className="p-6 text-center space-y-2">
                <span className="material-symbols-outlined text-emerald-400 text-[36px]">check_circle</span>
                <h4 className="font-bold text-sm text-white">Report Opened in Email Client!</h4>
                <p className="text-xs text-slate-400">Thank you for helping us improve BrandX.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitBug} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isHindi ? 'समस्या की श्रेणी' : 'Feature / Module Category'}
                  </label>
                  <select
                    value={bugCategory}
                    onChange={(e) => setBugCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="Invoicing / Billing">Invoicing / GST Billing</option>
                    <option value="Customer Khata">Customer Khata Ledger</option>
                    <option value="Digital Dukaan / Store">Digital Dukaan / Store</option>
                    <option value="UPI Standee">UPI Standee Studio</option>
                    <option value="AI Copilot">Biz AI Copilot</option>
                    <option value="Templates / Posters">Poster Editor</option>
                    <option value="Authentication / OTP">Login / Phone OTP</option>
                    <option value="Other">Other Technical Glitch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isHindi ? 'समस्या का विवरण *' : 'Describe What Happened *'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                    placeholder="Explain the step where the error occurred..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    App telemetry and browser user-agent will be automatically attached.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowBugModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                  >
                    {isHindi ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>{isHindi ? 'रिपोर्ट भेजें' : 'Send Report'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
