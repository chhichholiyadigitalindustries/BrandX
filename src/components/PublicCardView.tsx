import React, { useState, useEffect } from 'react';
import { digitalCardApi, PublicCardData } from '../services/digitalCardApi';

interface PublicCardViewProps {
  slug: string;
}

export const PublicCardView: React.FC<PublicCardViewProps> = ({ slug }) => {
  const [card, setCard] = useState<PublicCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    digitalCardApi
      .getPublicCard(slug)
      .then((res) => {
        if (res.success && res.data) {
          setCard(res.data);
          // Set dynamic SEO title and meta
          document.title = `${res.data.fullName} — ${res.data.companyName} | BrandX NFC Card`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute(
              'content',
              res.data.bio || `Official Digital NFC Visiting Card of ${res.data.fullName}, ${res.data.designation || ''} at ${res.data.companyName}.`
            );
          }
        } else {
          setError(res.error?.message || 'Digital Card not found or is unpublished');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load card');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${card?.fullName} — Digital Card`,
        text: `Connect with ${card?.fullName} (${card?.companyName})!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Digital Card link copied to clipboard! 📋');
    }
  };

  const handleDownloadVCard = () => {
    if (!card) return;
    const downloadUrl = digitalCardApi.getVCardDownloadUrl(slug);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `${(card.fullName || 'contact').replace(/\s+/g, '_')}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Contact card (.vcf) downloaded! Tap to save in your phone contacts 📇');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B13] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-mono tracking-wider animate-pulse">
          Reading NFC Digital Visiting Card...
        </p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-[#070B13] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
          <span className="material-symbols-outlined text-[40px]">contactless</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Card Offline or Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          {error || 'This digital visiting card has not been published or the URL is incorrect.'}
        </p>
        <a
          href="/"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-all"
        >
          Explore BrandX App
        </a>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}`;

  return (
    <div className="min-h-screen bg-[#070B13] text-slate-100 pb-16 selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl animate-fade-in border border-indigo-400/30">
          {toastMessage}
        </div>
      )}

      <div className="max-w-md mx-auto min-h-screen p-5 flex flex-col justify-between space-y-6">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <span className="material-symbols-outlined text-[20px]">contactless</span>
            </span>
            <div>
              <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                SMART NFC CARD
              </span>
              <p className="text-[11px] text-slate-400">Verified Business Profile</p>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-all cursor-pointer"
            title="Share Card"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>
        </div>

        {/* 3D Visual Card Box */}
        <div className="relative group cursor-pointer" onClick={() => setCardSide(cardSide === 'front' ? 'back' : 'front')}>
          
          {/* Flip Hint */}
          <div className="absolute -top-3 right-4 z-10 px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-[9px] font-bold text-indigo-300 flex items-center gap-1 shadow">
            <span className="material-symbols-outlined text-[12px]">flip</span>
            <span>Tap to Flip ({cardSide.toUpperCase()})</span>
          </div>

          {cardSide === 'front' ? (
            /* Front Side */
            <div className="relative aspect-[1.75/1] rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-950 p-6 border-2 border-indigo-400/40 shadow-2xl flex flex-col justify-between overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5 max-w-[70%]">
                  <h2 className="text-base font-black text-white leading-tight truncate">{card.companyName}</h2>
                  <p className="text-[11px] text-indigo-200">{card.business?.category || 'Business Super App'}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 p-1 border border-white/20 overflow-hidden shrink-0 shadow-lg">
                  <img
                    src={card.profileImageUrl || card.logoUrl || '/brandx-logo.png'}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="font-extrabold text-base text-white">{card.fullName}</div>
                <div className="text-[11px] text-indigo-300 font-medium">{card.designation || 'Proprietor'}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 pt-1">
                  <span className="material-symbols-outlined text-[14px] text-blue-400">call</span>
                  <span>+91 {card.phone}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[9px] text-indigo-300/90 font-mono">
                <span>BRANDX SMART NFC</span>
                <span className="animate-pulse">TAP TO CONNECT 📡</span>
              </div>
            </div>
          ) : (
            /* Back Side with QR */
            <div className="relative aspect-[1.75/1] rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#020617] p-6 border-2 border-slate-700 shadow-2xl flex items-center justify-between overflow-hidden">
              <div className="space-y-2 max-w-[55%]">
                <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">
                  SCAN TO SAVE CONTACT
                </span>
                <h4 className="text-xs font-bold text-white">Save {card.fullName} in Phonebook</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Includes Phone, WhatsApp, Address, Email &amp; Digital Store link.
                </p>
              </div>

              <div className="bg-white p-2 rounded-2xl shadow-2xl flex flex-col items-center justify-center shrink-0 border-2 border-indigo-500">
                <img
                  src={qrUrl}
                  alt="Contact QR Code"
                  className="w-20 h-20"
                />
                <span className="text-[8px] font-black text-slate-900 mt-1 uppercase">BRANDX NFC</span>
              </div>
            </div>
          )}
        </div>

        {/* Primary Call to Action: Save Contact */}
        <button
          onClick={handleDownloadVCard}
          className="w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-white/10"
        >
          <span className="material-symbols-outlined text-[22px]">person_add</span>
          <span>Save Contact (.vcf)</span>
        </button>

        {/* Contact Details & Quick Links Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-sm">
          
          {/* Bio text if configured */}
          {card.bio && (
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 italic leading-relaxed">
              "{card.bio}"
            </div>
          )}

          <div className="space-y-2 pt-1">
            {/* Phone */}
            <a
              href={`tel:+91${card.phone}`}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/60 transition-all text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <span className="material-symbols-outlined text-[18px]">call</span>
                </span>
                <div>
                  <p className="text-[10px] text-slate-400">Mobile Phone</p>
                  <p className="font-bold text-white">+91 {card.phone}</p>
                </div>
              </div>
              <span className="text-[11px] text-blue-400 font-semibold">Call</span>
            </a>

            {/* WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?phone=91${(card.whatsapp || card.phone).replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/60 transition-all text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[16px]">
                  💬
                </span>
                <div>
                  <p className="text-[10px] text-slate-400">WhatsApp</p>
                  <p className="font-bold text-white">+91 {card.whatsapp || card.phone}</p>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">Chat</span>
            </a>

            {/* Email if available */}
            {card.email && (
              <a
                href={`mailto:${card.email}`}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/60 transition-all text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </span>
                  <div>
                    <p className="text-[10px] text-slate-400">Email Address</p>
                    <p className="font-bold text-white truncate max-w-[200px]">{card.email}</p>
                  </div>
                </div>
                <span className="text-[11px] text-purple-400 font-semibold">Send</span>
              </a>
            )}

            {/* Address */}
            {card.address && (
              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-xs">
                <span className="p-2 bg-rose-500/10 text-rose-400 rounded-xl shrink-0">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                </span>
                <div>
                  <p className="text-[10px] text-slate-400">Address / Location</p>
                  <p className="font-medium text-slate-200 text-[11px]">
                    {card.address}{card.city ? `, ${card.city}` : ''}{card.state ? `, ${card.state}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Link to Official Digital Dukaan if linked */}
          {card.digitalStoreSlug && (
            <a
              href={`/store/${card.digitalStoreSlug}`}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 border border-blue-500/30 text-xs font-bold text-white transition-all hover:border-blue-400 mt-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-xl">
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                </span>
                <div>
                  <p className="text-white font-bold">{card.digitalStoreTitle || 'Visit Online Dukaan'}</p>
                  <p className="text-[10px] text-blue-300/80 font-normal">View catalog, pricing &amp; offers</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-blue-400 text-[18px]">arrow_forward</span>
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-6 space-y-1">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            BRANDX DIGITAL VISITING CARD
          </p>
          <p className="text-[9px] text-slate-600">
            Powered by BrandX Vyapari Platform
          </p>
        </div>
      </div>
    </div>
  );
};
