/**
 * BRANDX Admin Refunds Management Screen (/admin/refunds)
 * Audit, approve, and process customer subscription refunds.
 */

import React, { useEffect, useState } from 'react';
import { refundService } from '../services/refundService';
import { RefundRecord } from '../types/payment';
import { useAdminToast } from '../components/AdminToast';

export const AdminRefundsScreen: React.FC = () => {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'requested' | 'processing' | 'completed' | 'rejected' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Process Refund Action Modal State
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionNotes, setActionNotes] = useState('');

  const { showToast } = useAdminToast();

  const loadRefunds = async () => {
    setIsLoading(true);
    try {
      const data = await refundService.getRefunds({
        search,
        status: statusFilter,
      });
      setRefunds(data);
    } catch (e) {
      showToast('Error loading refunds', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, [search, statusFilter]);

  const handleExportCSV = async () => {
    try {
      const csv = await refundService.exportRefundsCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brandx_refunds_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Refunds list exported as CSV 💰', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  };

  const handleProcessAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund) return;
    try {
      await refundService.processRefund(selectedRefund.id, actionType, actionNotes);
      showToast(
        actionType === 'approve'
          ? 'Refund approved and dispatched to source gateway! ✅'
          : 'Refund request rejected with audit note ❌',
        actionType === 'approve' ? 'success' : 'info'
      );
      setSelectedRefund(null);
      loadRefunds();
    } catch (e) {
      showToast('Failed to process refund', 'error');
    }
  };

  const getStatusBadge = (status: RefundRecord['status']) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case 'processing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Processing</span>;
      case 'requested':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">Action Required</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search refund by Refund ID, Payment ID, User, Business..."
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">All Statuses</option>
            <option value="requested">Requested (Pending)</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

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

      {/* Refunds Table Card */}
      <div className="bg-[#0E1424] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#131b2e] border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-4 px-4">Refund &amp; TXN ID</th>
                <th className="py-4 px-4">User &amp; Business</th>
                <th className="py-4 px-4">Amount</th>
                <th className="py-4 px-4">Reason</th>
                <th className="py-4 px-4">Refund Date</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading refunds...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No refund requests found.
                  </td>
                </tr>
              ) : (
                refunds.map((ref) => (
                  <tr key={ref.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="font-bold text-white block">{ref.id}</span>
                      <span className="text-gray-400 block text-[10px]">{ref.transactionId}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white truncate">{ref.userName}</p>
                      <p className="text-[11px] text-gray-400 truncate">{ref.businessName}</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <span className="font-black text-rose-400 text-sm">₹{ref.amount}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-gray-200 font-medium block">{ref.reason}</span>
                      {ref.notes && <span className="text-[10px] text-gray-400 line-clamp-1">{ref.notes}</span>}
                    </td>

                    <td className="py-3.5 px-4 text-gray-300 font-mono">
                      {ref.refundDate.split('T')[0]}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(ref.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {ref.status === 'requested' || ref.status === 'processing' ? (
                        <button
                          onClick={() => {
                            setSelectedRefund(ref);
                            setActionType('approve');
                            setActionNotes('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/30 cursor-pointer"
                          type="button"
                        >
                          Process
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400">Audited</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Refund Action Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0E1424] border border-white/15 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-extrabold text-base text-white">Process Refund: {selectedRefund.id}</h3>
                <p className="text-xs text-gray-400 font-mono">Amount: ₹{selectedRefund.amount}</p>
              </div>
              <button
                onClick={() => setSelectedRefund(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-xs">
              <p><span className="text-gray-400">Customer:</span> <strong className="text-white">{selectedRefund.userName}</strong> ({selectedRefund.userPhone})</p>
              <p><span className="text-gray-400">Business:</span> <strong className="text-white">{selectedRefund.businessName}</strong></p>
              <p><span className="text-gray-400">Claim Reason:</span> <strong className="text-amber-300">{selectedRefund.reason}</strong></p>
              <p><span className="text-gray-400">Source Payment ID:</span> <span className="font-mono text-gray-300">{selectedRefund.paymentId}</span></p>
            </div>

            <form onSubmit={handleProcessAction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('approve')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      actionType === 'approve'
                        ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}
                  >
                    ✓ Approve Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('reject')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      actionType === 'reject'
                        ? 'bg-rose-500 text-white shadow-md font-black'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}
                  >
                    ✕ Reject Request
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Admin Audit Notes</label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={actionType === 'approve' ? 'e.g. Approved. Dispatched via Razorpay source account.' : 'e.g. Rejected. Subscription period already utilized.'}
                  className="w-full h-20 p-3 rounded-xl bg-white/10 border border-white/15 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRefund(null)}
                  className="flex-1 h-11 rounded-xl bg-white/10 text-gray-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 h-11 rounded-xl font-black text-xs cursor-pointer shadow-md ${
                    actionType === 'approve' ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  Confirm &amp; Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
