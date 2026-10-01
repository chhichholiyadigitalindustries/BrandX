/**
 * BRANDX Admin Dashboard Overview Screen (/admin)
 */

import React, { useEffect, useState } from 'react';
import { adminDashboardService } from '../services/adminDashboardService';
import { revenueService } from '../services/revenueService';
import { AdminDashboardOverview } from '../types';
import { RevenueSummary } from '../types/payment';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminChart } from '../components/AdminChart';
import { useAdminNavigation } from '../context/AdminNavigationContext';

export const AdminDashboardScreen: React.FC = () => {
  const [data, setData] = useState<AdminDashboardOverview | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { navigate } = useAdminNavigation();

  useEffect(() => {
    Promise.all([
      adminDashboardService.getOverviewMetrics(),
      revenueService.getRevenueSummary('this_month'),
    ]).then(([overview, rev]) => {
      setData(overview);
      setRevenueData(rev);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400 font-semibold">Loading BrandX analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-[#005338] via-[#006e4a] to-[#0d2a45] rounded-3xl p-6 sm:p-8 border border-emerald-400/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold mb-3 border border-white/15">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <span>All Systems Operational • Real-time MSME Pulse</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
            BrandX Executive Control Center
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1.5">
            Powering Indian Vyaparis, Retailers &amp; MSMEs with AI Marketing, GST Billing &amp; Digital Khata.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => navigate('revenue')}
            className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">monitoring</span>
            <span>Revenue &amp; P&amp;L</span>
          </button>
          <button
            onClick={() => navigate('daily-status')}
            className="px-4 py-2.5 rounded-2xl bg-white text-emerald-950 font-extrabold text-xs sm:text-sm shadow-xl hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-700">add_photo_alternate</span>
            <span>Upload Poster</span>
          </button>
        </div>
      </div>

      {/* Requirement 20: Financial & Revenue Summary Section */}
      <div className="bg-[#10172A] border border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Pro Subscriptions &amp; Revenue Overview</h3>
              <p className="text-[11px] text-gray-400">Financial pulse and monetization health</p>
            </div>
          </div>
          <button
            onClick={() => navigate('revenue')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
            type="button"
          >
            <span>Open Full P&amp;L Suite</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <AdminStatCard
            label="Total Revenue"
            value={`₹${(revenueData?.totalRevenue ?? data.totalRevenue ?? 0).toLocaleString('en-IN')}`}
            change={revenueData?.revenueGrowthMoM ? `+${revenueData.revenueGrowthMoM}%` : undefined}
            isPositive={true}
            icon="payments"
            color="emerald"
            subtext="Gross platform collections"
          />
          <AdminStatCard
            label="Active Pro Subscribers"
            value={(revenueData?.activeProSubscribers ?? data.totalSubscribers ?? 0).toLocaleString('en-IN')}
            change={revenueData?.newSubscribersThisMonth ? `+${revenueData.newSubscribersThisMonth}` : undefined}
            isPositive={true}
            icon="workspace_premium"
            color="purple"
            subtext="Paid active accounts"
          />
          <AdminStatCard
            label="This Month (MTD)"
            value={`₹${(revenueData?.revenueThisMonth ?? 0).toLocaleString('en-IN')}`}
            change={revenueData?.revenueGrowthMoM ? `+${revenueData.revenueGrowthMoM}%` : undefined}
            isPositive={true}
            icon="calendar_month"
            color="amber"
            subtext={`${revenueData?.newSubscribersThisMonth || 0} new subs this month`}
          />
          <AdminStatCard
            label="Failed Payments"
            value={(revenueData?.failedPaymentsCount ?? 0).toLocaleString('en-IN')}
            isPositive={false}
            icon="error"
            color="rose"
            subtext="Pending / failed attempts"
          />
        </div>

        {/* Small Revenue Chart */}
        <div className="pt-2">
          <AdminChart
            title="Monthly Revenue Trend (2026 MTD)"
            subtitle="Gross monthly collections & Pro upgrades in INR (₹)"
            data={
              revenueData?.monthlyRevenueBreakdown && revenueData.monthlyRevenueBreakdown.length > 0
                ? revenueData.monthlyRevenueBreakdown.map((m) => ({
                    label: m.month.split(' ')[0],
                    value: m.gross,
                  }))
                : [
                    { label: 'Jan', value: 0 },
                    { label: 'Feb', value: 0 },
                    { label: 'Mar', value: 0 },
                    { label: 'Apr', value: 0 },
                    { label: 'May', value: 0 },
                    { label: 'Jun', value: 0 },
                    { label: 'Jul', value: 0 },
                    { label: 'Aug', value: 0 },
                    { label: 'Sep', value: revenueData?.revenueThisMonth || 0 },
                  ]
            }
            type="bar"
            color="#10b981"
          />
        </div>
      </div>

      {/* Row 1: Primary Platform Growth KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Total Registered Users"
          value={data.totalUsers}
          change={`+${data.userGrowthPercent}%`}
          isPositive={true}
          icon="group"
          color="emerald"
          subtext={`+${data.newUsersToday} new registrations today`}
        />
        <AdminStatCard
          label="Daily Active Vyaparis"
          value={data.activeUsersToday}
          isPositive={true}
          icon="trending_up"
          color="blue"
          subtext="Active today in app"
        />
        <AdminStatCard
          label="Total Businesses"
          value={data.totalBusinesses}
          isPositive={true}
          icon="storefront"
          color="purple"
          subtext="Verified shop profiles"
        />
        <AdminStatCard
          label="GST Invoices Created"
          value={data.totalInvoicesGenerated}
          isPositive={true}
          icon="receipt_long"
          color="amber"
          subtext={`${data.invoicesToday.toLocaleString('en-IN')} bills generated today`}
        />
      </div>

      {/* Row 2: Secondary Feature Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          label="Posters Shared to WhatsApp"
          value={data.postersSharedCount}
          isPositive={true}
          icon="share"
          color="emerald"
          subtext={`${data.postersSharedToday.toLocaleString('en-IN')} shared today`}
        />
        <AdminStatCard
          label="AI Copilot Invocations"
          value={data.aiRequestsCount}
          isPositive={true}
          icon="auto_awesome"
          color="purple"
          subtext={`${data.aiRequestsToday.toLocaleString('en-IN')} prompts processed today`}
        />
        <AdminStatCard
          label="Khata Ledger Records"
          value={data.totalKhataTransactions}
          isPositive={true}
          icon="menu_book"
          color="blue"
          subtext="Udhar & Jama transactions"
        />
        <AdminStatCard
          label="Platform Status"
          value="Operational"
          icon="health_and_safety"
          color="emerald"
          subtext="All systems active"
        />
      </div>

      {/* Row 3: Interactive Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminChart
          title="Daily Active Users (Past 7 Days)"
          subtitle="Vyaparis opening BrandX app daily"
          data={data.chartDailyActiveUsers}
          type="bar"
          color="#10b981"
        />
        <AdminChart
          title="Daily Invoices Generated (Past 7 Days)"
          subtitle="Tax invoices & estimate quotations created"
          data={data.chartInvoiceGeneration}
          type="bar"
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminChart
            title="AI Copilot & Voice-to-Bill Usage"
            subtitle="Marketing captions, review replies & bill drafting volume"
            data={data.chartAiUsage}
            type="bar"
            color="#8b5cf6"
          />
        </div>
        <div>
          <AdminChart
            title="Content Engagement Breakdown"
            subtitle="Most popular features shared to WhatsApp"
            data={data.chartContentEngagement}
            type="donut"
          />
        </div>
      </div>
    </div>
  );
};
