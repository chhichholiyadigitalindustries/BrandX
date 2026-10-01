/**
 * BRANDX Admin Khata Screen (/admin/khata)
 */

import React, { useEffect, useState } from 'react';
import { khataService } from '../services/khataService';
import { AdminKhataMetrics } from '../types';
import { AdminStatCard } from '../components/AdminStatCard';

export const AdminKhataScreen: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminKhataMetrics | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([khataService.getMetrics(), khataService.getRecentActivity()]).then(([m, a]) => {
      setMetrics(m);
      setActivity(a);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !metrics) {
    return <div className="py-16 text-center text-gray-400">Loading Khata analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AdminStatCard label="Total Customer Accounts" value={metrics.totalAccounts} icon="menu_book" color="emerald" />
        <AdminStatCard label="Active Khata Users" value={metrics.activeAccounts} icon="people" color="blue" />
        <AdminStatCard label="Total Credit Recorded" value={`₹${(metrics.totalUdharGiven || 0).toLocaleString('en-IN')}`} icon="arrow_outward" color="rose" />
        <AdminStatCard label="Total Jama Settled" value={`₹${(metrics.totalJamaReceived || 0).toLocaleString('en-IN')}`} icon="call_received" color="emerald" />
      </div>

      {/* Grid: Settlement Overview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#0E1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h4 className="font-extrabold text-white text-base">Khata Settlement Health &amp; Velocity</h4>
          <p className="text-xs text-gray-400">Indian retail udhar book recovery rate across tier 2/3 markets.</p>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300 font-semibold">Payment Settlement Rate</span>
                <span className="text-emerald-400 font-mono font-bold">{metrics.settlementRatePercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  style={{ width: `${metrics.settlementRatePercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-gray-400 text-xs block">Daily Khata Transactions</span>
                <span className="text-xl font-black text-white font-mono mt-1 block">
                  {metrics.dailyTransactionsCount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 block font-semibold">Live ledger records</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-gray-400 text-xs block">Market Credit Outstanding</span>
                <span className="text-xl font-black text-amber-300 font-mono mt-1 block">
                  ₹{(metrics.netPendingMarketBalance || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">Pending recovery balance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Ledger Actions Feed */}
        <div className="lg:col-span-5 bg-[#0E1424] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h4 className="font-extrabold text-white text-base">Recent Khata Platform Activity</h4>
          <div className="space-y-3">
            {activity.map((act) => (
              <div key={act.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{act.businessName}</p>
                  <p className="text-[11px] text-emerald-400">{act.action}</p>
                  <span className="text-[10px] text-gray-400">{act.time}</span>
                </div>
                {act.amount > 0 && (
                  <span className="font-mono font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg">
                    ₹{act.amount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
