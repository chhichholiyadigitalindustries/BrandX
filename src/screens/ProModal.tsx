import React, { useState, useEffect } from 'react';
import { APP_IMAGES } from '../data/mockData';
import { ProPlanType, ProSubscriptionInfo } from '../types';
import { subscriptionApi } from '../services/subscriptionApi';
import { isProd } from '../config/env';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProModal: React.FC<ProModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<ProPlanType>('trial');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim'>('gpay');
  const [step, setStep] = useState<'plans' | 'autopay-confirm' | 'success'>('plans');
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiPin, setUpiPin] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('plans');
      setIsProcessing(false);
      setUpiPin('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAutoPay = () => {
    setStep('autopay-confirm');
  };

  const handleAuthorizeAutoPay = async () => {
    setIsProcessing(true);
    try {
      const planCode = selectedPlan === 'yearly' ? 'pro_yearly' : 'pro_monthly';
      // 1. Create order on backend
      const order = await subscriptionApi.checkout(planCode);

      // 2. Check if Razorpay SDK is loaded on window
      if ((window as any).Razorpay && order.keyId && order.keyId !== 'rzp_test_placeholder') {
        const options = {
          key: order.keyId,
          amount: order.amount * 100, // paise
          currency: order.currency || 'INR',
          name: 'BrandX Pro',
          description: `${order.planName} Subscription`,
          order_id: order.orderId,
          prefill: order.prefill || {},
          handler: async (response: any) => {
            try {
              const verifyRes = await subscriptionApi.verifyPayment({
                orderId: response.razorpay_order_id || order.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planCode,
              });

              localStorage.setItem(
                'brandx_pro_status',
                JSON.stringify({
                  isPro: true,
                  plan: selectedPlan,
                  expiresAt: verifyRes.expiryDate,
                  autoPayEnabled: true,
                })
              );

              setIsProcessing(false);
              setStep('success');
              setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
              }, 1600);
            } catch (vErr: any) {
              alert(`Payment verification failed: ${vErr.message}`);
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
            },
          },
          theme: {
            color: '#4f46e5',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }

      // If running in production mode and Razorpay SDK is not loaded, do NOT activate fake Pro
      if (isProd) {
        throw new Error(
          'Payment gateway (Razorpay) is not initialized. Please ensure your internet connection is active, or try again shortly.'
        );
      }

      // In development/test fallback mode only
      const verifyRes = await subscriptionApi.verifyPayment({
        orderId: order.orderId,
        paymentId: `pay_mock_${Date.now()}`,
        signature: `sig_mock_${order.orderId}`,
        planCode,
      });

      localStorage.setItem(
        'brandx_pro_status',
        JSON.stringify({
          isPro: true,
          plan: selectedPlan,
          expiresAt: verifyRes.expiryDate,
          autoPayEnabled: true,
          autoPayApp: selectedUpiApp,
        })
      );

      setIsProcessing(false);
      setStep('success');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      setIsProcessing(false);
      alert(`Subscription error: ${err.message || 'Payment could not be completed'}`);
    }
  };

  const handleRestore = async () => {
    try {
      const sub = await subscriptionApi.getCurrentSubscription();
      if (sub.isPro) {
        localStorage.setItem(
          'brandx_pro_status',
          JSON.stringify({
            isPro: true,
            plan: sub.plan?.code?.includes('year') ? 'yearly' : 'monthly',
            expiresAt: sub.expiryDate,
            autoPayEnabled: true,
          })
        );
        alert('Active BrandX Pro subscription detected and restored!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('No active Pro subscription found for your account.');
      }
    } catch (err: any) {
      alert(`Failed to restore purchase: ${err.message}`);
    }
  };

  const upiApps = [
    { id: 'gpay', name: 'Google Pay', icon: 'payments', color: '#4285F4', bg: 'bg-blue-50 text-blue-700' },
    { id: 'phonepe', name: 'PhonePe', icon: 'account_balance_wallet', color: '#5f259f', bg: 'bg-purple-50 text-purple-700' },
    { id: 'paytm', name: 'Paytm UPI', icon: 'qr_code_2', color: '#002e6e', bg: 'bg-sky-50 text-sky-700' },
    { id: 'bhim', name: 'BHIM UPI', icon: 'verified_user', color: '#005338', bg: 'bg-emerald-50 text-emerald-800' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-md bg-[#faf8ff] rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col animate-scale-in">
        
        {/* Top Action Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[#faf8ff]/90 backdrop-blur-md border-b border-gray-100">
          <button
            onClick={onClose}
            aria-label="Close paywall"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#eaedff] hover:bg-[#dae2fd] active:scale-95 transition-all text-[#131b2e] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 text-white text-xs font-extrabold shadow-sm">
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            <span>BRANDX PRO</span>
          </div>

          <button
            onClick={handleRestore}
            className="text-xs text-blue-600 font-bold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            type="button"
          >
            Restore
          </button>
        </div>

        {/* STEP 1: PLANS SELECTION & VALUE PROPOSITION */}
        {step === 'plans' && (
          <div className="overflow-y-auto px-4 pb-28 pt-2 flex flex-col">
            {/* Hero Showcase with Golden Glow & Crown */}
            <div className="relative flex flex-col items-center text-center mt-2 mb-4">
              <div className="absolute -top-4 w-40 h-40 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>

              <div className="relative flex items-center justify-center w-18 h-18 mb-2 rounded-2xl p-0.5 bg-gradient-to-tr from-blue-600 via-purple-600 to-cyan-400 text-white shadow-lg shadow-blue-500/30 overflow-hidden">
                <img src="/brandx-logo.png" alt="BrandX" className="w-full h-full object-contain rounded-[14px] bg-[#0B0F19]" />
              </div>

              <h2 className="font-display font-extrabold text-2xl text-[#131b2e] tracking-tight mb-0.5">
                Unlock Brand<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">X</span> PRO <span className="inline-block text-[#fea619]">👑</span>
              </h2>
              <p className="text-xs text-[#464555] max-w-xs leading-relaxed font-medium">
                Billing Invoices, UPI QR Standees, HD Posters aur AI Marketing Tools sabhi ek jagah!
              </p>

              {/* Social Proof Pill */}
              <div className="inline-flex items-center gap-2 mt-2.5 px-3 py-1 rounded-full bg-[#e2e7ff] text-[#464555] text-[11px] font-semibold">
                <div className="flex -space-x-1.5">
                  <img className="w-5 h-5 rounded-full object-cover ring-1 ring-white" src={APP_IMAGES.proAvatar1} alt="Customer" />
                  <img className="w-5 h-5 rounded-full object-cover ring-1 ring-white" src={APP_IMAGES.proAvatar2} alt="Customer" />
                  <img className="w-5 h-5 rounded-full object-cover ring-1 ring-white" src={APP_IMAGES.proAvatar3} alt="Customer" />
                </div>
                <span>
                  Joined by <strong className="text-[#131b2e]">50,000+ Businesses</strong> across India
                </span>
              </div>
            </div>

            {/* Feature Value Matrix */}
            <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-gray-100 mb-4">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-[#131b2e]">Everything Included in Pro:</span>
                <span className="px-2 py-0.5 rounded bg-[#6ffbbe] text-[#002113] text-[10px] font-extrabold tracking-wide uppercase">
                  All-Access
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { title: 'Tax Invoice Generator (GST / Non-GST)', sub: 'WhatsApp PDF bill share with 1 click' },
                  { title: 'UPI QR Acrylic Standee Studio', sub: 'Printable counter standees with live QR' },
                  { title: '5,000+ Pro Festival & Daily Sale Posters', sub: 'Customizable Hindi, Hinglish & English' },
                  { title: 'BRANDX AI Slogans & WhatsApp Copy', sub: 'Automatic festive captions & ad text' },
                  { title: 'Remove Watermark & Ultra HD Export', sub: 'Zero pixelation on banners & prints' },
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <div className="w-4.5 h-4.5 rounded-full bg-[#005338]/10 text-[#005338] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#131b2e] leading-tight">{feat.title}</p>
                      <p className="text-[10px] text-[#464555]">{feat.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Plans Section */}
            <div className="flex flex-col gap-2.5 mb-3">
              
              {/* PLAN 1: ₹1 for 7-Day Trial (RECOMMENDED FOR FIRST TIME) */}
              <label
                onClick={() => setSelectedPlan('trial')}
                className={`relative flex flex-col p-3.5 rounded-2xl bg-white shadow-xs cursor-pointer transition-all duration-200 border ${
                  selectedPlan === 'trial'
                    ? 'ring-2 ring-[#3525cd] border-transparent bg-indigo-50/20 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                {/* Top Badge */}
                <div className="absolute -top-2.5 left-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#fea619] to-[#ffddb8] text-[#422200] text-[10px] font-extrabold shadow-xs">
                  <span>⚡ FIRST TIME SPECIAL</span>
                  <span className="bg-white/90 text-[#3525cd] px-1 py-0.2 rounded font-black uppercase">
                    7 Days
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="subscription-plan"
                      checked={selectedPlan === 'trial'}
                      onChange={() => setSelectedPlan('trial')}
                      className="w-4.5 h-4.5 text-[#3525cd] accent-[#3525cd] cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-sm text-[#131b2e]">7-Day Trial Access</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ₹1 Only
                        </span>
                      </div>
                      <p className="text-[10px] text-[#464555] mt-0.5">
                        Pay ₹1 now via UPI AutoPay • Then ₹349/mo (Cancel anytime)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="font-display font-extrabold text-xl text-[#3525cd]">₹1</span>
                    </div>
                    <span className="text-[10px] text-gray-400 line-through">₹349</span>
                  </div>
                </div>
              </label>

              {/* PLAN 2: Monthly Plan (₹349 / month) */}
              <label
                onClick={() => setSelectedPlan('monthly')}
                className={`relative flex flex-col p-3.5 rounded-2xl bg-white shadow-xs cursor-pointer transition-all duration-200 border ${
                  selectedPlan === 'monthly'
                    ? 'ring-2 ring-[#3525cd] border-transparent bg-indigo-50/20 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="subscription-plan"
                      checked={selectedPlan === 'monthly'}
                      onChange={() => setSelectedPlan('monthly')}
                      className="w-4.5 h-4.5 text-[#3525cd] accent-[#3525cd] cursor-pointer"
                    />
                    <div>
                      <span className="font-display font-bold text-sm text-[#131b2e]">Monthly Vyapar Plan</span>
                      <p className="text-[10px] text-[#464555] mt-0.5">Billed monthly • Unlimited invoices &amp; posters</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="font-display font-bold text-lg text-[#131b2e]">₹349</span>
                      <span className="text-[11px] text-[#464555]">/ mo</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Recurring</span>
                  </div>
                </div>
              </label>

              {/* PLAN 3: Yearly Plan (₹2,999 / year) */}
              <label
                onClick={() => setSelectedPlan('yearly')}
                className={`relative flex flex-col p-3.5 rounded-2xl bg-white shadow-xs cursor-pointer transition-all duration-200 border ${
                  selectedPlan === 'yearly'
                    ? 'ring-2 ring-[#3525cd] border-transparent bg-indigo-50/20 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  🎉 BEST VALUE (SAVE ₹1,189)
                </div>

                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="subscription-plan"
                      checked={selectedPlan === 'yearly'}
                      onChange={() => setSelectedPlan('yearly')}
                      className="w-4.5 h-4.5 text-[#3525cd] accent-[#3525cd] cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-sm text-[#131b2e]">Yearly VIP Plan</span>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                          12 Months
                        </span>
                      </div>
                      <p className="text-[10px] text-[#464555] mt-0.5">Effective ₹250/mo • Free Standee delivery</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="font-display font-bold text-lg text-[#3525cd]">₹2,999</span>
                      <span className="text-[11px] text-[#464555]">/ yr</span>
                    </div>
                    <span className="text-[10px] text-gray-400 line-through">₹4,188</span>
                  </div>
                </div>
              </label>
            </div>

            {/* UPI AutoPay Apps Selection Bar */}
            <div className="p-3 bg-white rounded-2xl border border-gray-100 flex flex-col gap-2 mb-3">
              <span className="text-[11px] font-bold text-[#464555] flex items-center justify-between">
                <span>SELECT UPI AUTOPAY APP:</span>
                <span className="text-[10px] text-emerald-700 font-bold">NPCI 100% Secure</span>
              </span>

              <div className="grid grid-cols-4 gap-1.5">
                {upiApps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedUpiApp(app.id as any)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      selectedUpiApp === app.id
                        ? 'border-[#3525cd] bg-indigo-50/50 shadow-xs'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full ${app.bg} flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-[16px]">{app.icon}</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#131b2e] truncate">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#eaedff] text-[10px] text-[#464555] font-medium">
              <span className="flex items-center gap-1 text-[#005338] font-bold">
                <span className="material-symbols-outlined text-[14px]">verified_user</span>
                UPI AutoPay Mandate
              </span>
              <span>Cancel anytime with 1-click</span>
            </div>
          </div>
        )}

        {/* STEP 2: AUTOPAY AUTHORIZATION SCREEN */}
        {step === 'autopay-confirm' && (
          <div className="overflow-y-auto px-4 pb-28 pt-3 flex flex-col gap-4 animate-fade-in">
            <div className="text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[#3525cd] mb-2 shadow-inner">
                <span className="material-symbols-outlined text-[30px]">account_balance_wallet</span>
              </div>
              <h3 className="font-display font-extrabold text-lg text-[#131b2e]">
                Authorize UPI AutoPay Mandate 🔐
              </h3>
              <p className="text-xs text-[#464555] max-w-xs mt-0.5">
                {selectedPlan === 'trial'
                  ? 'Aapke account se ₹1 debit hoga aur 7-day trial shuru hoga.'
                  : selectedPlan === 'monthly'
                  ? 'Aapka ₹199 monthly subscription mandate setup kiya jaa raha hai.'
                  : 'Aapka ₹3,499 yearly VIP subscription mandate setup kiya jaa raha hai.'}
              </p>
            </div>

            {/* Mandate Details Card */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-gray-100 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                <span className="text-[#464555]">Payment App:</span>
                <span className="font-bold text-[#131b2e] capitalize">{selectedUpiApp} UPI</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                <span className="text-[#464555]">Initial Debit Amount:</span>
                <span className="font-bold text-[#3525cd]">
                  {selectedPlan === 'trial' ? '₹1.00 (Trial Charge)' : selectedPlan === 'monthly' ? '₹199.00' : '₹3,499.00'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                <span className="text-[#464555]">Next Auto-Renewal:</span>
                <span className="font-semibold text-gray-700">
                  {selectedPlan === 'trial' ? 'After 7 Days (₹199/mo)' : selectedPlan === 'monthly' ? 'After 30 Days (₹199/mo)' : 'After 365 Days (₹3,499/yr)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#464555]">AutoPay Cancellation:</span>
                <span className="text-emerald-700 font-bold">Anytime in {selectedUpiApp.toUpperCase()} App</span>
              </div>
            </div>

            {/* Virtual UPI Pin Simulation */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-700">
                ENTER 4 or 6 DIGIT UPI PIN (DEMO AUTHORIZATION)
              </label>
              <div className="flex items-center h-12 bg-white rounded-xl border border-slate-300 px-3.5 focus-within:ring-2 focus-within:ring-[#3525cd]">
                <input
                  type="password"
                  maxLength={6}
                  value={upiPin}
                  onChange={(e) => setUpiPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center text-xl tracking-widest font-mono text-[#131b2e] focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 text-center">
                Simulated Sandbox AutoPay • Click Authorize to activate instant Pro
              </span>
            </div>

            <button
              onClick={() => setStep('plans')}
              className="text-xs font-semibold text-[#464555] hover:text-[#3525cd] text-center cursor-pointer"
              type="button"
            >
              ← Change Plan or App
            </button>
          </div>
        )}

        {/* STEP 3: SUCCESS CELEBRATION */}
        {step === 'success' && (
          <div className="p-8 flex flex-col items-center text-center justify-center my-auto animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-200">
              <span className="material-symbols-outlined text-[44px]">verified</span>
            </div>
            <h3 className="font-display font-extrabold text-2xl text-[#131b2e]">
              Pro Subscription Active! 🎉
            </h3>
            <p className="text-xs text-[#464555] mt-1 max-w-xs leading-relaxed">
              {selectedPlan === 'trial'
                ? 'Aapka 7-Day ₹1 Free Trial shuru ho gaya hai. Sabhi Invoices, Standees aur HD Posters unlock ho gaye hain!'
                : 'Aapka BRANDX PRO subscription activate ho gaya hai! Business badhane ke liye shubhkaamnayein.'}
            </p>
            <div className="mt-4 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              AutoPay ID: BX-MANDATE-{Date.now().toString().slice(-6)}
            </div>
          </div>
        )}

        {/* Sticky Bottom CTA Section */}
        {step !== 'success' && (
          <div className="sticky bottom-0 z-20 px-4 pt-3 pb-safe bg-[#faf8ff]/95 backdrop-blur-md border-t border-gray-100 flex flex-col">
            {step === 'plans' ? (
              <button
                onClick={handleStartAutoPay}
                className="w-full h-13 rounded-2xl bg-[#3525cd] hover:bg-[#281ca8] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 text-white font-bold text-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">bolt</span>
                <span>
                  {selectedPlan === 'trial'
                    ? 'Start 7-Day Trial for ₹1 (UPI AutoPay) 🚀'
                    : selectedPlan === 'monthly'
                    ? 'Subscribe Monthly @ ₹199/mo 🚀'
                    : 'Subscribe Yearly @ ₹3,499/yr 🚀'}
                </span>
              </button>
            ) : (
              <button
                onClick={handleAuthorizeAutoPay}
                disabled={isProcessing}
                className="w-full h-13 rounded-2xl bg-[#005338] hover:bg-[#00402b] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-800/25 text-white font-bold text-sm cursor-pointer"
                type="button"
              >
                {isProcessing ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>Authorizing UPI AutoPay Mandate...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">lock_open</span>
                    <span>
                      {selectedPlan === 'trial'
                        ? 'Pay ₹1 & Activate 7-Day Access 🚀'
                        : `Authorize ₹${selectedPlan === 'monthly' ? '199' : '3,499'} AutoPay 🚀`}
                    </span>
                  </>
                )}
              </button>
            )}

            <p className="text-[10px] text-center text-[#464555] mt-2 mb-2 leading-tight">
              {selectedPlan === 'trial'
                ? 'Trial valid for 7 days. Cancel anytime in Google Pay/PhonePe before renewal. No hidden charges.'
                : '100% Encrypted & Authenticated by NPCI UPI AutoPay Guidelines.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

