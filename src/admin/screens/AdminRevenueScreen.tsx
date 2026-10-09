/**
 * BRANDX Admin Subscription Revenue & Financial Dashboard Screen (/admin/revenue)
 * Enterprise Financial Control Center:
 * - Module 1: Comprehensive Revenue & Subscriber KPI Metrics (Real DB Records Only)
 * - Module 2: Searchable, Filterable, Paginated Complete Subscription Records with CSV Export
 * - Module 3: Plan Revenue Accuracy (Free, Pro Monthly, Pro Annual, Business, Trial)
 * - Module 4: Deep Subscription Detail View (Profile, History, Payment Attempts, Refunds, Audit)
 * - Module 6: Role-Aware CMO Masking & RBAC Permissions
 */

import React, { useEffect, useState } from 'react';
import { revenueService } from '../services/revenueService';
import { subscriptionService } from '../services/subscriptionService';
import { RevenueSummary, RevenueDateFilter, Subscription, SubscriptionStatus } from '../types/payment';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminChart } from '../components/AdminChart';
import { useAdminNavigation } from '../context/AdminNavigationContext';
import { useAdminToast } from '../components/AdminToast';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminRevenueScreen: React.FC = () => {
  const { admin } = useAdminAuth();
  const role = (admin?.role || '').toUpperCase();
  const isCmo = role === 'CMO';

  // Module 1 Revenue Summary State
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [dateFilter, setDateFilter] = useState<RevenueDateFilter>('all_time');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [chartView, setChartView] = useState<'trend' | 'monthly' | 'daily'>('trend');

  // Module 2 Subscription Records Table State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalSubscriptions, setTotalSubscriptions] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [tableDateRange, setTableDateRange] = useState<string>('all_time');
  const [tableCustomStart, setTableCustomStart] = useState<string>('');
  const [tableCustomEnd, setTableCustomEnd] = useState<string>('');
  const [tablePlanFilter, setTablePlanFilter] = useState<string>('all');
  const [tableBillingCycle, setTableBillingCycle] = useState<string>('all');
  const [tablePaymentStatus, setTablePaymentStatus] = useState<string>('all');
  const [tableSubscriptionStatus, setTableSubscriptionStatus] = useState<string>('all');
  const [isLoadingTable, setIsLoadingTable] = useState<boolean>(false);
  const [isExportingCSV, setIsExportingCSV] = useState<boolean>(false);

  // Module 4 Subscription Detail Modal State
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [subDetail, setSubDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  const { navigate } = useAdminNavigation();
  const { showToast } = useAdminToast();

  // Load Module 1 KPI Metrics
  const loadRevenueSummary = async (filter: RevenueDateFilter, start?: string, end?: string) => {
    setIsLoadingSummary(true);
    try {
      const res = await revenueService.getRevenueSummary(filter, start, end);
      setSummary(res);
    } catch (e) {
      console.error(e);
      showToast('Error loading revenue metrics', 'error');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Load Module 2 Subscription Records Table
  const loadSubscriptions = async () => {
    setIsLoadingTable(true);
    try {
      const res = await subscriptionService.getSubscribersAdvanced({
        search: search.trim() || undefined,
        dateRange: tableDateRange !== 'all_time' ? tableDateRange : undefined,
        startDate: tableDateRange === 'custom' ? tableCustomStart || undefined : undefined,
        endDate: tableDateRange === 'custom' ? tableCustomEnd || undefined : undefined,
        plan: tablePlanFilter !== 'all' ? tablePlanFilter : undefined,
        billingCycle: tableBillingCycle !== 'all' ? tableBillingCycle : undefined,
        paymentStatus: tablePaymentStatus !== 'all' ? tablePaymentStatus : undefined,
        subscriptionStatus: tableSubscriptionStatus !== 'all' ? tableSubscriptionStatus : undefined,
        page,
        limit,
      });

      setSubscriptions(res.subscriptions);
      setTotalSubscriptions(res.total);
      setTotalPages(res.totalPages || Math.ceil(res.total / limit) || 1);
    } catch (e) {
      console.error(e);
      showToast('Error loading subscription records', 'error');
    } finally {
      setIsLoadingTable(false);
    }
  };

  // Initial Load & Triggers
  useEffect(() => {
    loadRevenueSummary(
      dateFilter,
      dateFilter === 'custom' ? customStartDate : undefined,
      dateFilter === 'custom' ? customEndDate : undefined
    );
  }, [dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    loadSubscriptions();
  }, [
    page,
    limit,
    search,
    tableDateRange,
    tableCustomStart,
    tableCustomEnd,
    tablePlanFilter,
    tableBillingCycle,
    tablePaymentStatus,
    tableSubscriptionStatus,
  ]);

  // Open Module 4 Detail Modal
  const handleOpenDetail = async (id: string) => {
    setSelectedSubId(id);
    setIsLoadingDetail(true);
    try {
      const detail = await subscriptionService.getSubscriptionDetail(id);
      setSubDetail(detail);
    } catch (e) {
      showToast('Error loading subscription details', 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Export Filtered Records to CSV
  const handleExportFilteredCSV = async () => {
    setIsExportingCSV(true);
    try {
      const csv = await subscriptionService.exportSubscriptionsCSV({
        search: search.trim() || undefined,
        dateRange: tableDateRange !== 'all_time' ? tableDateRange : undefined,
        startDate: tableDateRange === 'custom' ? tableCustomStart || undefined : undefined,
        endDate: tableDateRange === 'custom' ? tableCustomEnd || undefined : undefined,
        plan: tablePlanFilter !== 'all' ? tablePlanFilter : undefined,
        billingCycle: tableBillingCycle !== 'all' ? tableBillingCycle : undefined,
        paymentStatus: tablePaymentStatus !== 'all' ? tablePaymentStatus : undefined,
        subscriptionStatus: tableSubscriptionStatus !== 'all' ? tableSubscriptionStatus : undefined,
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `brandx_subscriptions_${tableDateRange}_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Subscription records exported as CSV 📄', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    } finally {
      setIsExportingCSV(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus | string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Active
          </span>
        );
      case 'trial':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Free Trial
          </span>
        );
      case 'past_due':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Past Due
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-500/20 text-gray-400 border border-gray-500/30">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/10 text-gray-300">
            {status}
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS' || s === 'CAPTURED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Success
        </span>
      );
    }
    if (s === 'PENDING' || s === 'CREATED' || s === 'AUTHORIZED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Pending
        </span>
      );
    }
    if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          Failed
        </span>
      );
    }
    if (s === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
          Refunded
        </span>
      );
    }
    return <span className="text-[10px] text-gray-400 font-mono">{status || 'N/A'}</span>;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Executive Controls */}
      <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#005338] to-[#008f62] flex items-center justify-center text-white font-black shadow-md border border-white/20">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                Subscription &amp; Revenue Center
                {isCmo && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    CMO Analytics View (Secrets Masked)
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                Verified database billing transactions, realized collections, and subscriber retention
              </p>
            </div>
          </div>
        </div>

        {/* Date Filters & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Quick Date Range Pills */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto custom-scrollbar">
            {[
              { id: 'today', label: 'Today' },
              { id: 'last_7_days', label: '7D' },
              { id: 'last_30_days', label: '30D' },
              { id: 'this_month', label: 'This Month' },
              { id: 'this_year', label: 'This Year' },
              { id: 'all_time', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setDateFilter(b.id as any);
                  if (b.id === 'custom') setShowCustomDatePicker(true);
                  else setShowCustomDatePicker(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  dateFilter === b.id
                    ? 'bg-gradient-to-r from-[#005338] to-[#008f62] text-white shadow-md border border-emerald-400/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                type="button"
              >
                {b.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleExportFilteredCSV()}
            disabled={isExportingCSV}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#005338] to-[#008f62] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isExportingCSV ? 'sync' : 'download'}
            </span>
            <span>{isExportingCSV ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Popover */}
      {showCustomDatePicker && dateFilter === 'custom' && (
        <div className="bg-[#10182b] border border-emerald-500/30 rounded-2xl p-4 flex flex-wrap items-center gap-3 text-xs animate-fade-in shadow-xl">
          <span className="text-gray-300 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">date_range</span>
            Select Custom Range:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-[11px]">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-[11px]">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <button
            onClick={() => loadRevenueSummary('custom', customStartDate, customEndDate)}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            type="button"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* MODULE 1: ROW 1 — Primary Financial Inflows */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Gross Collections"
          value={`₹${(summary?.grossRevenue ?? summary?.totalRevenue ?? 0).toLocaleString('en-IN')}`}
          change={summary?.revenueGrowthMoM ? `+${summary.revenueGrowthMoM}% MoM` : undefined}
          isPositive={true}
          icon="currency_rupee"
          color="emerald"
          subtext={`Realized Net: ₹${(summary?.netRevenue ?? 0).toLocaleString('en-IN')}`}
        />
        <AdminStatCard
          label="Revenue Today"
          value={`₹${(summary?.revenueToday ?? 0).toLocaleString('en-IN')}`}
          isPositive={true}
          icon="today"
          color="blue"
          subtext={summary?.revenueToday ? 'Processed in DB today' : 'No collections today'}
        />
        <AdminStatCard
          label="Revenue This Month (MTD)"
          value={`₹${(summary?.revenueThisMonth ?? 0).toLocaleString('en-IN')}`}
          isPositive={true}
          icon="calendar_month"
          color="purple"
          subtext={`+${summary?.newSubscribersThisMonth ?? 0} new paid users`}
        />
        <AdminStatCard
          label="Revenue This Year (YTD)"
          value={`₹${(summary?.revenueThisYear ?? 0).toLocaleString('en-IN')}`}
          isPositive={true}
          icon="event_note"
          color="amber"
          subtext={`${summary?.successfulPaymentsCount ?? 0} successful payments`}
        />
      </div>

      {/* MODULE 1: ROW 2 — Subscriber Base & Segregation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Active Paid Subscribers */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Paid Users</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {summary?.activePaidSubscribers ?? 0}
            </p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Verified active entitlements</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
        </div>

        {/* Monthly vs Yearly Breakdown */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Monthly / Yearly</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-white">{summary?.activeMonthlySubscribers ?? 0}</span>
              <span className="text-xs text-gray-400">/</span>
              <span className="text-xl font-black text-cyan-300">{summary?.activeYearlySubscribers ?? 0}</span>
            </div>
            <p className="text-[10px] text-cyan-300 font-semibold mt-0.5">
              ₹349/mo vs ₹2,999/yr
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">pie_chart</span>
          </div>
        </div>

        {/* Active Trial Users */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Trial Users</p>
            <p className="text-2xl font-black text-blue-400 mt-1">
              {summary?.activeTrialUsers ?? 0}
            </p>
            <p className="text-[10px] text-blue-300 font-semibold mt-0.5">Zero revenue until paid</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
          </div>
        </div>

        {/* Total Successful Payments */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Successful Payments</p>
            <p className="text-2xl font-black text-white mt-1">
              {summary?.successfulPaymentsCount ?? 0}
            </p>
            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">Captured gateway txns</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 text-emerald-400 border border-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          </div>
        </div>
      </div>

      {/* MODULE 1: ROW 3 — Churn, Expirations, Pending, Failed & Refunds */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {/* Expired */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-3.5 shadow-md">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expired Subscriptions</p>
          <p className="text-lg font-black text-gray-300 mt-1">{summary?.expiredSubscriptionsCount ?? 0}</p>
          <span className="text-[10px] text-gray-500">Lapsed without renewal</span>
        </div>

        {/* Cancelled */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-3.5 shadow-md">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cancelled Subscriptions</p>
          <p className="text-lg font-black text-rose-300 mt-1">{summary?.cancelledSubscriptionsCount ?? 0}</p>
          <span className="text-[10px] text-rose-400">Voluntary cancel/admin</span>
        </div>

        {/* Pending Payments */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-3.5 shadow-md">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Payments</p>
          <p className="text-lg font-black text-amber-300 mt-1">{summary?.pendingPaymentsCount ?? 0}</p>
          <span className="text-[10px] text-amber-400">Excluded from revenue</span>
        </div>

        {/* Failed Payments */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-3.5 shadow-md">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Failed Payments</p>
          <p className="text-lg font-black text-rose-400 mt-1">{summary?.failedPaymentsCount ?? 0}</p>
          <span className="text-[10px] text-rose-300">Declined/aborted checkout</span>
        </div>

        {/* Refunds */}
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-3.5 shadow-md">
          <p className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Refunds Issued</p>
          <p className="text-lg font-black text-purple-400 mt-1">
            -₹{(summary?.totalRefunds ?? 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-purple-300">Deducted from net total</span>
        </div>
      </div>

      {/* MODULE 1: Financial Realization P&L Banner */}
      <div className="bg-gradient-to-r from-[#0B0F19] via-[#10182b] to-[#070A12] rounded-3xl p-6 border border-emerald-500/30 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight">Verified Financial P&amp;L Breakdown</h3>
              <p className="text-[11px] text-gray-400">
                Gross verified inflows minus recognized refunds equals realized net revenue
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Realized Net Realization: {summary?.grossRevenue && summary.grossRevenue > 0
              ? Math.max(0, Math.round(((summary.grossRevenue - (summary.totalRefunds || 0)) / summary.grossRevenue) * 100))
              : 100}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 font-medium">Gross Collections</p>
            <p className="text-lg font-black text-white mt-1">
              ₹{(summary?.grossRevenue ?? summary?.totalRevenue ?? 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-gray-400">100% Volume</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 font-medium">Refunds Processed</p>
            <p className="text-lg font-black text-rose-400 mt-1">
              -₹{(summary?.totalRefunds ?? 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-rose-300 font-semibold">
              {summary?.grossRevenue && summary.grossRevenue > 0
                ? Math.round(((summary.totalRefunds || 0) / summary.grossRevenue) * 100)
                : 0}% of Gross
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40">
            <p className="text-xs text-emerald-300 font-medium">Net Realized Collections</p>
            <p className="text-lg font-black text-emerald-400 mt-1">
              ₹{(summary?.netRevenue ?? 0).toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] text-emerald-300 font-bold">Realized In Bank</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <p className="text-xs text-gray-400 font-medium">Avg Revenue Per Paid User (ARPU)</p>
            <p className="text-lg font-black text-cyan-300 mt-1">
              ₹{summary?.activePaidSubscribers && summary.activePaidSubscribers > 0
                ? Math.round((summary.netRevenue || 0) / summary.activePaidSubscribers).toLocaleString('en-IN')
                : '0'}
            </p>
            <span className="text-[10px] text-cyan-400 font-semibold">Per Active Subscriber</span>
          </div>
        </div>
      </div>

      {/* Real Charts Grid & Plan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Revenue Trend Chart (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0E1424] border border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-white text-base tracking-tight">Revenue Trend Overview</h3>
                <p className="text-xs text-gray-400">Gross subscription receipts over time from database (₹ INR)</p>
              </div>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setChartView('trend')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    chartView === 'trend' ? 'bg-[#005338] text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                  type="button"
                >
                  6-Mo Trend
                </button>
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
                  Daily
                </button>
              </div>
            </div>

            {chartView === 'trend' ? (
              <AdminChart
                title=""
                data={(summary?.revenueTrend || []).map((t) => ({
                  label: t.period,
                  value: t.gross,
                }))}
                type="bar"
                color="#10b981"
                valuePrefix="₹"
              />
            ) : chartView === 'monthly' ? (
              <AdminChart
                title=""
                data={(summary?.monthlyRevenueBreakdown || []).map((m) => ({
                  label: m.month.split(' ')[0],
                  value: m.gross,
                }))}
                type="bar"
                color="#06b6d4"
                valuePrefix="₹"
              />
            ) : (
              <AdminChart
                title=""
                data={(summary?.dailyRevenueBreakdown || []).map((d) => ({
                  label: d.date.slice(5),
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
              {(summary?.planBreakdown && summary.planBreakdown.length > 0
                ? summary.planBreakdown
                : summary?.revenueByPlan || []
              ).map((p: any, idx) => {
                const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];
                const barColor = colors[idx % colors.length];
                const percentage = p.percentage ?? 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-200 font-bold">{p.planName}</span>
                      <span className="text-white font-mono font-bold">
                        ₹{(p.revenue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        style={{ width: `${percentage}%`, backgroundColor: barColor }}
                        className="h-full rounded-full transition-all duration-700"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>{p.subscribersCount ?? p.count ?? 0} active subscribers</span>
                      <span>{percentage}% share</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-gray-400">Payment Gateway:</span>
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Razorpay Verified Integration
            </span>
          </div>
        </div>
      </div>

      {/* MODULE 2: COMPLETE SUBSCRIPTION RECORDS TABLE */}
      <div className="bg-[#0E1424] border border-white/10 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h3 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-[20px]">table_rows</span>
              Complete Subscription Records Directory
            </h3>
            <p className="text-xs text-gray-400">
              Search, filter, paginate, and audit all customer subscription and billing transactions
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Total Records:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/20">
              {totalSubscriptions}
            </span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search Field (Span 2 cols on lg) */}
          <div className="lg:col-span-2 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, shop, email, phone, sub ID, payment ID..."
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Date Range Filter */}
          <select
            value={tableDateRange}
            onChange={(e) => {
              setTableDateRange(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all_time">Date: All Time</option>
            <option value="today">Date: Today</option>
            <option value="last_7_days">Date: Last 7 Days</option>
            <option value="last_30_days">Date: Last 30 Days</option>
            <option value="this_month">Date: This Month</option>
            <option value="this_year">Date: This Year</option>
            <option value="custom">Date: Custom Range</option>
          </select>

          {/* Plan Filter */}
          <select
            value={tablePlanFilter}
            onChange={(e) => {
              setTablePlanFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">Plan: All Plans</option>
            <option value="free">Free Forever (₹0)</option>
            <option value="pro_monthly">Pro Monthly (₹349)</option>
            <option value="pro_yearly">Pro Annual (₹2,999)</option>
            <option value="business">Business (₹3,999)</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={tablePaymentStatus}
            onChange={(e) => {
              setTablePaymentStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">Payment: All</option>
            <option value="SUCCESS">Success / Captured</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Subscription Status Filter */}
          <select
            value={tableSubscriptionStatus}
            onChange={(e) => {
              setTableSubscriptionStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">Status: All</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Custom Date Range Row for Table if tableDateRange === 'custom' */}
        {tableDateRange === 'custom' && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 text-xs text-gray-300">
            <span>Filter Start:</span>
            <input
              type="date"
              value={tableCustomStart}
              onChange={(e) => setTableCustomStart(e.target.value)}
              className="h-8 px-2 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs"
            />
            <span className="ml-2">Filter End:</span>
            <input
              type="date"
              value={tableCustomEnd}
              onChange={(e) => setTableCustomEnd(e.target.value)}
              className="h-8 px-2 rounded-lg bg-black/40 border border-white/10 text-white font-mono text-xs"
            />
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#131b2e] border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-3">Subscriber &amp; Shop</th>
                <th className="py-3 px-3">Contact Details</th>
                <th className="py-3 px-3">Subscription / Txn ID</th>
                <th className="py-3 px-3">Plan &amp; Cycle</th>
                <th className="py-3 px-3">Amount Paid</th>
                <th className="py-3 px-3">Payment Status</th>
                <th className="py-3 px-3">Sub Status</th>
                <th className="py-3 px-3">Gateway Ref</th>
                <th className="py-3 px-3">Start / Expiry</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoadingTable ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading verified subscription records...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <span className="material-symbols-outlined text-[32px] text-gray-500 block mb-1">
                      inbox
                    </span>
                    No subscription records found matching your filters.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  return (
                    <tr
                      key={sub.id}
                      onClick={() => handleOpenDetail(sub.id)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center border border-emerald-500/30 shrink-0 text-xs">
                            {sub.userName.charAt(0)}
                          </div>
                          <div className="min-w-0 max-w-[140px]">
                            <p className="font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                              {sub.userName}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{sub.businessName}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <p className="text-gray-200">{sub.userPhone || '—'}</p>
                        <p className="text-gray-400 truncate max-w-[120px]">{sub.userEmail || '—'}</p>
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px] text-gray-400">
                        <span className="truncate block max-w-[110px]" title={sub.id}>
                          {sub.id}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-white block">{sub.planName}</span>
                        <span className="text-[10px] text-cyan-300 font-semibold">
                          ₹{sub.planPrice}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        ₹{(sub.amountPaid || sub.amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3">{getPaymentStatusBadge(sub.paymentStatus)}</td>

                      <td className="py-3 px-3">{getStatusBadge(sub.status)}</td>

                      <td className="py-3 px-3 font-mono text-[10px] text-gray-400">
                        <span className="text-gray-300 block">{sub.paymentGateway || 'Razorpay'}</span>
                        <span className="truncate block max-w-[100px]" title={sub.paymentId}>
                          {sub.paymentId || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px]">
                        <p className="text-gray-200">{sub.startDate || '—'}</p>
                        <p className="text-amber-300/80">{sub.expiryDate || '—'}</p>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(sub.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-emerald-500/20 text-white hover:text-emerald-300 font-bold text-[11px] transition-colors cursor-pointer"
                          type="button"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-gray-400">
          <div>
            Showing {(page - 1) * limit + (subscriptions.length > 0 ? 1 : 0)} to{' '}
            {Math.min(page * limit, totalSubscriptions)} of {totalSubscriptions} records
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 focus:outline-none"
            >
              <option value={15}>15 per page</option>
              <option value={30}>30 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              type="button"
            >
              Previous
            </button>
            <span className="font-mono font-bold text-white px-1">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* MODULE 4: SUBSCRIPTION DETAIL MODAL */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0E1424] border border-white/15 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-white space-y-6 animate-scale-in custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#005338] to-[#008f62] flex items-center justify-center text-white font-black text-xl border border-white/20 shadow-md">
                  {subDetail?.user?.name ? subDetail.user.name.charAt(0) : 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-white">
                      {subDetail?.user?.name || 'Subscriber Details'}
                    </h3>
                    {subDetail?.subscription && getStatusBadge(subDetail.subscription.status)}
                    {isCmo && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                        CMO View
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {subDetail?.business?.name || 'Shop'} •{' '}
                    {subDetail?.business?.city || 'India'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedSubId(null);
                  setSubDetail(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-16 text-center text-gray-400">
                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-semibold">Loading full subscription audit &amp; payment timeline...</p>
              </div>
            ) : subDetail ? (
              <div className="space-y-6 text-xs">
                {/* 1. Customer & Business Profile */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <span>Customer &amp; Business Profile</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Mobile:</span>
                      <span className="text-white font-bold">{subDetail.user?.mobile || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Email:</span>
                      <span className="text-white truncate block">{subDetail.user?.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Business Name:</span>
                      <span className="text-white font-bold">{subDetail.business?.name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">GSTIN / City:</span>
                      <span className="text-gray-300">
                        {subDetail.business?.gstin || 'None'} • {subDetail.business?.city || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Current Plan & Entitlement Status */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Current Plan &amp; Entitlement Status</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Plan Name:</span>
                      <span className="text-white font-bold text-sm">
                        {subDetail.plan?.name || subDetail.subscription?.plan?.name || 'Free / Pro'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Billing Cycle:</span>
                      <span className="text-white font-bold capitalize">
                        {subDetail.plan?.billingCycle || 'Monthly'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Amount Paid:</span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">
                        ₹{(subDetail.subscription?.amountPaid || subDetail.subscription?.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Auto-Renew:</span>
                      <span className="text-white">
                        {subDetail.subscription?.autoRenew ? '🔄 Enabled (Autopay)' : '❌ Manual'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Start Date:</span>
                      <span className="text-gray-300 font-mono">
                        {subDetail.subscription?.startDate
                          ? new Date(subDetail.subscription.startDate).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Expiry Date:</span>
                      <span className="text-amber-300 font-mono font-bold">
                        {subDetail.subscription?.expiryDate
                          ? new Date(subDetail.subscription.expiryDate).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Next Renewal:</span>
                      <span className="text-cyan-300 font-mono">
                        {subDetail.subscription?.nextRenewalDate
                          ? new Date(subDetail.subscription.nextRenewalDate).toLocaleDateString()
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Entitlement Active:</span>
                      <span className="text-emerald-400 font-bold">
                        {subDetail.entitlements?.isProActive ? '✅ Full Pro Access' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Complete Payment Attempts (Successful & Unsuccessful) */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">receipt</span>
                    <span>
                      Payment History &amp; Attempts ({subDetail.paymentAttempts?.length || 0})
                    </span>
                  </h4>
                  {(!subDetail.paymentAttempts || subDetail.paymentAttempts.length === 0) ? (
                    <div className="p-3 rounded-xl bg-white/5 text-gray-400 text-center">
                      No payment attempts recorded (e.g. Free or Trial subscription).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subDetail.paymentAttempts.map((p: any) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white">
                                ₹{(p.amount || 0).toLocaleString('en-IN')}
                              </span>
                              {getPaymentStatusBadge(p.status)}
                              <span className="text-[10px] text-gray-400 font-mono">
                                {p.paymentGateway || 'Razorpay'} • {p.paymentMethod || 'UPI'}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                              ID: {p.gatewayPaymentId || p.paymentId || p.id} • Order:{' '}
                              {p.gatewayOrderId || p.orderId || '—'}
                            </p>
                            {p.failureReason && (
                              <p className="text-[10px] text-rose-300 mt-0.5">
                                ⚠️ Failure: {p.failureReason}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono shrink-0">
                            {new Date(p.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Complete Subscription History / Transitions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">timeline</span>
                    <span>
                      Subscription Lifecycle &amp; Transitions ({subDetail.subscriptionHistory?.length || 0})
                    </span>
                  </h4>
                  {(!subDetail.subscriptionHistory || subDetail.subscriptionHistory.length === 0) ? (
                    <div className="p-3 rounded-xl bg-white/5 text-gray-400 text-center">
                      No lifecycle events logged.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subDetail.subscriptionHistory.map((h: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <div>
                              <span className="font-bold text-white capitalize">{h.event || h.type}</span>
                              <span className="text-gray-400 text-[11px] block">{h.note || h.planName}</span>
                            </div>
                          </div>
                          <span className="text-gray-400 font-mono text-[10px]">
                            {new Date(h.date || h.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Refunds History if any */}
                {subDetail.refunds && subDetail.refunds.length > 0 && (
                  <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
                      <span>Refund Records</span>
                    </h4>
                    {subDetail.refunds.map((r: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-200">
                          Refund Ref: {r.id || r.referenceId || 'N/A'} • {r.status}
                        </span>
                        <span className="text-rose-400 font-mono font-bold">
                          -₹{(r.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. Administrative Audit History */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-gray-400 flex items-center justify-between font-mono">
                  <span>Created: {new Date(subDetail.subscription?.createdAt).toLocaleString()}</span>
                  <span>Last Updated: {new Date(subDetail.subscription?.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400">Subscription details not found.</div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => {
                  setSelectedSubId(null);
                  setSubDetail(null);
                }}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                type="button"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
