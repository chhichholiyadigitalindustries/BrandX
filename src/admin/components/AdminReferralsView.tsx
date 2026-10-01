/**
 * BRANDX — Admin Referrals & Rewards View
 * For SUPER_ADMIN and MANAGER roles.
 * Live metrics from PostgreSQL, anti-fraud status tracking, and reward configuration.
 */

import React, { useState, useEffect } from 'react';
import {
  adminReferralService,
  AdminReferralItem,
  AdminReferralConfig,
} from '../services/adminReferralService';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminReferralsView: React.FC = () => {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN' || admin?.role === 'ADMIN';

  const [referrals, setReferrals] = useState<AdminReferralItem[]>([]);
  const [summary, setSummary] = useState({
    totalReferrals: 0,
    successfulReferrals: 0,
    totalCoinsIssued: 0,
  });
  const [config, setConfig] = useState<AdminReferralConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Config edit state
  const [editingConfig, setEditingConfig] = useState(false);
  const [minCoins, setMinCoins] = useState(100);
  const [maxCoins, setMaxCoins] = useState(500);
  const [rewardMode, setRewardMode] = useState('RANDOM');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, cfg] = await Promise.all([
        adminReferralService.listReferrals({
          page,
          limit: 20,
          status: statusFilter,
          search: search.trim() || undefined,
        }),
        isSuperAdmin ? adminReferralService.getConfig() : Promise.resolve(null),
      ]);

      setReferrals(res.referrals);
      setSummary(res.summary);
      setTotalPages(res.pagination.totalPages || 1);

      if (cfg) {
        setConfig(cfg);
        setMinCoins(cfg.minRewardCoins);
        setMaxCoins(cfg.maxRewardCoins);
        setRewardMode(cfg.rewardMode);
      }
    } catch (err: any) {
      console.warn('Error loading admin referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigNotice(null);
    try {
      const updated = await adminReferralService.updateConfig({
        minRewardCoins: Number(minCoins),
        maxRewardCoins: Number(maxCoins),
        rewardMode,
      });
      setConfig(updated);
      setEditingConfig(false);
      setConfigNotice('Referral reward configuration updated successfully.');
      setTimeout(() => setConfigNotice(null), 3000);
    } catch (err: any) {
      setConfigNotice(`Error: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400">group_add</span>
            <span>Refer & Earn Program</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Monitor vyapari referral loops, anti-fraud compliance, and reward payouts.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setEditingConfig(!editingConfig)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span>{editingConfig ? 'Close Config' : 'Configure Rewards'}</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111827] p-5 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Referrals</p>
          <p className="text-2xl font-black text-white mt-1">{summary.totalReferrals.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-gray-400 mt-1">Platform-wide invites</p>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Rewarded Referrals</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {summary.successfulReferrals.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Completed onboarding</p>
        </div>

        <div className="bg-[#111827] p-5 rounded-2xl border border-white/10 shadow-md">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Total Coins Issued</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {summary.totalCoinsIssued.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">≈ ₹{Math.floor(summary.totalCoinsIssued / 100)} INR value</p>
        </div>
      </div>

      {/* Config Panel (Super Admin only) */}
      {editingConfig && isSuperAdmin && (
        <div className="bg-[#111827] p-5 rounded-2xl border border-indigo-500/30 shadow-xl space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">tune</span>
            <span>Referral Reward Engine Configuration</span>
          </h3>

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-gray-300 font-bold mb-1">Minimum Coins</label>
              <input
                type="number"
                min="50"
                max="1000"
                step="50"
                value={minCoins}
                onChange={(e) => setMinCoins(Number(e.target.value))}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-400"
              />
              <span className="text-[10px] text-gray-400">Current default: 100</span>
            </div>

            <div>
              <label className="block text-gray-300 font-bold mb-1">Maximum Coins</label>
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={maxCoins}
                onChange={(e) => setMaxCoins(Number(e.target.value))}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-400"
              />
              <span className="text-[10px] text-gray-400">Current default: 500</span>
            </div>

            <div>
              <label className="block text-gray-300 font-bold mb-1">Reward Mode</label>
              <select
                value={rewardMode}
                onChange={(e) => setRewardMode(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-indigo-400"
              >
                <option value="RANDOM">Random (Within Min-Max)</option>
                <option value="FIXED">Fixed Amount</option>
              </select>
              <span className="text-[10px] text-gray-400">Determined strictly by backend</span>
            </div>

            <div className="sm:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingConfig(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingConfig}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 transition-all shadow"
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          {configNotice && (
            <p className="text-xs text-indigo-300 font-semibold">{configNotice}</p>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2 w-full sm:w-auto">
          {['ALL', 'REGISTERED', 'ELIGIBLE', 'REWARDED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
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
            placeholder="Search code or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400"
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
          <div className="py-16 text-center text-xs text-gray-400">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            No referral records match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Referred User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">{ref.referralCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{ref.referrer?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-gray-400">{ref.referrer?.mobile || ref.referrer?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{ref.referredUser?.name || 'New User'}</p>
                      <p className="text-[10px] text-gray-400">{ref.referredUser?.mobile || ref.referredUser?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          ref.status === 'REWARDED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : ref.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {ref.rewardCoins > 0 ? (
                        <span className="text-emerald-400">+{ref.rewardCoins} Coins</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-[11px]">
                      {new Date(ref.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
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
    </div>
  );
};
