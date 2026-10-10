/**
 * BRANDX INDIA — Official Public Coming Soon Website
 * All-in-One Business Super App for Indian Vyaparis, Retailers & MSMEs.
 */

import React, { useState } from 'react';
import {
  FileText,
  BookOpen,
  Store,
  CreditCard,
  Image as ImageIcon,
  QrCode,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  LogIn,
  Mail,
  Clock,
  ExternalLink,
  ChevronRight,
  X,
  Phone,
  Building2,
  MapPin,
  Tag,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { waitlistApi, WaitlistPayload } from '../services/waitlistApi';
import { LEGAL_DOCUMENTS } from '../data/legalDocuments';

interface ComingSoonScreenProps {
  onOpenApp: () => void;
  initialDocId?: string | null;
}

const BUSINESS_CATEGORIES = [
  'Kirana & General Store',
  'Garments & Fashion Retail',
  'Electronics & Mobile Shop',
  'Hardware & Sanitaryware',
  'Medical & Pharmacy Store',
  'Footwear & Accessories',
  'Food, Sweets & Restaurant',
  'Jewellery & Watches',
  'Auto Parts & Garage',
  'Wholesale & Distribution',
  'Services & Other MSME',
];

export function ComingSoonScreen({ onOpenApp, initialDocId }: ComingSoonScreenProps) {
  // Waitlist form state
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [formData, setFormData] = useState<WaitlistPayload>({
    name: '',
    phone: '',
    email: '',
    businessName: '',
    businessType: 'Kirana & General Store',
    city: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Legal modal state
  const [activeLegalDocId, setActiveLegalDocId] = useState<string | null>(initialDocId || null);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setSubmitError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await waitlistApi.joinWaitlist({
        ...formData,
        phone: cleanPhone,
      });

      if (res.success) {
        setSubmitSuccess(
          res.message ||
            'You are on the VIP Launch Waitlist! We will notify you on WhatsApp as soon as early access opens.'
        );
        setFormData({
          name: '',
          phone: '',
          email: '',
          businessName: '',
          businessType: 'Kirana & General Store',
          city: '',
        });
      } else {
        setSubmitError(res.error || 'Failed to submit registration. Please try again.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error submitting waitlist. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeDoc = activeLegalDocId ? LEGAL_DOCUMENTS[activeLegalDocId] : null;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. TOP STICKY NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#070b14]/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <img
              src="/brandx-logo.png"
              alt="BrandX India Logo"
              className="h-11 w-auto object-contain drop-shadow-md"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                BRANDX <span className="text-blue-500 font-bold text-sm tracking-widest uppercase">INDIA</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                All-in-One Super App for Indian Vyaparis
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">
              Features
            </a>
            <a href="#dukaan" className="hover:text-blue-400 transition-colors">
              Digital Dukaan
            </a>
            <a href="#pricing" className="hover:text-blue-400 transition-colors">
              Plans & Pricing
            </a>
            <a href="#contact" className="hover:text-blue-400 transition-colors">
              Contact
            </a>
            <button
              onClick={() => setActiveLegalDocId('terms')}
              className="hover:text-blue-400 transition-colors cursor-pointer"
            >
              Legal & Policy
            </button>
          </nav>

          {/* Desktop CTA Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => {
                setSubmitSuccess(null);
                setSubmitError(null);
                setIsWaitlistModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              Join VIP Waitlist
            </button>
            <button
              onClick={onOpenApp}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span>Vyapari Login</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenApp}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-bold flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span>Login</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-800/80 text-slate-200 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className="w-full h-0.5 bg-current rounded-full" />
                <span className="w-full h-0.5 bg-current rounded-full" />
                <span className="w-full h-0.5 bg-current rounded-full" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0f1d] border-b border-slate-800 px-4 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Features
            </a>
            <a
              href="#dukaan"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Digital Dukaan
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Plans & Pricing
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-1"
            >
              Support & Contact
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setActiveLegalDocId('terms');
              }}
              className="block w-full text-left text-sm font-medium text-slate-300 hover:text-white py-1 cursor-pointer"
            >
              Legal & Policy
            </button>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsWaitlistModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Join VIP Waitlist
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenApp();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-4 h-4 text-blue-400" />
                <span>Open Super App</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs font-bold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Official Launch 2026 • Bharat's Digital Business Super App</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            BrandX is <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">Coming Soon</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-2xl text-slate-300 max-w-3xl mx-auto font-medium leading-relaxed">
            The all-in-one digital operating system built specifically for Indian shopkeepers, retailers, vyaparis, and MSMEs.
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            GST Invoicing • Thermal POS Bills • Customer Khata • Digital Dukaan • NFC Smart Cards • Daily Marketing Posters • UPI Standee
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                setSubmitSuccess(null);
                setSubmitError(null);
                setIsWaitlistModalOpen(true);
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Join VIP Early Access Waitlist</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onOpenApp}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-5 h-5 text-blue-400" />
              <span>Merchant Login / Open App</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="mt-14 pt-10 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-4xl mx-auto">
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <div className="text-blue-400 font-black text-lg">100% Free</div>
              <div className="text-xs text-slate-400 font-medium">Free Forever Plan with 0 hidden setup charges</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <div className="text-emerald-400 font-black text-lg">0% UPI Fees</div>
              <div className="text-xs text-slate-400 font-medium">Direct merchant settlement to your own bank account</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <div className="text-indigo-400 font-black text-lg">Offline-First</div>
              <div className="text-xs text-slate-400 font-medium">Fast billing even when your store internet is down</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <div className="text-amber-400 font-black text-lg">Made for Bharat</div>
              <div className="text-xs text-slate-400 font-medium">Simple Hindi & English interface tailored for MSMEs</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE IMPLEMENTED FEATURES (8 PILLARS) */}
      <section id="features" className="py-20 bg-[#0a0f1d] border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/60 px-3 py-1 rounded-full border border-blue-900">
              Complete Business Toolkit
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white">
              Everything Your Dukan Needs to Succeed
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Replace fragmented apps with a single, synchronized super app built for everyday operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">GST Invoicing & POS Bills</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate professional GST tax invoices, retail estimates, and delivery challans in seconds. Supports A4 PDF export and 58mm/80mm thermal receipt printing.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-blue-400 flex items-center gap-1">
                <span>HSN codes & tax breakup</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Customer Khata Ledger</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Maintain digital Udhar-Jama bahi-khata. Record Give & Receive with single taps, track customer outstanding balances, and send automated WhatsApp payment reminders with your UPI link.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <span>Free WhatsApp payment alerts</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Digital Dukaan Storefront</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Publish your online product catalog with your unique shop web link. Customers browse your products online and send order requests directly to your WhatsApp without 30% platform cuts.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                <span>0% marketplace commissions</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Smart NFC Visiting Card</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  High-impact contactless digital business card with EMV smart chip aesthetics, Web NFC tap capability, and instant RFC 2426 vCard download so customers save your contact with one tap.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                <span>One-tap contact saving</span>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Daily Marketing Posters</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  365 days of morning suvichar, motivational quotes, and festival banners automatically stamped with your shop name, logo, phone number, and address. Post to WhatsApp Status in 5 seconds.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                <span>Auto-stamped shop branding</span>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">UPI Standee Studio</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate high-resolution printable payment QR standees customized with your store name, logo, and verified UPI ID. Direct bank settlements from PhonePe, GPay, Paytm, and BHIM.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-teal-400 flex items-center gap-1">
                <span>Direct customer-to-merchant UPI</span>
              </div>
            </div>

            {/* Feature 7 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-pink-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">AI Copilot Assistant</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Intelligent merchant assistant powered by Google Gemini. Convert conversational voice notes to bill line items, and generate compelling bilingual promotional captions in Hindi & English.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-pink-400 flex items-center gap-1">
                <span>Voice-to-bill & marketing prompts</span>
              </div>
            </div>

            {/* Feature 8 */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 mb-5 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Cloud Sync & Tenant Isolation</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Secure multi-tenant data architecture backed by managed PostgreSQL and IndexedDB. Your financial ledger, invoice numbers, and customer records remain strictly private and isolated.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-800/70 text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                <span>Strict multi-tenant security</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PLANS & PRICING SECTION (REAL REPOSITORY PLANS) */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-900">
            Simple & Transparent
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black text-white">
            Honest Pricing for Honest Vyaparis
          </h2>
          <p className="mt-3 text-slate-400 text-sm sm:text-base">
            Start completely free. Upgrade to Pro only when your shop expands. No surprise fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {/* Plan 1: Free Forever */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starter</div>
              <h3 className="text-2xl font-black text-white mt-1">Free Forever</h3>
              <p className="text-xs text-slate-400 mt-2">Ideal for new shopkeepers starting their digital journey.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">₹0</span>
                <span className="text-xs text-slate-400">/ forever</span>
              </div>

              <div className="mt-8 space-y-3.5 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>5 GST Invoices / month</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Daily Morning Suvichar poster</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Basic Khata ledger (up to 20 customers)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Standard UPI QR standee maker</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={onOpenApp}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                Get Started Free
              </button>
            </div>
          </div>

          {/* Plan 2: Pro Monthly (Popular) */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-blue-950/70 to-slate-900 border-2 border-blue-500/80 shadow-2xl shadow-blue-600/20 relative flex flex-col justify-between">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Full Business Power</div>
              <h3 className="text-2xl font-black text-white mt-1">Pro Monthly</h3>
              <p className="text-xs text-slate-300 mt-2">Best for growing retail stores, kiranas, and MSMEs.</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">₹349</span>
                <span className="text-xs text-slate-400 line-through">₹499</span>
                <span className="text-xs text-blue-400 font-bold">/ month</span>
              </div>

              <div className="mt-8 space-y-3.5 text-xs text-slate-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-white">Unlimited GST Invoices & Estimates</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>365 Days Festival & Daily Marketing</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>AI Copilot & Voice-to-Bill Assistant</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Digital Dukaan online web catalog</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Remove BrandX watermark from all designs</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Automated WhatsApp payment reminders</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => {
                  setSubmitSuccess(null);
                  setSubmitError(null);
                  setIsWaitlistModalOpen(true);
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer"
              >
                Join VIP Early Access
              </button>
            </div>
          </div>

          {/* Plan 3: Pro Annual */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Maximum Savings</div>
              <h3 className="text-2xl font-black text-white mt-1">Pro Annual</h3>
              <p className="text-xs text-slate-400 mt-2">Save ₹1,189 every year with full year access.</p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">₹2,999</span>
                <span className="text-xs text-slate-400 line-through">₹4,188</span>
                <span className="text-xs text-amber-400 font-bold">/ year (₹250/mo)</span>
              </div>

              <div className="mt-8 space-y-3.5 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>All Pro Monthly features for 365 days</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">Free NFC Digital Smart Card setup</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Priority WhatsApp & Call Support</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Export Excel reports & CA audit summary</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Save ₹1,189 compared to monthly</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => {
                  setSubmitSuccess(null);
                  setSubmitError(null);
                  setIsWaitlistModalOpen(true);
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                Join Annual VIP Waitlist
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VIP WAITLIST INLINE SECTION */}
      <section className="py-20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl mx-auto text-center mb-8">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/80 px-3 py-1 rounded-full border border-blue-900">
                VIP Early Access
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
                Be Among the First Indian Shopkeepers on BrandX
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Enter your mobile number to lock in VIP early access benefits and launch notification via WhatsApp.
              </p>
            </div>

            {submitSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Waitlist Registration Confirmed!</h4>
                <p className="text-xs text-emerald-300">{submitSuccess}</p>
                <button
                  onClick={() => setSubmitSuccess(null)}
                  className="mt-2 text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Register another number
                </button>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-4 max-w-xl mx-auto">
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Mobile Number (WhatsApp) <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center">
                      <span className="px-3 py-2.5 bg-slate-900 border border-r-0 border-slate-800 rounded-l-xl text-xs text-slate-400 font-mono">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                        }
                        className="w-full px-3.5 py-2.5 rounded-r-xl bg-slate-950/80 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Shop / Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kumar General Store"
                      value={formData.businessName || ''}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Business Category
                    </label>
                    <select
                      value={formData.businessType || 'Kirana & General Store'}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition"
                    >
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jaipur, Surat, Delhi, Indore"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Registering...</span>
                  ) : (
                    <>
                      <span>Lock In VIP Early Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 6. GENUINE CONTACT & BUSINESS DETAILS */}
      <section id="contact" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Support Help Desk</div>
              <a
                href="mailto:support@brandx.in"
                className="text-sm font-bold text-white hover:text-blue-400 transition"
              >
                support@brandx.in
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Response Time</div>
              <div className="text-sm font-bold text-white">Within 24–48 Business Hours</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Platform Developer</div>
              <div className="text-sm font-bold text-white">BRANDX Technologies India</div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#050811] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/brandx-logo.png" alt="BrandX Logo" className="h-9 w-auto object-contain" />
              <div>
                <span className="text-base font-black text-white">BrandX India</span>
                <p className="text-[11px] text-slate-400">
                  All-in-One Business Super App for Indian Vyaparis, Retailers & MSMEs.
                </p>
              </div>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-400">
              <button
                onClick={() => setActiveLegalDocId('terms')}
                className="hover:text-blue-400 transition cursor-pointer"
              >
                Terms of Service
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveLegalDocId('privacy')}
                className="hover:text-blue-400 transition cursor-pointer"
              >
                Privacy Policy & Data Safety
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveLegalDocId('refund')}
                className="hover:text-blue-400 transition cursor-pointer"
              >
                Refund & Cancellation
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveLegalDocId('security')}
                className="hover:text-blue-400 transition cursor-pointer"
              >
                Security & Disclosure
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-800/60 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} BRANDX Technologies India / Chhichholiya Digital Industries. All rights reserved.
          </div>
        </div>
      </footer>

      {/* 8. WAITLIST MODAL */}
      {isWaitlistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0c1222] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsWaitlistModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-900">
                VIP Launch Access
              </span>
              <h3 className="text-xl font-black text-white mt-2">Join the BrandX Waitlist</h3>
              <p className="text-xs text-slate-400 mt-1">
                Receive priority access when BrandX opens in your city.
              </p>
            </div>

            {submitSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Waitlist Registration Confirmed!</h4>
                <p className="text-xs text-emerald-300">{submitSuccess}</p>
                <button
                  onClick={() => setIsWaitlistModalOpen(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Mobile Number (WhatsApp) <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-slate-900 border border-r-0 border-slate-800 rounded-l-xl text-xs text-slate-400 font-mono">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      }
                      className="w-full px-3.5 py-2.5 rounded-r-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Shop / Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kumar Store"
                      value={formData.businessName || ''}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Category
                    </label>
                    <select
                      value={formData.businessType || 'Kirana & General Store'}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jaipur, Surat, Delhi"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Registering...' : 'Confirm Waitlist Spot'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 9. LEGAL POLICY VIEWER MODAL */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-[#0c1222] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                  Version {activeDoc.version}
                </span>
                <h3 className="text-lg font-black text-white mt-1">{activeDoc.title}</h3>
                <p className="text-[11px] text-slate-400">Effective: {activeDoc.effectiveDate}</p>
              </div>
              <button
                onClick={() => setActiveLegalDocId(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-6 text-xs text-slate-300 pr-2">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                <span className="font-bold text-white block mb-1">Document Summary:</span>
                {activeDoc.summary}
              </div>

              {activeDoc.sections.map((sec, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-sm font-bold text-white">{sec.heading}</h4>
                  {Array.isArray(sec.body) ? (
                    sec.body.map((p, pIdx) => (
                      <p key={pIdx} className="leading-relaxed text-slate-300">
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="leading-relaxed text-slate-300">{sec.body}</p>
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
                Contact for questions:{' '}
                <a href={`mailto:${activeDoc.contactEmail}`} className="text-blue-400 underline">
                  {activeDoc.contactEmail}
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveLegalDocId(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
