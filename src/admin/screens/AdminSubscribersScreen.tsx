/**
 * BRANDX Admin Pro Subscribers Management Screen (/admin/subscribers)
 * Full subscriber registry, expiry tracking, plan details drawer, and manual plan extension.
 */

import React, { useEffect, useState } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { Subscription, SubscriptionStatus } from '../types/payment';
import { useAdminToast } from '../components/AdminToast';

export const AdminSubscribersScreen: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscription[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [expiringFilter, setExpiringFilter] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Selected subscriber for detailed view modal
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscription | null>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [extendDays, setExtendDays] = useState(30);

  const { showToast } = useAdminToast();

  const loadSubscribers = async () => {
    setIsLoading(true);
    try {
      const data = await subscriptionService.getSubscribers({
        search,
        status: statusFilter,
        planCode: planFilter,
        expiringWithinDays: expiringFilter,
      });
      setSubscribers(data);
    } catch (e) {
      showToast('Error loading subscribers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, [search, statusFilter, planFilter, expiringFilter]);

  const handleExportCSV = async () => {
    try {
      const csv = await subscriptionService.exportSubscribersCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brandx_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Subscribers list exported as CSV 📄', 'success');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedSubscriber) return;
    try {
      const updated = await subscriptionService.extendSubscription(selectedSubscriber.id, extendDays);
      setSelectedSubscriber(updated);
      setIsExtending(false);
      loadSubscribers();
      showToast(`Subscription extended by ${extendDays} days! 🎉`, 'success');
    } catch (e) {
      showToast('Failed to extend subscription', 'error');
    }
  };

  const handleCancelSubscription = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) return;
    try {
      const updated = await subscriptionService.cancelSubscription(id, 'Cancelled via Admin Console');
      setSelectedSubscriber(updated);
      loadSubscribers();
      showToast('Subscription cancelled successfully', 'info');
    } catch (e) {
      showToast('Cancellation failed', 'error');
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>;
      case 'trial':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Free Trial</span>;
      case 'past_due':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Past Due</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>;
      case 'expired':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">Expired</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Search Bar */}
      <div className="bg-[#0E1424] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscriber by name, shop, phone, email, payment ID..."
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">All Plans</option>
            <option value="free">Free Forever (₹0)</option>
            <option value="pro_monthly">Pro Monthly (₹349)</option>
            <option value="pro_yearly">Pro Annual (₹2,999)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatus | 'all')}
            className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>

          {/* Expiring Soon Filter */}
          <select
            value={expiringFilter || ''}
            onChange={(e) => setExpiringFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Any Expiry</option>
            <option value="7">Expiring in 7 Days</option>
            <option value="15">Expiring in 15 Days</option>
            <option value="30">Expiring in 30 Days</option>
          </select>

          {/* Export CSV Button */}
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

      {/* Subscribers Table Card */}
      <div className="bg-[#0E1424] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#131b2e] border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-4 px-4">User &amp; Business</th>
                <th className="py-4 px-4">Contact Info</th>
                <th className="py-4 px-4">Plan &amp; Pricing</th>
                <th className="py-4 px-4">Start Date</th>
                <th className="py-4 px-4">Expiry Date</th>
                <th className="py-4 px-4">Auto Renew</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading subscribers...
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No subscribers found matching the filters.
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => {
                  const expiryTimestamp =
                    sub.expiryDate && sub.expiryDate !== 'Not available' && sub.expiryDate !== 'N/A'
                      ? new Date(sub.expiryDate).getTime()
                      : 0;
                  const daysLeft = expiryTimestamp
                    ? Math.ceil((expiryTimestamp - Date.now()) / (1000 * 60 * 60 * 24))
                    : 0;
                  return (
                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center border border-emerald-500/30 shrink-0">
                            {sub.userName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">{sub.userName}</p>
                            <p className="text-[11px] text-gray-400 truncate">{sub.businessName}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <p className="text-gray-200">{sub.userPhone}</p>
                        <p className="text-gray-400 truncate max-w-[150px]">{sub.userEmail}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white block">{sub.planName}</span>
                        <span className="text-[11px] text-emerald-400 font-mono font-bold">
                          ₹{sub.planPrice}
                          <span className="text-gray-400 font-normal"> / cycle</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-300 font-mono">
                        {sub.startDate.split('T')[0]}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <p className="text-gray-200">{sub.expiryDate.split('T')[0]}</p>
                        {sub.status === 'active' && expiryTimestamp > 0 && (
                          <span
                            className={`text-[10px] font-bold ${
                              daysLeft <= 7 ? 'text-amber-400' : 'text-gray-400'
                            }`}
                          >
                            {daysLeft > 0 ? `(${daysLeft}d left)` : '(Expired)'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {sub.autoRenew ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Yes (Autopay)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                            Manual
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(sub.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedSubscriber(sub)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
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
      </div>

      {/* Subscriber Detail Drawer / Modal */}
      {selectedSubscriber && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0E1424] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-white space-y-6 animate-scale-in custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#005338] to-[#008f62] flex items-center justify-center text-white font-black text-xl border border-white/20 shadow-md">
                  {selectedSubscriber.userName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-white">{selectedSubscriber.userName}</h3>
                    {getStatusBadge(selectedSubscriber.status)}
                  </div>
                  <p className="text-xs text-gray-400">
                    {selectedSubscriber.businessName} • {selectedSubscriber.businessCity || 'India'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedSubscriber(null);
                  setIsExtending(false);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Section 1: Subscription & Plan Details */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">card_membership</span>
                <span>Active Subscription Details</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Current Plan:</span>
                  <span className="font-bold text-white text-sm">{selectedSubscriber.planName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Plan Price:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">₹{selectedSubscriber.planPrice}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Total Paid To Date:</span>
                  <span className="font-mono font-bold text-white text-sm">₹{selectedSubscriber.totalPaid}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Start Date:</span>
                  <span className="font-mono text-gray-200">{selectedSubscriber.startDate.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Expiry Date:</span>
                  <span className="font-mono text-amber-300 font-bold">{selectedSubscriber.expiryDate.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Auto Renewal:</span>
                  <span className="text-gray-200">{selectedSubscriber.autoRenew ? '🔄 Enabled (Autopay)' : '❌ Disabled'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Safe Payment Gateway Reference Metadata (No card details / PINs) */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Safe Payment Reference Information</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <span className="text-gray-400 block text-[11px]">Payment Gateway:</span>
                  <span className="font-bold text-white">{selectedSubscriber.paymentGateway}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Payment Method:</span>
                  <span className="text-gray-200 uppercase">{selectedSubscriber.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Payment Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedSubscriber.paymentStatus.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Transaction ID:</span>
                  <span className="text-gray-300 truncate block">{selectedSubscriber.transactionId}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Payment ID:</span>
                  <span className="text-gray-300 truncate block">{selectedSubscriber.paymentId}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">Order ID:</span>
                  <span className="text-gray-300 truncate block">{selectedSubscriber.orderId}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Subscription & Renewal History Events */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Timeline &amp; Renewal History ({selectedSubscriber.history.length} events)
              </h4>
              <div className="space-y-2">
                {selectedSubscriber.history.map((h) => (
                  <div key={h.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <div>
                        <span className="font-bold text-white capitalize">{h.event}</span>
                        {h.note && <span className="text-gray-400 text-[11px] block">{h.note}</span>}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-emerald-400">{h.amount > 0 ? `₹${h.amount}` : 'Free'}</span>
                      <span className="text-gray-400 text-[10px] block">{h.date.split('T')[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Admin Actions (Extend or Cancel) */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              {!isExtending ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsExtending(true)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-colors cursor-pointer"
                    type="button"
                  >
                    Extend Plan Days
                  </button>
                  {selectedSubscriber.status === 'active' && (
                    <button
                      onClick={() => handleCancelSubscription(selectedSubscriber.id)}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs transition-colors cursor-pointer"
                      type="button"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <select
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="h-10 px-3 rounded-xl bg-white/10 border border-white/20 text-xs font-bold text-white"
                  >
                    <option value={7}>Add 7 Days</option>
                    <option value={15}>Add 15 Days</option>
                    <option value={30}>Add 30 Days (1 Month)</option>
                    <option value={90}>Add 90 Days (3 Months)</option>
                    <option value={365}>Add 365 Days (1 Year)</option>
                  </select>
                  <button
                    onClick={handleExtendSubscription}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                    type="button"
                  >
                    Confirm Extension
                  </button>
                  <button
                    onClick={() => setIsExtending(false)}
                    className="px-3 py-2 rounded-xl bg-white/10 text-gray-400 hover:text-white text-xs"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedSubscriber(null);
                  setIsExtending(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold w-full sm:w-auto cursor-pointer"
                type="button"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
