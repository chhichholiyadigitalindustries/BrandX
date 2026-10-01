/**
 * BRANDX — Refer & Earn Screen
 * High-conversion referral dashboard with unique codes, instant WhatsApp sharing,
 * real-time statistics from PostgreSQL, and anti-fraud eligibility tracking.
 */

import React, { useState, useEffect } from 'react';
import { referralApi, ReferralStatsResponse, ReferralHistoryItem } from '../services/referralApi';
import { useLanguage } from '../context/LanguageContext';

interface ReferralScreenProps {
  onBack?: () => void;
  onOpenWallet?: () => void;
}

export const ReferralScreen: React.FC<ReferralScreenProps> = ({ onBack, onOpenWallet }) => {
  const { isHindi } = useLanguage();
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [claimInput, setClaimInput] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, historyData] = await Promise.all([
        referralApi.getStats(),
        referralApi.getHistory(1, 15),
      ]);
      setStats(statsData);
      setHistory(historyData.history);
    } catch (err: any) {
      console.warn('Error loading referral data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    if (!stats?.referralLink) return;
    navigator.clipboard.writeText(stats.referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!stats?.referralLink) return;
    const msg = isHindi
      ? `नमस्ते! भारत के व्यापारी ब्रांडएक्स ऐप का उपयोग करके 365 दिन त्योहार पोस्टर्स, GST बिलिंग और डिजिटल खाता चला रहे हैं। मेरे लिंक से जुड़ें और 100-500 ब्रांडएक्स कॉइन्स पाएं:\n\n${stats.referralLink}\n\nरेफरल कोड: ${stats.referralCode}`
      : `Namaste! Indian Vyaparis are using BrandX Super App for GST Billing, Posters & Digital Khata. Sign up with my link and get 100-500 BrandX Coins:\n\n${stats.referralLink}\n\nReferral Code: ${stats.referralCode}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (!stats?.referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BrandX — All-in-One Vyapari Super App',
          text: `Join BrandX with my referral code ${stats.referralCode} and earn free coins!`,
          url: stats.referralLink,
        });
      } catch {
        // Share cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimInput.trim()) return;

    setClaiming(true);
    setClaimMessage(null);
    try {
      await referralApi.claimCode(claimInput.trim().toUpperCase());
      setClaimMessage({
        type: 'success',
        text: isHindi ? 'रेफरल कोड सफलतापूर्वक लिंक हो गया!' : 'Referral code linked successfully!',
      });
      setClaimInput('');
      await loadData();
    } catch (err: any) {
      setClaimMessage({
        type: 'error',
        text: err.message || (isHindi ? 'रेफरल कोड अमान्य है।' : 'Invalid or expired referral code.'),
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-gray-100 pb-24 animate-fade-in font-sans">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-[#0B0F19] to-purple-950 border-b border-white/10 px-4 pt-6 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{isHindi ? 'पीछे जाएं' : 'Back'}</span>
            </button>

            {onOpenWallet && (
              <button
                onClick={onOpenWallet}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                <span>{isHindi ? 'कॉइन वॉलेट' : 'Coin Wallet'}</span>
              </button>
            )}
          </div>

          {/* Hero Content */}
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-extrabold border border-indigo-500/30 mb-3 shadow-inner">
              <span className="text-amber-400">🪙</span>
              <span>{isHindi ? 'रेफर करें और कॉइन्स कमाएं' : 'Refer & Earn BrandX Coins'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {isHindi ? 'व्यापारी मित्रों को जोड़ें, नकद कमाएं' : 'Invite Vyaparis & Earn Real Coins'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
              {isHindi
                ? 'प्रत्येक पात्र रेफरल पर 100 से 500 ब्रांडएक्स कॉइन्स पाएं। (100 कॉइन्स = ₹1)'
                : 'Earn 100–500 BrandX Coins per eligible referral. Direct cash payout to UPI/Bank! (100 Coins = ₹1)'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4 space-y-6">
        {/* Referral Code & Share Card */}
        <div className="bg-[#111827] rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: Code Display */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                {isHindi ? 'आपका अनूठा रेफरल कोड' : 'Your Unique Referral Code'}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/50 border-2 border-indigo-500/40 rounded-2xl px-4 py-3 text-center">
                  <span className="font-mono text-lg sm:text-xl font-black text-amber-400 tracking-wider">
                    {stats?.referralCode || 'BRANDX-......'}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copiedCode ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedCode ? (isHindi ? 'कॉपी हुआ!' : 'Copied!') : isHindi ? 'कॉपी' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <span className="text-emerald-400">✓</span>
                <span>{isHindi ? 'हर दोस्त के जुड़ने पर 100-500 कॉइन्स' : '100–500 Coins on every valid referral'}</span>
              </p>
            </div>

            {/* Right: Sharing Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-sm transition-all shadow-lg shadow-green-600/20 active:scale-95"
              >
                <span className="text-lg">💬</span>
                <span>{isHindi ? 'व्हाट्सएप पर शेयर करें' : 'Share on WhatsApp'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold border border-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copiedLink ? 'check' : 'link'}
                  </span>
                  <span>{copiedLink ? (isHindi ? 'लिंक कॉपी!' : 'Link Copied!') : isHindi ? 'लिंक कॉपी' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold border border-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">share</span>
                  <span>{isHindi ? 'अन्य ऐप्स' : 'Share More'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#111827] p-4 rounded-2xl border border-white/5 shadow-md">
            <p className="text-[11px] font-bold text-gray-400">{isHindi ? 'कुल रेफरल्स' : 'Total Referrals'}</p>
            <p className="text-xl font-extrabold text-white mt-1">
              {loading ? '...' : stats?.stats.totalReferrals || 0}
            </p>
          </div>

          <div className="bg-[#111827] p-4 rounded-2xl border border-white/5 shadow-md">
            <p className="text-[11px] font-bold text-emerald-400">{isHindi ? 'सफल रेफरल्स' : 'Successful'}</p>
            <p className="text-xl font-extrabold text-emerald-400 mt-1">
              {loading ? '...' : stats?.stats.successfulReferrals || 0}
            </p>
          </div>

          <div className="bg-[#111827] p-4 rounded-2xl border border-white/5 shadow-md">
            <p className="text-[11px] font-bold text-amber-400">{isHindi ? 'कमाए कॉइन्स' : 'Coins Earned'}</p>
            <p className="text-xl font-extrabold text-amber-400 mt-1">
              {loading ? '...' : stats?.stats.coinsEarned.toLocaleString('en-IN') || 0}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              ≈ ₹{Math.floor((stats?.stats.coinsEarned || 0) / 100)}
            </p>
          </div>

          <div className="bg-[#111827] p-4 rounded-2xl border border-white/5 shadow-md">
            <p className="text-[11px] font-bold text-indigo-400">{isHindi ? 'पेंडिंग रेफरल्स' : 'Pending'}</p>
            <p className="text-xl font-extrabold text-indigo-300 mt-1">
              {loading ? '...' : stats?.stats.pendingReferrals || 0}
            </p>
          </div>
        </div>

        {/* Claim Referral Code (If invited by another vyapari) */}
        <div className="bg-[#111827]/80 rounded-2xl p-4 border border-white/5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-amber-400 text-[20px]">redeem</span>
            <h2 className="text-xs sm:text-sm font-extrabold text-white">
              {isHindi ? 'क्या आपके पास रेफरल कोड है?' : 'Were you invited by a friend?'}
            </h2>
          </div>
          <form onSubmit={handleClaim} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. BRANDX-AB12CD"
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value.toUpperCase())}
              className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={claiming || !claimInput.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all shrink-0"
            >
              {claiming ? '...' : isHindi ? 'कोड जोड़ें' : 'Claim'}
            </button>
          </form>

          {claimMessage && (
            <p
              className={`text-xs mt-2 font-semibold ${
                claimMessage.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {claimMessage.text}
            </p>
          )}
        </div>

        {/* Referral Terms / Eligibility Notice */}
        <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-200/90 leading-relaxed">
          <p className="font-extrabold text-white mb-1 flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>{isHindi ? 'रेफरल पुरस्कार नियम' : 'Referral Reward Guidelines'}</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-300 text-[11px]">
            <li>
              {isHindi
                ? 'रेफरल रिवॉर्ड केवल तभी मिलता है जब नया उपयोगकर्ता अपना बिज़नेस प्रोफाइल सेटअप पूरा करता है।'
                : 'Reward is credited after the referred user completes the required onboarding/verification steps.'}
            </li>
            <li>
              {isHindi
                ? 'प्रत्येक रेफरल पर बैकएंड द्वारा 100 से 500 कॉइन्स प्रदान किए जाते हैं।'
                : 'Each successful referral yields between 100 and 500 Coins determined securely by the server.'}
            </li>
            <li>
              {isHindi
                ? 'न्यूनतम निकासी ₹100 (10,000 कॉइन्स) है। कॉइन्स सीधे आपके UPI या बैंक खाते में भेजे जा सकते हैं।'
                : 'Minimum withdrawal is ₹100 (10,000 Coins) directly to your UPI ID or Bank Account.'}
            </li>
          </ul>
        </div>

        {/* Referral History */}
        <div className="bg-[#111827] rounded-3xl p-5 border border-white/10 shadow-md">
          <h2 className="text-sm font-extrabold text-white mb-3 flex items-center justify-between">
            <span>{isHindi ? 'आपके रेफरल्स का इतिहास' : 'Referral History'}</span>
            <span className="text-xs font-normal text-gray-400">{history.length} {isHindi ? 'रिकॉर्ड्स' : 'records'}</span>
          </h2>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">{isHindi ? 'लोड हो रहा है...' : 'Loading history...'}</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              <span className="material-symbols-outlined text-3xl mb-1 text-gray-600 block">group_off</span>
              {isHindi ? 'अभी कोई रेफरल नहीं है। अपना लिंक शेयर करें!' : 'No referrals yet. Share your referral link above!'}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {history.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-white">{item.userDisplayName}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'REWARDED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.rewardCoins > 0 && (
                      <p className="text-[11px] font-black text-amber-400 mt-0.5">
                        +{item.rewardCoins} Coins
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
