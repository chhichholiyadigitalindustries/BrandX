import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="privacy-policy-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="privacy-policy-modal"
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Google Play Data Safety &amp; Privacy Policy</h2>
              <p className="text-[11px] text-slate-400">BRANDX: Create. Brand. Grow. • Compliant 2026</p>
            </div>
          </div>
          <button
            id="close-privacy-policy-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950">
              <strong className="block text-emerald-900 font-semibold mb-0.5">Private &amp; Isolated Cloud Storage</strong>
              BRANDX stores your business profile, customer khata ledger, invoices, and product catalog securely with tenant database isolation. We never upload or sell your private records to third-party data brokers. You maintain full ownership with secure account controls.
            </div>
          </div>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              1. Information We Collect
            </h3>
            <p className="text-xs text-slate-600">
              When using BRANDX, you provide business details including Shop/Firm Name, Owner Name, Contact Number (for WhatsApp invoice dispatch), GSTIN (optional for tax calculation), and business category. For invoices, recipient name and item line details are entered voluntarily.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-blue-600" />
              2. Android Runtime Permissions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-900 block">Camera Permission</span>
                Used exclusively when you choose to scan physical vendor receipts or take a store photo for marketing posters.
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold text-slate-900 block">Media &amp; Storage</span>
                Used to save festival posters, QR standees, and GST Tax Invoices (PDF/JPG) to your device gallery or documents folder.
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <EyeOff className="w-4 h-4 text-blue-600" />
              3. Payments &amp; UPI Safety
            </h3>
            <p className="text-xs text-slate-600">
              BRANDX generates standard NPCI UPI QR strings (<code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">upi://pay?...</code>). We do NOT store debit/credit card CVVs or bank net-banking passwords. Subscriptions for BRANDX PRO are processed securely via Google Play In-App Billing or verified UPI payment gateways.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">4. Data Deletion &amp; Rights</h3>
            <p className="text-xs text-slate-600">
              Under Google Play Developer policies, you have the right to request full account and invoice record deletion at any time. Simply tap &quot;Clear Local Data&quot; in App Settings or email our support desk.
            </p>
          </section>

          <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-medium text-slate-700">Developer Entity:</span> BRANDX Technologies India
            </div>
            <div>
              <span className="font-medium text-slate-700">Support Email:</span> support@brandx.in
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            id="accept-privacy-policy-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
};
