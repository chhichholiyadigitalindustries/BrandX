/**
 * BRANDX Admin Revenue & Payments Dashboard Screen (/admin/revenue)
 * Executive financial control center: P&L metrics, revenue charts, plan shares, expiring subscriptions, and failed payments.
 */

import React, { useEffect, useState } from 'react';
import { revenueService } from '../services/revenueService';
import { subscriptionService } from '../services/subscriptionService';
import { paymentService } from '../services/paymentService';
import { RevenueSummary, RevenueDateFilter, Subscription, PaymentTransaction } from '../types/payment';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminChart } from '../components/AdminChart';
import { useAdminNavigation } from '../context/AdminNavigationContext';
import { useAdminToast } from '../components/AdminToast';

export const AdminRevenueScreen: React.FC = () => {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [dateFilter, setDateFilter] = useState<RevenueDateFilter>('all_time');
  const [isLoading, setIsLoading] = useState(true);
  const [chartView, setChartView] = useState<'monthly' | 'daily'>('monthly');

  // Expiring soon subscriptions widget state
  const [expiringDays, setExpiringDays] = useState<number>(7);
  const [expiringSubs, setExpiringSubs] = useState<Subscription[]>([]);
  const [recentFailedPayments, setRecentFailedPayments] = useState<PaymentTransaction[]>([]);

  const { navigate } = useAdminNavigation();
  const { showToast } = useAdminToast();

  const loadData = async (filter: RevenueDateFilter) => {
    setIsLoading(true);
    try {
      const res = await revenueService.getRevenueSummary(filter);
      setSummary(res);

      const expiring = await subscriptionService.getSubscribers({ expiringWithinDays: expiringDays });
      setExpiringSubs(expiring);

      const failed = await paymentService.getTransactions({ status: 'failed', limit: 5 });
      setRecentFailedPayments(failed.transactions);
    } catch (e) {
      console.error(e);
      showToast('Error loading revenue data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(dateFilter);
  }, [dateFilter, expiringDays]);

  const handleExportCSV = async () => {
    try {
      const csv = await revenueService.exportRevenueReportCSV(dateFilter);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brandx_revenue_report_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Revenue report exported as CSV 📈', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400 font-semibold">Computing BrandX financial pulse &amp; revenue metrics...</p>
        </div>
      </div>
    );
  }

  const dateFilterButtons: Array<{ id: RevenueDateFilter; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7_days', label: '7 Days' },
    { id: 'last_30_days', label: '30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_year', label: 'This Year' },
    { id: 'all_time', label: 'All Time' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 custom-scrollbar">
          {dateFilterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setDateFilter(btn.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                dateFilter === btn.id
                  ? 'bg-gradient-to-r from-[#005338] to-[#008f62] text-white shadow-md border border-emerald-400/40'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              type="button"
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end shrink-0">
          <button
            onClick={() => navigate('subscribers')}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-200 text-xs font-bold border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-400">loyalty</span>
            <span>View Subscribers</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#005338] to-[#008f62] hover:brightness-110 text-white text-xs font-extrabold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export Revenue CSV</span>
          </button>
        </div>
      </div>

      {/* Row 1: Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Gross Revenue"
          value={`₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`}
          change={summary?.revenueGrowthMoM ? `+${summary.revenueGrowthMoM}%` : undefined}
          isPositive={true}
          icon="currency_rupee"
          color="emerald"
          subtext={`Net: ₹${(summary?.netRevenue || 0).toLocaleString('en-IN')} (after refunds)`}
        />
        <AdminStatCard
          label="Revenue Today"
          value={`₹${(summary?.revenueToday || 0).toLocaleString('en-IN')}`}
          isPositive={true}
          icon="today"
          color="blue"
          subtext={summary?.revenueToday ? 'Collections processed today' : 'No collections today'}
        />
        <AdminStatCard
          label="Active Pro Subscribers"
          value={summary?.activeProSubscribers || 0}
          isPositive={true}
          icon="loyalty"
          color="purple"
          subtext={`${summary?.totalSubscribers || 0} all-time customers`}
        />
        <AdminStatCard
          label="This Month MTD"
          value={`₹${(summary?.revenueThisMonth || 0).toLocaleString('en-IN')}`}
          isPositive={true}
          icon="calendar_month"
          color="amber"
          subtext={`+${summary?.newSubscribersThisMonth || 0} new paid users`}
        />
      </div>

      {/* Row 2: Secondary Metric Cards (Renewals, Cancellations, Failed Payments) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">New Subscriptions</p>
            <p className="text-xl font-black text-white mt-1">+{summary?.newSubscribersThisMonth || 0}</p>
            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">Direct upgrades</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
          </div>
        </div>

        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Renewals This Month</p>
            <p className="text-xl font-black text-white mt-1">{summary?.renewalsThisMonth || 0}</p>
            <p className="text-[10px] text-blue-400 font-semibold mt-0.5">UPI Autopay &amp; Annuals</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">autorenew</span>
          </div>
        </div>

        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cancelled / Expired</p>
            <p className="text-xl font-black text-white mt-1">{summary?.cancelledThisMonth || 0}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Expired subscriptions</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-500/10 text-gray-300 border border-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">cancel</span>
          </div>
        </div>

        <div
          onClick={() => navigate('payments')}
          className="bg-[#0E1424] border border-rose-500/20 hover:border-rose-500/40 rounded-2xl p-4 shadow-lg flex items-center justify-between cursor-pointer transition-all hover:bg-white/5"
        >
          <div>
            <p className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Failed Payments</p>
            <p className="text-xl font-black text-rose-400 mt-1">{summary?.failedPaymentsCount || 0}</p>
            <p className="text-[10px] text-rose-300 font-semibold mt-0.5">Click to view &amp; retry</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">error</span>
          </div>
        </div>
      </div>

      {/* Row 3: Financial P&L Statement Banner */}
      <div className="bg-gradient-to-r from-[#0B0F19] via-[#10182b] to-[#070A12] rounded-3xl p-6 border border-emerald-500/30 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight">Financial P&amp;L Breakdown</h3>
              <p className="text-[11px] text-gray-400">Gross inflows, refunds, and realized net revenue</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Realized Net Margin: {summary?.grossRevenue && summary.grossRevenue > 0 ? Math.round(((summary.grossRevenue - (summary.totalRefunds || 0)) / summary.grossRevenue) * 100) : 100}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 font-medium">Gross Collections</p>
            <p className="text-lg font-black text-white mt-1">₹{(summary?.grossRevenue || 0).toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-gray-400">100% Volume</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 font-medium">Refunds Processed</p>
            <p className="text-lg font-black text-rose-400 mt-1">-₹{(summary?.totalRefunds || 0).toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-rose-300 font-semibold">
              {summary?.grossRevenue && summary.grossRevenue > 0 ? Math.round(((summary.totalRefunds || 0) / summary.grossRevenue) * 100) : 0}% of Gross
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40">
            <p className="text-xs text-emerald-300 font-medium">Net Realized Revenue</p>
            <p className="text-lg font-black text-emerald-400 mt-1">₹{(summary?.netRevenue || 0).toLocaleString('en-IN')}</p>
            <span className="text-[10px] text-emerald-300 font-bold">In Bank Account</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 font-medium">Avg Revenue Per User (ARPU)</p>
            <p className="text-lg font-black text-cyan-300 mt-1">
              ₹{summary?.activeProSubscribers && summary.activeProSubscribers > 0 ? Math.round((summary.netRevenue || 0) / summary.activeProSubscribers).toLocaleString('en-IN') : '0'}
            </p>
            <span className="text-[10px] text-cyan-400 font-semibold">Per Pro Active</span>
          </div>
        </div>
      </div>

      {/* Row 4: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Growth Chart (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-white text-base tracking-tight">Revenue Trend Overview</h3>
                <p className="text-xs text-gray-400">Gross subscription receipts over time (₹ INR)</p>
              </div>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setChartView('monthly')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    chartView === 'monthly' ? 'bg-[#005338] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                  type="button"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setChartView('daily')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    chartView === 'daily' ? 'bg-[#005338] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                  type="button"
                >
                  Daily (Sep)
                </button>
              </div>
            </div>

            {chartView === 'monthly' ? (
              <AdminChart
                title=""
                data={(summary?.monthlyRevenueBreakdown || []).map((m) => ({
                  label: m.month.split(' ')[0],
                  value: m.gross,
                }))}
                type="bar"
                color="#10b981"
                valuePrefix="₹"
              />
            ) : (
              <AdminChart
                title=""
                data={(summary?.dailyRevenueBreakdown || []).map((d) => ({
                  label: d.date.split(' ')[0],
                  value: d.revenue,
                }))}
                type="bar"
                color="#38bdf8"
                valuePrefix="₹"
              />
            )}
          </div>
        </div>

        {/* Plan Distribution Breakdown (1 col) */}
        <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-white text-base tracking-tight">Revenue by Plan</h3>
                <p className="text-xs text-gray-400">Share of paid subscriptions</p>
              </div>
              <button
                onClick={() => navigate('plans')}
                className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                type="button"
              >
                Manage Plans →
              </button>
            </div>

            <div className="space-y-3.5">
              {(summary?.revenueByPlan || []).map((p, idx) => {
                const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899'];
                const barColor = colors[idx % colors.length];
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-200 font-bold">{p.planName}</span>
                      <span className="text-white font-mono font-bold">₹{p.revenue.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{ width: `${p.percentage}%`, backgroundColor: barColor }}
                        className="h-full rounded-full transition-all duration-700"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>{p.count} active subscribers</span>
                      <span>{p.percentage}% share</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-gray-400">Top Payment Gateway:</span>
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Razorpay (68% volume)
            </span>
          </div>
        </div>
      </div>

      {/* Row 5: Widgets Section (Expiring Subscriptions & Failed Payments) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon Widget */}
        <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[20px]">hourglass_top</span>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Subscriptions Expiring Soon</h3>
                  <p className="text-[11px] text-gray-400">Pro users approaching plan renewal date</p>
                </div>
              </div>

              {/* Expiring Filter Tabs */}
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setExpiringDays(d)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      expiringDays === d ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-400 hover:text-white'
                    }`}
                    type="button"
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            {expiringSubs.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                No subscriptions expiring in the next {expiringDays} days.
              </div>
            ) : (
              <div className="space-y-2.5">
                {expiringSubs.slice(0, 4).map((sub) => {
                  const daysLeft = Math.max(
                    0,
                    Math.ceil(
                      (new Date(sub.expiryDate).getTime() - new Date('2026-09-16T00:00:00Z').getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  );
                  return (
                    <div
                      key={sub.id}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between gap-3 border border-white/5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{sub.userName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{sub.businessName}</p>
                        <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          {sub.planName} • ₹{sub.planPrice}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block text-xs font-extrabold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/20">
                          {daysLeft} days left
                        </span>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {sub.autoRenew ? '🔄 Auto-renew on' : 'Manual renew'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('subscribers')}
            className="w-full mt-4 py-2 text-center text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-colors cursor-pointer"
            type="button"
          >
            Open All Subscribers Directory →
          </button>
        </div>

        {/* Failed Payments Widget */}
        <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 text-[20px]">warning</span>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Failed Payments Alert</h3>
                  <p className="text-[11px] text-gray-400">Declined transactions requiring retry or support</p>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                23 Total
              </span>
            </div>

            <div className="space-y-2.5">
              {recentFailedPayments.map((txn) => (
                <div
                  key={txn.id}
                  className="p-3 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 transition-colors border border-rose-500/15 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">{txn.userName}</p>
                      <span className="text-[10px] text-rose-400 font-mono font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                        ₹{txn.amount}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{txn.businessName}</p>
                    <p className="text-[10px] text-rose-300 mt-1 line-clamp-1">
                      ⚠️ {txn.failureReason || 'Declined by bank'}
                    </p>
                  </div>

                  <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                    {txn.date.split('T')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('payments')}
            className="w-full mt-4 py-2 text-center text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
            type="button"
          >
            Review All Transactions &amp; Retries →
          </button>
        </div>
      </div>
    </div>
  );
};
