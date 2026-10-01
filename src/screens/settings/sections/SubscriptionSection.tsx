import React, { useState, useEffect } from 'react';
import { subscriptionApi, CurrentSubscriptionDTO } from '../../../services/subscriptionApi';
import { useLanguage } from '../../../context/LanguageContext';

interface SubscriptionSectionProps {
  isPro: boolean;
  onOpenPro: () => void;
  onNavigateToLegal?: (docId: string) => void;
}

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({
  isPro,
  onOpenPro,
  onNavigateToLegal,
}) => {
  const { isHindi } = useLanguage();

  const [subInfo, setSubInfo] = useState<CurrentSubscriptionDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState<boolean>(true);

  // Cancellation state
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchSubData = async () => {
      try {
        const current = await subscriptionApi.getCurrentSubscription();
        setSubInfo(current);
      } catch (e) {
        console.warn('Could not load current subscription:', e);
      } finally {
        setLoading(false);
      }

      try {
        const history = await subscriptionApi.getPayments(1, 10);
        if (Array.isArray(history)) {
          setPayments(history);
        } else if (history && Array.isArray(history.items)) {
          setPayments(history.items);
        }
      } catch (e) {
        console.warn('Could not load payments history:', e);
      } finally {
        setPaymentsLoading(false);
      }
    };

    fetchSubData();
  }, []);

  const handleCancelAutoPay = async () => {
    if (!window.confirm(isHindi ? 'क्या आप निश्चित रूप से अपना प्रो सब्सक्रिप्शन रद्द करना चाहते हैं?' : 'Are you sure you want to cancel your Pro auto-renewal?')) {
      return;
    }

    setCancelling(true);
    setCancelMessage(null);
    try {
      await subscriptionApi.cancelSubscription('Cancelled via Settings UI');
      setCancelMessage({
        type: 'success',
        text: isHindi
          ? 'आपका सब्सक्रिप्शन नवीनीकरण रद्द कर दिया गया है। आप वर्तमान अवधि के अंत तक प्रो सुविधाओं का उपयोग कर सकते हैं।'
          : 'Subscription renewal has been cancelled. You retain Pro access until the end of the paid period.',
      });
      // Refresh current subscription status
      const updated = await subscriptionApi.getCurrentSubscription();
      setSubInfo(updated);
    } catch (err: any) {
      setCancelMessage({
        type: 'error',
        text: err?.message || 'Failed to cancel subscription.',
      });
    } finally {
      setCancelling(false);
    }
  };

  const isCurrentPro = isPro || !!subInfo?.isPro;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
              isCurrentPro
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            <span className="material-symbols-outlined text-[30px]">
              {isCurrentPro ? 'workspace_premium' : 'card_membership'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                {isHindi ? 'सब्सक्रिप्शन व बिलिंग' : 'Subscription & Billing'}
              </h3>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isCurrentPro
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isCurrentPro ? 'PRO VIP' : 'FREE TIER'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isCurrentPro
                ? 'Your business has unlocked full unlimited Pro capabilities.'
                : 'Upgrade to BrandX Pro to unlock unlimited GST invoices & HD posters.'}
            </p>
          </div>
        </div>

        {!isCurrentPro && (
          <button
            onClick={onOpenPro}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-amber-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer shrink-0"
          >
            {isHindi ? 'प्रो अनलॉक करें' : 'Unlock Pro'}
          </button>
        )}
      </div>

      {cancelMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
            cancelMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {cancelMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{cancelMessage.text}</span>
        </div>
      )}

      {/* 2. Current Plan Status Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">verified</span>
          <span>{isHindi ? 'सक्रिय प्लान विवरण' : 'Active Plan Details'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Plan Tier</span>
            <span className="text-sm font-extrabold text-white">
              {isCurrentPro ? (subInfo?.plan?.name || 'BrandX Pro') : 'Free Forever'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Status</span>
            <span className="text-sm font-extrabold text-emerald-400">
              {isCurrentPro ? 'Active' : 'Active (Free)'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Price</span>
            <span className="text-sm font-extrabold text-white">
              {isCurrentPro ? (subInfo?.plan?.price ? `₹${subInfo.plan.price}` : 'Pro Member') : '₹0 / month'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Next Cycle / Expiry</span>
            <span className="text-xs font-semibold text-slate-300">
              {subInfo?.expiryDate
                ? new Date(subInfo.expiryDate).toLocaleDateString()
                : isCurrentPro
                  ? 'Active Term'
                  : 'Lifetime Free'}
            </span>
          </div>
        </div>

        {/* Pro features recap or Upgrade prompt */}
        {isCurrentPro ? (
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
            <span>Pro privileges: Unlimited GST Invoicing, HD Posters, WhatsApp Taqada, Priority AI.</span>
            <button
              onClick={handleCancelAutoPay}
              disabled={cancelling}
              className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer self-start sm:self-auto"
            >
              {cancelling ? 'Processing...' : 'Cancel Auto-Renewal'}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-white block">Ready to accelerate your shop?</span>
              <span className="text-slate-400 text-[11px]">
                Pro Monthly: ₹349/mo • Pro Yearly: ₹2,999/yr (Best Value)
              </span>
            </div>
            <button
              onClick={onOpenPro}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              View Pro Plans
            </button>
          </div>
        )}
      </div>

      {/* 3. Official Plan Comparison & Pricing */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400 text-[18px]">sell</span>
          <span>{isHindi ? 'योजनाएं व मूल्य निर्धारण' : 'Official Pricing & Plans'}</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Monthly Card */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-extrabold text-sm text-white">Pro Monthly</h5>
                <span className="text-xs text-slate-400">Monthly business acceleration</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-white">₹349</span>
                <span className="text-[10px] text-slate-500 block">/ month (all inc.)</span>
              </div>
            </div>

            <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Unlimited GST Invoices &amp; Thermal POS</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Unlimited HD Festival &amp; Marketing Posters</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Automated WhatsApp Taqada Reminders</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Biz AI Copilot High Quota</span>
              </li>
            </ul>
          </div>

          {/* Yearly Card */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-amber-500/40 relative space-y-3">
            <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow">
              Best Value • Save ₹1,189
            </span>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-extrabold text-sm text-white">Pro Yearly</h5>
                <span className="text-xs text-slate-400">Full annual uninterrupted suite</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-amber-300">₹2,999</span>
                <span className="text-[10px] text-slate-500 block">/ year (all inc.)</span>
              </div>
            </div>

            <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80">
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>Everything in Pro Monthly for 365 Days</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>Smart NFC Tabletop Google Review Standee</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>Priority 24/7 Vyapar Support Desk</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>₹249/mo effective annual rate</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Real Billing & Payment History */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-[18px]">receipt</span>
          <span>{isHindi ? 'भुगतान व बिलिंग इतिहास' : 'Billing & Payment History'}</span>
        </h4>

        {paymentsLoading ? (
          <div className="py-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading payment records from backend...</span>
          </div>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Order / Ref ID</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payments.map((p, idx) => (
                  <tr key={p.id || idx}>
                    <td className="py-2.5 font-mono text-[11px] text-slate-400">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-2.5 font-mono text-[11px]">{p.orderId || p.paymentId || 'N/A'}</td>
                    <td className="py-2.5 font-semibold text-white">{p.planCode || p.planName || 'BrandX Pro'}</td>
                    <td className="py-2.5 font-bold">₹{p.amount || 0}</td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        {p.status || 'PAID'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 space-y-1">
            <span className="material-symbols-outlined text-[32px] text-slate-600 block">receipt_long</span>
            <span className="text-xs">No payment records found on your account.</span>
            <p className="text-[10px] text-slate-600">Past subscription receipts will be reflected here.</p>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>Billing is handled by authorized payment providers under BrandX subscription terms.</span>
          {onNavigateToLegal && (
            <button
              onClick={() => onNavigateToLegal('billing-terms')}
              className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer self-start sm:self-auto"
            >
              Subscription, Billing &amp; Refund Policy
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
