/**
 * BRANDX — Coin Wallet & Cash Payout Screen
 * Real-time PostgreSQL coin ledger, live INR conversion (100 coins = ₹1),
 * strict minimum withdrawal enforcement (10,000 coins / ₹100), and payout tracking.
 */

import React, { useState, useEffect } from 'react';
import {
  walletApi,
  WalletSummaryResponse,
  WalletTransactionItem,
  WithdrawalRecordItem,
} from '../services/walletApi';
import { useLanguage } from '../context/LanguageContext';

interface WalletScreenProps {
  onBack?: () => void;
  onOpenReferrals?: () => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ onBack, onOpenReferrals }) => {
  const { isHindi } = useLanguage();
  const [summary, setSummary] = useState<WalletSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions');

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawCoins, setWithdrawCoins] = useState<string>('10000');
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK_ACCOUNT'>('UPI');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [walletData, txData, withData] = await Promise.all([
        walletApi.getWallet(),
        walletApi.getTransactions(1, 20),
        walletApi.getWithdrawals(1, 20),
      ]);
      setSummary(walletData);
      setTransactions(txData.transactions);
      setWithdrawals(withData.withdrawals);
    } catch (err: any) {
      console.warn('Error loading wallet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWithdrawModal = () => {
    const minCoins = summary?.minWithdrawalCoins || 10000;
    const initialCoins = summary && summary.availableCoins >= minCoins ? summary.availableCoins : minCoins;
    setWithdrawCoins(String(initialCoins));
    setWithdrawError(null);
    setWithdrawSuccess(null);
    setIsWithdrawModalOpen(true);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coins = parseInt(withdrawCoins, 10);
    const minCoins = summary?.minWithdrawalCoins || 10000;

    if (isNaN(coins) || coins < minCoins) {
      setWithdrawError(
        isHindi
          ? `न्यूनतम निकासी ${minCoins.toLocaleString('en-IN')} कॉइन्स (₹${Math.floor(minCoins / 100)}) है।`
          : `Minimum withdrawal is ${minCoins.toLocaleString('en-IN')} Coins (₹${Math.floor(minCoins / 100)}).`
      );
      return;
    }

    if (!summary || summary.availableCoins < coins) {
      setWithdrawError(
        isHindi ? 'वॉलेट में पर्याप्त कॉइन्स उपलब्ध नहीं हैं।' : 'Insufficient available coins in your wallet.'
      );
      return;
    }

    if (!payoutAccount.trim() || payoutAccount.trim().length < 3) {
      setWithdrawError(
        isHindi ? 'कृपया वैध UPI ID या बैंक विवरण दर्ज करें।' : 'Please enter a valid UPI ID or Bank account.'
      );
      return;
    }

    setSubmittingWithdraw(true);
    setWithdrawError(null);
    try {
      await walletApi.requestWithdrawal({
        coins,
        payoutMethod,
        payoutAccount: payoutAccount.trim(),
        accountHolderName: accountHolderName.trim() || undefined,
      });

      setWithdrawSuccess(
        isHindi
          ? `₹${Math.floor(coins / 100)} की निकासी अनुरोध सफलतापूर्वक दर्ज कर लिया गया है!`
          : `Withdrawal request for ₹${Math.floor(coins / 100)} submitted successfully!`
      );
      setPayoutAccount('');
      setAccountHolderName('');
      await loadData();
      setTimeout(() => {
        setIsWithdrawModalOpen(false);
        setWithdrawSuccess(null);
      }, 2500);
    } catch (err: any) {
      setWithdrawError(err.message || 'Withdrawal failed');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-gray-100 pb-24 animate-fade-in font-sans">
      {/* Top Header */}
      <div className="bg-gradient-to-br from-amber-950/40 via-[#0B0F19] to-indigo-950/40 border-b border-white/10 px-4 pt-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>{isHindi ? 'पीछे जाएं' : 'Back'}</span>
            </button>

            {onOpenReferrals && (
              <button
                onClick={onOpenReferrals}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">group_add</span>
                <span>{isHindi ? 'रेफर करें और कमाएं' : 'Refer & Earn'}</span>
              </button>
            )}
          </div>

          <div className="text-center max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold border border-amber-500/30 mb-3">
              <span>🪙</span>
              <span>{isHindi ? 'ब्रांडएक्स कॉइन वॉलेट' : 'BrandX Coin Wallet'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1">
              {isHindi ? 'डिजिटल कॉइन्स और नकद निकासी' : 'My Coins & Cash Balance'}
            </h1>
            <p className="text-xs text-gray-400">
              100 Coins = ₹1 • {isHindi ? 'न्यूनतम निकासी: 10,000 कॉइन्स (₹100)' : 'Min Withdrawal: 10,000 Coins (₹100)'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4 space-y-6">
        {/* Wallet Balance Hero Card */}
        <div className="bg-[#111827] rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                {isHindi ? 'उपलब्ध बैलेंस' : 'Available Balance'}
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-amber-400">
                  {loading ? '...' : (summary?.availableCoins || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-bold text-gray-400">Coins</span>
              </div>
              <div className="inline-block mt-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-extrabold">
                ≈ ₹{loading ? '0' : summary?.equivalentInr.toLocaleString('en-IN') || 0} INR
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleOpenWithdrawModal}
                disabled={loading || !summary?.canWithdraw}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                  summary?.canWithdraw
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-95 cursor-pointer'
                    : 'bg-white/10 text-gray-400 cursor-not-allowed border border-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">payments</span>
                <span>{isHindi ? 'कॉइन्स निकालें (Withdraw)' : 'Withdraw Cash'}</span>
              </button>

              {!summary?.canWithdraw && (
                <p className="text-[11px] text-gray-400 text-center">
                  {isHindi
                    ? '⚠️ निकासी के लिए कम से कम 10,000 कॉइन्स (₹100) आवश्यक हैं।'
                    : '⚠️ Minimum 10,000 Coins (₹100) needed to withdraw.'}
                </p>
              )}
            </div>
          </div>

          {/* Secondary stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10 text-center">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{isHindi ? 'पेंडिंग कॉइन्स' : 'Pending'}</p>
              <p className="text-sm sm:text-base font-extrabold text-indigo-300 mt-0.5">
                {(summary?.pendingCoins || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{isHindi ? 'कुल कमाई' : 'Total Earned'}</p>
              <p className="text-sm sm:text-base font-extrabold text-amber-400 mt-0.5">
                {(summary?.totalEarnedCoins || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[9px] text-gray-400">≈ ₹{summary?.totalEarnedInr || 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{isHindi ? 'कुल निकासी' : 'Total Withdrawn'}</p>
              <p className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5">
                ₹{(summary?.totalWithdrawnInr || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle: Transactions vs Withdrawals */}
        <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/10 max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'transactions'
                ? 'bg-white/15 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isHindi ? 'लेन-देन लेजर (Ledger)' : 'Transaction History'}
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === 'withdrawals'
                ? 'bg-white/15 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isHindi ? 'निकासी अनुरोध (Withdrawals)' : 'Withdrawal Requests'}
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'transactions' ? (
          <div className="bg-[#111827] rounded-3xl p-5 border border-white/10 shadow-md">
            <h2 className="text-sm font-extrabold text-white mb-3">
              {isHindi ? 'वॉलेट ट्रांज़ैक्शन लेजर' : 'Wallet Transaction Ledger'}
            </h2>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">{isHindi ? 'लोड हो रहा है...' : 'Loading transactions...'}</div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                <span className="material-symbols-outlined text-3xl mb-1 text-gray-600 block">receipt_long</span>
                {isHindi ? 'कोई ट्रांज़ैक्शन रिकॉर्ड नहीं मिला।' : 'No transaction ledger records found.'}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-white">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                        <span>
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                          {tx.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-black ${
                          tx.coins > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.coins > 0 ? `+${tx.coins.toLocaleString('en-IN')}` : tx.coins.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {isHindi ? 'शेष' : 'Bal'}: {tx.balanceAfter.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#111827] rounded-3xl p-5 border border-white/10 shadow-md">
            <h2 className="text-sm font-extrabold text-white mb-3">
              {isHindi ? 'निकासी स्थिति' : 'Withdrawal Status & History'}
            </h2>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">{isHindi ? 'लोड हो रहा है...' : 'Loading withdrawals...'}</div>
            ) : withdrawals.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                <span className="material-symbols-outlined text-3xl mb-1 text-gray-600 block">account_balance</span>
                {isHindi ? 'अभी कोई निकासी अनुरोध नहीं किया गया है।' : 'No withdrawal requests submitted yet.'}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {withdrawals.map((w) => (
                  <div key={w.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">₹{w.amountInr}</span>
                        <span className="text-[10px] text-gray-400">
                          ({w.coins.toLocaleString('en-IN')} Coins)
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-300 mt-0.5 font-mono">
                        {w.payoutMethod}: {w.payoutAccount}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(w.requestedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {w.payoutReference && (
                        <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          Ref: {w.payoutReference}
                        </p>
                      )}
                      {w.failureReason && (
                        <p className="text-[10px] text-rose-400 mt-0.5">
                          Reason: {w.failureReason}
                        </p>
                      )}
                    </div>
                    <div>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          w.status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : w.status === 'FAILED' || w.status === 'CANCELLED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">payments</span>
                <span>{isHindi ? 'नकद निकासी अनुरोध' : 'Withdrawal Request'}</span>
              </h3>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
              {/* Coin Amount Input */}
              <div>
                <label className="block text-gray-300 font-bold mb-1.5">
                  {isHindi ? 'निकासी कॉइन्स (Coins to Withdraw)' : 'Coins to Withdraw'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10000"
                    step="100"
                    max={summary?.availableCoins || 10000}
                    value={withdrawCoins}
                    onChange={(e) => setWithdrawCoins(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 font-mono text-sm font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-emerald-400 font-bold">
                    ≈ ₹{Math.floor((parseInt(withdrawCoins, 10) || 0) / 100)}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {isHindi ? 'न्यूनतम: 10,000 कॉइन्स (₹100)' : 'Min: 10,000 Coins (₹100)'} • {isHindi ? 'उपलब्ध' : 'Available'}: {(summary?.availableCoins || 0).toLocaleString('en-IN')}
                </p>
              </div>

              {/* Method Selector */}
              <div>
                <label className="block text-gray-300 font-bold mb-1.5">
                  {isHindi ? 'भुगतान विधि चुनें' : 'Payout Method'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('UPI')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      payoutMethod === 'UPI'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>⚡</span>
                    <span>UPI ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_ACCOUNT')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      payoutMethod === 'BANK_ACCOUNT'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🏦</span>
                    <span>{isHindi ? 'बैंक खाता' : 'Bank Account'}</span>
                  </button>
                </div>
              </div>

              {/* Account Input */}
              <div>
                <label className="block text-gray-300 font-bold mb-1.5">
                  {payoutMethod === 'UPI' ? 'UPI ID (e.g. mobile@upi)' : (isHindi ? 'खाता संख्या और IFSC' : 'A/C Number & IFSC')}
                </label>
                <input
                  type="text"
                  placeholder={payoutMethod === 'UPI' ? 'e.g. vyapari@okhdfcbank' : 'A/C 50100XXXX, IFSC HDFC0001234'}
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-gray-300 font-bold mb-1.5">
                  {isHindi ? 'खाताधारक का नाम (वैकल्पिक)' : 'Account Holder Name (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Kirana Store"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {withdrawError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold">
                  {withdrawError}
                </div>
              )}

              {withdrawSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  {withdrawSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingWithdraw}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              >
                {submittingWithdraw ? (isHindi ? 'अनुरोध भेजा जा रहा है...' : 'Processing Request...') : (isHindi ? 'निकासी अनुरोध भेजें' : 'Confirm Withdrawal')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
