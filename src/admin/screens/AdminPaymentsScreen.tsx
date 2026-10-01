/**
 * BRANDX Admin Payment Transactions Screen (/admin/payments)
 * Real-time transaction ledger with multi-filter search, safe detail inspection, and CSV export.
 * Privacy-safe: Displays transaction references only. Never stores or displays CVV/PINs.
 */

import React, { useEffect, useState } from 'react';
import { paymentService } from '../services/paymentService';
import { PaymentTransaction, PaymentStatus, PaymentGateway, PaymentMethod } from '../types/payment';
import { useAdminToast } from '../components/AdminToast';

export const AdminPaymentsScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [gatewayFilter, setGatewayFilter] = useState<PaymentGateway | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Transaction for Detail Modal
  const [selectedTxn, setSelectedTxn] = useState<PaymentTransaction | null>(null);

  const { showToast } = useAdminToast();

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await paymentService.getTransactions({
        search,
        status: statusFilter,
        gateway: gatewayFilter,
        paymentMethod: methodFilter,
        page,
        limit: 15,
      });
      setTransactions(res.transactions);
      setTotalCount(res.totalCount);
      setTotalVolume(res.totalVolume);
    } catch (e) {
      showToast('Error loading payment transactions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [search, statusFilter, gatewayFilter, methodFilter, page]);

  const handleExportCSV = async () => {
    try {
      const csv = await paymentService.exportTransactionsCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brandx_payments_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Transactions exported as CSV 💳', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'success':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Success</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">Pending</span>;
      case 'failed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Failed</span>;
      case 'refunded':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">Refunded</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Transaction ID, Payment ID, Order ID, User, Phone..."
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as PaymentStatus | 'all');
              setPage(1);
            }}
            className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Gateway Filter */}
          <select
            value={gatewayFilter}
            onChange={(e) => {
              setGatewayFilter(e.target.value as PaymentGateway | 'all');
              setPage(1);
            }}
            className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">All Gateways</option>
            <option value="Razorpay">Razorpay</option>
            <option value="PhonePe">PhonePe</option>
            <option value="Paytm">Paytm</option>
            <option value="Cashfree">Cashfree</option>
          </select>

          {/* Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value as PaymentMethod | 'all');
              setPage(1);
            }}
            className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">All Methods</option>
            <option value="upi">UPI / QR</option>
            <option value="card">Cards</option>
            <option value="netbanking">NetBanking</option>
            <option value="wallet">Wallets</option>
          </select>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-[#005338] to-[#008f62] hover:brightness-110 text-white text-xs font-extrabold shadow-md border border-emerald-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Filtered Volume</p>
          <p className="text-xl font-black text-emerald-400 mt-1">₹{totalVolume.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-gray-400">Total settled payments</p>
        </div>

        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Transactions</p>
          <p className="text-xl font-black text-white mt-1">{totalCount}</p>
          <p className="text-[10px] text-gray-400">Records found</p>
        </div>

        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Success Rate</p>
          <p className="text-xl font-black text-cyan-300 mt-1">98.2%</p>
          <p className="text-[10px] text-emerald-400 font-semibold">Healthy gateway connectivity</p>
        </div>

        <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 shadow-lg">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Primary Gateway</p>
          <p className="text-xl font-black text-blue-400 mt-1">Razorpay</p>
          <p className="text-[10px] text-gray-400">UPI Autopay Supported</p>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-[#0E1424] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#131b2e] border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-4 px-4">Transaction &amp; Order ID</th>
                <th className="py-4 px-4">User &amp; Business</th>
                <th className="py-4 px-4">Plan</th>
                <th className="py-4 px-4">Amount</th>
                <th className="py-4 px-4">Method &amp; Gateway</th>
                <th className="py-4 px-4">Date &amp; Time</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading payment transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No transactions matching your filter criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="font-bold text-white block">{txn.id}</span>
                      <span className="text-gray-400 block text-[10px]">{txn.orderId}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white truncate">{txn.userName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{txn.businessName}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-200">{txn.planName}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-black text-white text-sm">₹{txn.amount}</span>
                      {txn.taxAmount && (
                        <span className="text-[10px] text-gray-400 block font-normal">
                          (GST: ₹{txn.taxAmount})
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-gray-200 uppercase text-[11px] block">
                        {txn.paymentMethod}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold bg-white/5 px-1.5 py-0.5 rounded">
                        {txn.gateway}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-gray-300">
                      <span>{txn.date.split('T')[0]}</span>
                      <span className="text-[10px] text-gray-400 block">{txn.date.split('T')[1]?.slice(0, 5) || ''}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(txn.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
                        type="button"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal (Safe Metadata Only, No Secrets) */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0E1424] border border-white/15 rounded-3xl w-full max-w-xl p-6 shadow-2xl text-white space-y-6 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xl border border-emerald-500/30">
                  ₹
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-white">₹{selectedTxn.amount}</h3>
                    {getStatusBadge(selectedTxn.status)}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    TXN: {selectedTxn.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTxn(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Failure Warning if Failed */}
            {selectedTxn.status === 'failed' && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-rose-400 shrink-0">error</span>
                <div>
                  <p className="font-bold">Payment Failure Reason:</p>
                  <p className="mt-0.5">{selectedTxn.failureReason || 'Declined by customer bank'}</p>
                  {selectedTxn.failureCode && (
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">
                      CODE: {selectedTxn.failureCode}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Section 1: Customer & Business Info */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Customer Information</span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-gray-400 block text-[10px]">User Name:</span>
                  <span className="font-bold text-white">{selectedTxn.userName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Business Name:</span>
                  <span className="font-bold text-white">{selectedTxn.businessName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Mobile:</span>
                  <span className="text-gray-200">{selectedTxn.userPhone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Email:</span>
                  <span className="text-gray-200 truncate block">{selectedTxn.userEmail}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Financial Breakdown (Tax, Fees, Net Settlement) */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Financial Breakdown</span>
              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="text-gray-400 block text-[10px]">Gross Amount:</span>
                  <span className="font-bold text-white text-sm">₹{selectedTxn.amount}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <span className="text-gray-400 block text-[10px]">GST 18%:</span>
                  <span className="text-gray-300 text-sm">₹{selectedTxn.taxAmount || 0}</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <span className="text-emerald-300 block text-[10px]">Net Settlement:</span>
                  <span className="font-bold text-emerald-400 text-sm">₹{selectedTxn.netAmount || selectedTxn.amount}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Safe Payment Gateway Reference Metadata */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs font-mono">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Payment Gateway Reference</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-400 block text-[10px]">Gateway:</span>
                  <span className="text-white font-bold">{selectedTxn.gateway}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Payment Method:</span>
                  <span className="text-white uppercase">{selectedTxn.paymentMethod}</span>
                </div>
                {selectedTxn.paymentMethodDetails?.vpaMasked && (
                  <div>
                    <span className="text-gray-400 block text-[10px]">Masked UPI ID:</span>
                    <span className="text-gray-200">{selectedTxn.paymentMethodDetails.vpaMasked}</span>
                  </div>
                )}
                {selectedTxn.paymentMethodDetails?.cardLast4 && (
                  <div>
                    <span className="text-gray-400 block text-[10px]">Masked Card:</span>
                    <span className="text-gray-200">•••• {selectedTxn.paymentMethodDetails.cardLast4} ({selectedTxn.paymentMethodDetails.cardNetwork})</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 block text-[10px]">Order ID:</span>
                  <span className="text-gray-300 truncate block">{selectedTxn.orderId}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Payment ID:</span>
                  <span className="text-gray-300 truncate block">{selectedTxn.paymentId}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
