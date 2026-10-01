/**
 * BRANDX — Admin Withdrawals & Payouts View
 * For SUPER_ADMIN and ACCOUNTANT roles.
 * Payout processing, bank UTR recording, failure coin reversals, and manual coin adjustments.
 */

import React, { useState, useEffect } from 'react';
import {
  adminWithdrawalService,
  AdminWithdrawalItem,
} from '../services/adminWithdrawalService';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminWithdrawalsView: React.FC = () => {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalItem[]>([]);
  const [summary, setSummary] = useState({
    totalRequests: 0,
    totalPendingWithdrawals: 0,
    totalPaidWithdrawals: 0,
    totalFailedWithdrawals: 0,
    totalPaidInr: 0,
    totalPendingInr: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Mark Paid Modal
  const [paidModalItem, setPaidModalItem] = useState<AdminWithdrawalItem | null>(null);
  const [payoutReference, setPayoutReference] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);

  // Mark Failed Modal
  const [failModalItem, setFailModalItem] = useState<AdminWithdrawalItem | null>(null);
  const [failReason, setFailReason] = useState('');
  const [markingFailed, setMarkingFailed] = useState(false);

  // Coin Adjustment Modal (Super Admin only)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState('');
  const [adjustCoins, setAdjustCoins] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustingCoins, setAdjustingCoins] = useState(false);
  const [adjustNotice, setAdjustNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await adminWithdrawalService.listWithdrawals({
        page,
        limit: 20,
        status: statusFilter,
        search: search.trim() || undefined,
      });

      setWithdrawals(res.withdrawals);
      setSummary(res.summary);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      console.warn('Error loading admin withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleProcess = async (id: string) => {
    try {
      await adminWithdrawalService.markProcessing(id);
      await loadData();
    } catch (err: any) {
      alert(`Failed to mark processing: ${err.message}`);
    }
  };

  const handlePaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidModalItem || !payoutReference.trim()) return;

    setMarkingPaid(true);
    try {
      await adminWithdrawalService.markPaid(paidModalItem.id, payoutReference.trim());
      setPaidModalItem(null);
      setPayoutReference('');
      await loadData();
    } catch (err: any) {
      alert(`Failed to mark paid: ${err.message}`);
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleFailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failModalItem || !failReason.trim()) return;

    setMarkingFailed(true);
    try {
      await adminWithdrawalService.markFailed(failModalItem.id, failReason.trim());
      setFailModalItem(null);
      setFailReason('');
      await loadData();
    } catch (err: any) {
      alert(`Failed to reject withdrawal: ${err.message}`);
    } finally {
      setMarkingFailed(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const coins = parseInt(adjustCoins, 10);
    if (!adjustUserId.trim() || isNaN(coins) || !adjustReason.trim()) {
      setAdjustNotice('Please fill all fields: valid user ID, non-zero coins, and reason.');
      return;
    }

    setAdjustingCoins(true);
    setAdjustNotice(null);
    try {
      await adminWithdrawalService.adjustCoins({
        userId: adjustUserId.trim(),
        coins,
        reason: adjustReason.trim(),
      });
      setAdjustNotice('Coins adjusted successfully and logged to ledger.');
      setAdjustUserId('');
      setAdjustCoins('');
      setAdjustReason('');
      setTimeout(() => {
        setIsAdjustModalOpen(false);
        setAdjustNotice(null);
      }, 2000);
      await loadData();
    } catch (err: any) {
      setAdjustNotice(`Error: ${err.message}`);
    } finally {
      setAdjustingCoins(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">payments</span>
            <span>Coin Withdrawals & Payouts</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Process bank and UPI cash payouts, record UTR transaction receipts, and audit coin balances.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Manual Coin Adjustment</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111827] p-5 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pending Payouts</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{summary.totalPendingWithdrawals}</p>
          <p className="text-[11px] text-gray-400 mt-1">₹{summary.totalPendingInr.toLocaleString('en-IN')} pending</p>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completed Payouts</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{summary.totalPaidWithdrawals}</p>
          <p className="text-[11px] text-gray-400 mt-1">₹{summary.totalPaidInr.toLocaleString('en-IN')} total paid</p>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Failed / Reversed</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{summary.totalFailedWithdrawals}</p>
          <p className="text-[11px] text-gray-400 mt-1">Coins refunded</p>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Total Requests</p>
          <p className="text-2xl font-black text-indigo-300 mt-1">{summary.totalRequests}</p>
          <p className="text-[11px] text-gray-400 mt-1">All time</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'PENDING', 'PROCESSING', 'PAID', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-64">
          <input
            type="text"
            placeholder="Search account, user, UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-3xl border border-white/10 shadow-md overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400">Loading withdrawals...</div>
        ) : withdrawals.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            No withdrawal requests match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method & Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payout Ref</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{w.user?.name || 'Vyapari'}</p>
                      <p className="text-[10px] text-gray-400">{w.user?.mobile || w.user?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <p className="font-black text-white text-sm">₹{w.amountInr}</p>
                      <p className="text-[10px] text-gray-400">{w.coins.toLocaleString('en-IN')} Coins</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-indigo-300 block">{w.payoutMethod}</span>
                      <span className="font-mono text-[11px] text-gray-300">{w.payoutAccount}</span>
                      {w.accountHolderName && (
                        <span className="text-[10px] text-gray-400 block font-normal">
                          Name: {w.accountHolderName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          w.status === 'PAID'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : w.status === 'FAILED' || w.status === 'CANCELLED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {w.status}
                      </span>
                      {w.failureReason && (
                        <p className="text-[10px] text-rose-400 mt-1 max-w-xs">{w.failureReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-[11px]">
                      {new Date(w.requestedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {w.payoutReference ? (
                        <span className="text-emerald-400">{w.payoutReference}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {w.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleProcess(w.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-bold text-[11px] border border-blue-500/40"
                          >
                            Process
                          </button>
                          <button
                            onClick={() => setPaidModalItem(w)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-[11px] border border-emerald-500/40"
                          >
                            Pay
                          </button>
                          <button
                            onClick={() => setFailModalItem(w)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-bold text-[11px] border border-rose-500/40"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {w.status === 'PROCESSING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPaidModalItem(w)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => setFailModalItem(w)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-bold text-[11px] border border-rose-500/40"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {w.status === 'PAID' && (
                        <span className="text-[11px] font-bold text-emerald-400">Completed ✓</span>
                      )}
                      {w.status === 'FAILED' && (
                        <span className="text-[11px] font-bold text-rose-400">Coins Returned ↺</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Mark Paid Modal */}
      {paidModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl">
            <h3 className="text-sm font-black text-white mb-2">Mark Withdrawal as Paid</h3>
            <p className="text-xs text-gray-400 mb-4">
              Payout of ₹{paidModalItem.amountInr} to {paidModalItem.payoutAccount} ({paidModalItem.payoutMethod}).
            </p>

            <form onSubmit={handlePaidSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Bank UTR / Transaction Reference ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR20260920AXIS..."
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaidModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={markingPaid || !payoutReference.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  {markingPaid ? 'Saving...' : 'Confirm Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Failed Modal (Reversal) */}
      {failModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl">
            <h3 className="text-sm font-black text-white mb-2 text-rose-400">Reject & Reverse Withdrawal</h3>
            <p className="text-xs text-gray-400 mb-4">
              {failModalItem.coins.toLocaleString('en-IN')} Coins will be automatically credited back to user&apos;s wallet via a WITHDRAWAL_REVERSAL transaction.
            </p>

            <form onSubmit={handleFailSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Failure / Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Bank account number does not match IFSC code"
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFailModalItem(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={markingFailed || !failReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
                >
                  {markingFailed ? 'Reversing...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Coin Adjustment Modal */}
      {isAdjustModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] w-full max-w-md rounded-3xl p-6 border border-amber-500/30 shadow-2xl">
            <h3 className="text-base font-black text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">edit_note</span>
              <span>Manual Coin Adjustment</span>
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Manually credit or debit coins to a user&apos;s wallet. An immutable ADMIN_ADJUSTMENT ledger entry will be recorded.
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  User ID (UUID) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9348dc47-..."
                  value={adjustUserId}
                  onChange={(e) => setAdjustUserId(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Coins Amount (+ for credit, - for debit) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500 or -250"
                  value={adjustCoins}
                  onChange={(e) => setAdjustCoins(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">
                  Mandatory Audit Reason (min 5 chars) <span className="text-amber-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Compensation for promotional campaign issue"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {adjustNotice && (
                <p className="text-xs text-amber-300 font-semibold">{adjustNotice}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustingCoins}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black disabled:opacity-50"
                >
                  {adjustingCoins ? 'Adjusting...' : 'Submit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
