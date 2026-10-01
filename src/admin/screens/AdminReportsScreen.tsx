/**
 * BRANDX Admin Reports Screen (/admin/reports)
 */

import React, { useState } from 'react';
import { reportService } from '../services/reportService';
import { AdminReportFilter } from '../types';
import { useAdminToast } from '../components/AdminToast';

export const AdminReportsScreen: React.FC = () => {
  const [reportType, setReportType] = useState<AdminReportFilter['reportType']>('users');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useAdminToast();

  const handleExport = async () => {
    setIsExporting(true);
    showToast('Generating CSV report dataset...');
    try {
      const res = await reportService.exportReport({
        reportType,
        startDate,
        endDate,
        format: 'csv',
      });
      if (res.success) {
        showToast(`Report downloaded: ${res.filename}`);
      }
    } catch (err: any) {
      showToast('Export failed: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const reportCards = [
    {
      type: 'users',
      title: 'Users KYC & Activity Report',
      desc: 'Complete list of registered vyaparis, shop categories, phone numbers, state distribution and PRO status.',
      icon: 'group',
      color: 'emerald',
    },
    {
      type: 'invoices',
      title: 'GST Billing & Document Report',
      desc: 'Aggregated tax invoices, quotations, delivery challans, GST sums and customer count.',
      icon: 'receipt_long',
      color: 'amber',
    },
    {
      type: 'khata',
      title: 'Digital Khata Platform Report',
      desc: 'Udhar-Jama transactions volume, circulating credit, settlement efficiency and active ledger count.',
      icon: 'menu_book',
      color: 'blue',
    },
    {
      type: 'ai_usage',
      title: 'AI Copilot Invocations Audit',
      desc: 'Daily prompt trends, voice-to-bill execution count, latency percentiles and token volume.',
      icon: 'auto_awesome',
      color: 'purple',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#0E1424] p-5 rounded-3xl border border-white/10 shadow-lg space-y-4">
        <div>
          <h3 className="font-extrabold text-white text-base">Export &amp; Intelligence Reports</h3>
          <p className="text-xs text-gray-400">Generate and export downloadable CSV audit files for accounting &amp; management.</p>
        </div>

        {/* Date Filter & Export Row */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-extrabold text-xs shadow-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            type="button"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">download</span>
            )}
            <span>Export Selected Report (.CSV)</span>
          </button>
        </div>
      </div>

      {/* Select Report Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {reportCards.map((rc) => {
          const isSelected = reportType === rc.type;
          return (
            <div
              key={rc.type}
              onClick={() => setReportType(rc.type as any)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-500/50 shadow-2xl scale-[1.01]'
                  : 'bg-[#0E1424] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-400 text-[24px]">{rc.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">{rc.title}</h4>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">CSV Export Ready</span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-white/30'
                  }`}
                >
                  {isSelected && <span className="material-symbols-outlined text-[14px] text-black font-bold">check</span>}
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">{rc.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
