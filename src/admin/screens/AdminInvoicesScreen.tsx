/**
 * BRANDX Admin Invoices Screen (/admin/invoices)
 */

import React, { useEffect, useState } from 'react';
import { invoiceService } from '../services/invoiceService';
import { adminDashboardService } from '../services/adminDashboardService';
import { AdminInvoiceRecord } from '../types';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminStatCard } from '../components/AdminStatCard';

export const AdminInvoicesScreen: React.FC = () => {
  const [invoices, setInvoices] = useState<AdminInvoiceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<{ totalInvoices: number; invoicesToday: number }>({
    totalInvoices: 0,
    invoicesToday: 0,
  });

  useEffect(() => {
    adminDashboardService.getOverviewMetrics().then((m) => {
      setMetrics({
        totalInvoices: m.totalInvoicesGenerated || 0,
        invoicesToday: m.invoicesToday || 0,
      });
    });
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    const res = await invoiceService.getInvoices({
      page,
      search,
      docType: docTypeFilter,
      limit: 10,
    });
    setInvoices(res.invoices);
    setTotal(res.total);
    setTotalPages(res.totalPages);
    setPage(res.page);
    setIsLoading(false);
  };

  useEffect(() => {
    loadInvoices();
  }, [page, docTypeFilter]);

  const columns: Column<AdminInvoiceRecord>[] = [
    {
      header: 'Invoice #',
      render: (inv) => (
        <span className="font-mono text-xs text-white font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
          {inv.invoiceNumber}
        </span>
      ),
    },
    {
      header: 'Business Name',
      render: (inv) => <span className="font-semibold text-xs text-emerald-300">{inv.businessName}</span>,
    },
    {
      header: 'Customer',
      render: (inv) => (
        <div>
          <p className="text-xs text-white">{inv.customerName}</p>
          {inv.customerPhone && <p className="text-[10px] text-gray-400 font-mono">{inv.customerPhone}</p>}
        </div>
      ),
    },
    {
      header: 'Doc Type',
      render: (inv) => (
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
          {inv.documentType}
        </span>
      ),
    },
    {
      header: 'Amount (INR)',
      render: (inv) => (
        <div className="font-mono text-xs">
          <span className="font-bold text-white">₹{inv.amount.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-gray-400 block">+₹{inv.gstAmount} GST</span>
        </div>
      ),
    },
    {
      header: 'Date & Mode',
      render: (inv) => (
        <div className="text-xs">
          <span className="text-gray-300">{inv.date}</span>
          <span className="text-[10px] text-emerald-400 block font-semibold">{inv.paymentMode}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (inv) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            inv.status === 'paid'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
          }`}
        >
          {inv.status.toUpperCase()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AdminStatCard label="Total Invoices Created" value={metrics.totalInvoices} icon="receipt_long" color="emerald" />
        <AdminStatCard label="Invoices Today" value={metrics.invoicesToday} icon="today" color="amber" />
        <AdminStatCard label="Tax Invoices (B2B/B2C)" value={total} icon="description" color="blue" />
        <AdminStatCard label="Quotations / Estimates" value={0} icon="request_quote" color="purple" />
      </div>

      {/* Table */}
      <AdminTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        emptyMessage="No invoice records found."
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search invoice #, business or customer..."
        actionsHeader={
          <select
            value={docTypeFilter}
            onChange={(e) => {
              setDocTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all" className="bg-[#0E1424]">All Document Types</option>
            <option value="Tax Invoice" className="bg-[#0E1424]">Tax Invoice</option>
            <option value="Estimate / Quotation" className="bg-[#0E1424]">Estimate / Quotation</option>
            <option value="Delivery Challan" className="bg-[#0E1424]">Delivery Challan</option>
          </select>
        }
      />
    </div>
  );
};
