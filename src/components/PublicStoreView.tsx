import React, { useState, useEffect, useMemo } from 'react';
import { digitalStoreApi, PublicStoreData } from '../services/digitalStoreApi';
import { resolveImageUrl } from '../utils/imageUrl';
import { buildUpiPaymentUri, validateUpiId, normalizeUpiId } from '../utils/upiQr';

interface PublicStoreViewProps {
  slug: string;
}

export const PublicStoreView: React.FC<PublicStoreViewProps> = ({ slug }) => {
  const [store, setStore] = useState<PublicStoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [payAmount, setPayAmount] = useState('500');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    digitalStoreApi
      .getPublicStore(slug)
      .then((res) => {
        if (res.success && res.data) {
          setStore(res.data);
          // Set dynamic SEO title and meta description
          document.title = `${res.data.title} — Official Online Dukaan | BrandX`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute(
              'content',
              res.data.description || `Explore ${res.data.title}'s products, offers & instant UPI payments.`
            );
          }
        } else {
          setError(res.error?.message || 'Store not found or currently offline');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load store');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const categories = useMemo(() => {
    if (!store?.items) return [];
    const set = new Set<string>();
    store.items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [store]);

  const filteredItems = useMemo(() => {
    if (!store?.items) return [];
    return store.items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !(item.description || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [store, searchQuery, selectedCategory]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: store?.title || 'BrandX Store',
        text: `Check out ${store?.title}'s online store on BrandX!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Store link copied to clipboard! 📋');
    }
  };

  const handlePayViaUpi = () => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid payment amount');
      return;
    }
    const cleanUpi = normalizeUpiId(store?.upiId);
    if (!cleanUpi) {
      showToast('Merchant has not configured a UPI ID for payments yet.');
      return;
    }
    const val = validateUpiId(cleanUpi);
    if (!val.isValid) {
      showToast('Merchant UPI ID is invalid.');
      return;
    }
    const upiUrl = buildUpiPaymentUri(cleanUpi, store?.title || 'Store', amount, `Order ${store?.title || ''}`);
    window.location.href = upiUrl;
    showToast('Opening UPI App (GPay / PhonePe / Paytm)... 💳');
  };

  const handleOrderViaWhatsApp = (item: any) => {
    if (!store) return;
    const phone = (store.whatsappNumber || store.phone || '').replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const text = encodeURIComponent(
      `Hello ${store.title}! 🛍️\n\n` +
      `I want to order:\n` +
      `*${item.name}*\n` +
      `💰 Price: ₹${item.price}\n\n` +
      `Store Link: ${window.location.href}\n` +
      `Please let me know availability and delivery details!`
    );
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B13] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-mono tracking-wider animate-pulse">
          Connecting to Digital Dukaan...
        </p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-[#070B13] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
          <span className="material-symbols-outlined text-[40px]">storefront</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Dukaan Currently Offline</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          {error || 'This store is either unpublished by the merchant or does not exist.'}
        </p>
        <a
          href="/"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-all"
        >
          Explore BrandX App
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B13] text-slate-100 pb-16 selection:bg-blue-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl animate-fade-in border border-blue-400/30">
          {toastMessage}
        </div>
      )}

      {/* Main Container max-w-lg for premium app-like mobile experience on any device */}
      <div className="max-w-lg mx-auto bg-[#0B0F19] min-h-screen border-x border-slate-800/80 shadow-2xl relative">
        
        {/* Cover Banner */}
        <div className="relative h-44 w-full bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 overflow-hidden">
          {store.coverImageUrl ? (
            <img
              src={resolveImageUrl(store.coverImageUrl)}
              alt={store.title}
              className="w-full h-full object-cover opacity-75"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-[#0B0F19]">
              <span className="material-symbols-outlined text-6xl text-blue-500/20">storefront</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent" />
        </div>

        {/* Store Profile Header */}
        <div className="px-5 -mt-14 relative space-y-3">
          <div className="flex items-end justify-between">
            {/* Logo */}
            <div className="w-22 h-22 rounded-2xl bg-white p-1.5 shadow-2xl border-2 border-blue-500 overflow-hidden shrink-0">
              <img
                src={resolveImageUrl(store.logoUrl || '/brandx-logo.png')}
                alt={store.title}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            
            {/* Badges */}
            <div className="flex items-center gap-1.5">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Open Now
              </span>
            </div>
          </div>

          {/* Shop Name & Category */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl font-black text-white tracking-tight">{store.title}</h1>
              <span className="material-symbols-outlined text-blue-400 text-[18px]" title="Verified Merchant">
                verified
              </span>
            </div>
            {store.tagline && (
              <p className="text-xs text-blue-300/90 font-medium italic">{store.tagline}</p>
            )}
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-slate-500">location_on</span>
              <span>{store.address ? `${store.address}, ` : ''}{store.city || store.business?.city || 'India'}</span>
            </p>
            {store.businessHours && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-slate-500">schedule</span>
                <span>{store.businessHours}</span>
              </p>
            )}
          </div>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <a
              href={`tel:+91${store.phone}`}
              className="flex flex-col items-center justify-center p-2.5 bg-slate-900/90 hover:bg-slate-800 rounded-2xl border border-slate-800 transition-all text-center group"
            >
              <span className="material-symbols-outlined text-[20px] text-blue-400 group-hover:scale-110 transition-transform">call</span>
              <span className="text-[10px] font-bold text-slate-300 mt-1">Call</span>
            </a>
            <a
              href={`https://api.whatsapp.com/send?phone=91${(store.whatsappNumber || store.phone).replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-900/90 hover:bg-slate-800 rounded-2xl border border-slate-800 transition-all text-center group"
            >
              <span className="text-[18px] group-hover:scale-110 transition-transform">💬</span>
              <span className="text-[10px] font-bold text-slate-300 mt-1">WhatsApp</span>
            </a>
            <a
              href={store.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(`${store.title} ${store.address || ''} ${store.city || ''}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-slate-900/90 hover:bg-slate-800 rounded-2xl border border-slate-800 transition-all text-center group"
            >
              <span className="material-symbols-outlined text-[20px] text-rose-400 group-hover:scale-110 transition-transform">location_on</span>
              <span className="text-[10px] font-bold text-slate-300 mt-1">Map</span>
            </a>
            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center p-2.5 bg-slate-900/90 hover:bg-slate-800 rounded-2xl border border-slate-800 transition-all text-center group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-purple-400 group-hover:scale-110 transition-transform">share</span>
              <span className="text-[10px] font-bold text-slate-300 mt-1">Share</span>
            </button>
          </div>

          {/* Google Review Button (if configured) */}
          {store.googleReviewUrl && (
            <a
              href={store.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <span>⭐</span>
                <span>Rate us on Google</span>
              </div>
              <span className="text-[11px] text-amber-400/80 underline font-normal">Leave a Review &gt;</span>
            </a>
          )}

          {/* Instant UPI Pay Box */}
          {store.upiId && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-slate-900 border border-blue-500/30 space-y-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚡</span> Instant UPI Pay
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{store.upiId}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-400"
                    placeholder="500"
                  />
                </div>
                <button
                  onClick={handlePayViaUpi}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  Pay Now 💳
                </button>
              </div>
              <p className="text-[9px] text-slate-400 text-center pt-0.5">
                Opens supported UPI apps (GPay, PhonePe, Paytm, BHIM) securely
              </p>
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="pt-3 space-y-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search products & services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Categories pills */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedCategory === 'All'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  All ({store.items.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Items Showcase */}
          <div className="pt-2 space-y-2.5 pb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Products &amp; Special Offers
              </h2>
              <span className="text-[10px] text-blue-400 font-semibold">{filteredItems.length} items</span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-slate-600">inventory_2</span>
                <p className="text-xs text-slate-400">No products match your search.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredItems.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex gap-3 items-start hover:border-slate-700 transition-all shadow-sm"
                  >
                    <img
                      src={resolveImageUrl(p.imageUrl || '/brandx-logo.png')}
                      alt={p.name}
                      className="w-20 h-20 object-cover rounded-xl shrink-0 bg-slate-950 border border-slate-800"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="text-xs font-bold text-white leading-tight">{p.name}</h3>
                        {p.isAvailable ? (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            In Stock
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 shrink-0">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            ₹{p.price}
                          </span>
                          {p.originalPrice != null && p.originalPrice > p.price && (
                            <span className="text-[10px] text-slate-500 line-through">
                              ₹{p.originalPrice}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleOrderViaWhatsApp(p)}
                          className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        >
                          <span>Order</span>
                          <span>💬</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Social Links Footer */}
          {store.socialLinks && Object.values(store.socialLinks).some(Boolean) && (
            <div className="pt-2 border-t border-slate-800/80 text-center space-y-2 pb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow Us</span>
              <div className="flex items-center justify-center gap-3">
                {store.socialLinks.instagram && (
                  <a href={store.socialLinks.instagram} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-900 text-pink-400 hover:bg-slate-800">
                    Instagram
                  </a>
                )}
                {store.socialLinks.facebook && (
                  <a href={store.socialLinks.facebook} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-900 text-blue-400 hover:bg-slate-800">
                    Facebook
                  </a>
                )}
                {store.socialLinks.youtube && (
                  <a href={store.socialLinks.youtube} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-900 text-rose-500 hover:bg-slate-800">
                    YouTube
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Powered by BrandX Footer */}
          <div className="text-center pt-4 pb-10 border-t border-slate-800/80 space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              POWERED BY BRANDX
            </p>
            <p className="text-[9px] text-slate-600">
              India's Super App for Retailers &amp; Vyaparis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
