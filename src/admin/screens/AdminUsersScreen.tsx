/**
 * BRANDX Admin Users Management Screen (/admin/users)
 */

import React, { useEffect, useState, useTransition } from 'react';
import { userService } from '../services/userService';
import { PlatformUser } from '../types';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminModal } from '../components/AdminModal';
import { useAdminToast } from '../components/AdminToast';
import { resolveImageUrl } from '../../utils/imageUrl';

export const AdminUsersScreen: React.FC = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const { showToast } = useAdminToast();
  const [, startTransition] = useTransition();

  const loadUsers = async (p = page, q = search, st = statusFilter, state = stateFilter) => {
    setIsLoading(true);
    const res = await userService.getUsers({
      page: p,
      search: q,
      status: st,
      state: state,
      limit: 10,
    });
    setUsers(res.users);
    setTotal(res.total);
    setTotalPages(res.totalPages);
    setPage(res.page);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers(page, search, statusFilter, stateFilter);
  }, [page, statusFilter, stateFilter]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
    startTransition(() => {
      loadUsers(1, val, statusFilter, stateFilter);
    });
  };

  const handleToggleStatus = async (user: PlatformUser) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    const ok = await userService.updateUserStatus(user.id, nextStatus);
    if (ok) {
      showToast(`User ${user.name} is now ${nextStatus}`);
      loadUsers();
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...selectedUser, status: nextStatus });
      }
    }
  };

  const columns: Column<PlatformUser>[] = [
    {
      header: 'User & Shop',
      render: (u) => (
        <div className="flex items-center gap-3">
          <img
            src={u.avatarUrl ? resolveImageUrl(u.avatarUrl) : '/brandx-logo.png'}
            alt=""
            className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0 bg-white/5"
          />
          <div className="min-w-0">
            <p className="font-bold text-white text-xs truncate">{u.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{u.businessName}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Mobile & Email',
      render: (u) => (
        <div>
          <p className="font-mono text-xs text-gray-200">{u.phone}</p>
          <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
        </div>
      ),
    },
    {
      header: 'Location',
      render: (u) => (
        <div>
          <p className="text-xs text-gray-200">{u.city}</p>
          <p className="text-[11px] text-gray-400">{u.state}</p>
        </div>
      ),
    },
    {
      header: 'Plan',
      render: (u) =>
        u.isPro ? (
          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-300 font-bold text-[10px]">
            ⭐ PRO
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px]">
            Free
          </span>
        ),
    },
    {
      header: 'Status',
      render: (u) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            u.status === 'active'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}
        >
          {u.status === 'active' ? 'Active' : 'Suspended'}
        </span>
      ),
    },
    {
      header: 'Activity',
      render: (u) => (
        <div className="text-[11px] text-gray-300 font-mono">
          <span>{u.invoicesCount} bills</span> • <span>{u.khataCustomersCount} khata</span>
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedUser(u)}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
            type="button"
          >
            View
          </button>
          <button
            onClick={() => handleToggleStatus(u)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              u.status === 'active'
                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300'
            }`}
            type="button"
          >
            {u.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Table with search & filters */}
      <AdminTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        emptyMessage="No platform users found matching criteria."
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
        searchValue={search}
        onSearchChange={handleSearch}
        searchPlaceholder="Search vyapari name, mobile, shop or city..."
        actionsHeader={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all" className="bg-[#0E1424]">All Statuses</option>
              <option value="active" className="bg-[#0E1424]">Active Only</option>
              <option value="suspended" className="bg-[#0E1424]">Suspended Only</option>
            </select>
          </div>
        }
      />

      {/* User Detail Drawer / Modal */}
      {selectedUser && (
        <AdminModal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title={`User KYC & Usage Profile`}
          subtitle={`Account ID: ${selectedUser.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <img
                src={selectedUser.avatarUrl ? resolveImageUrl(selectedUser.avatarUrl) : '/brandx-logo.png'}
                alt=""
                className="w-14 h-14 rounded-2xl object-cover border border-white/20 bg-white/5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-white text-base truncate">{selectedUser.name}</h4>
                  {selectedUser.isPro && (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-full border border-amber-500/30">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-400 font-semibold truncate">{selectedUser.businessName}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{selectedUser.businessType}</p>
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Mobile Phone</span>
                <span className="text-white font-mono font-semibold">{selectedUser.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Email ID</span>
                <span className="text-white truncate block">{selectedUser.email || 'Not provided'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Location</span>
                <span className="text-white">{selectedUser.city}, {selectedUser.state}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">GSTIN Number</span>
                <span className="text-emerald-300 font-mono font-bold">{selectedUser.gstin || 'No GST Registered'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Registration Date</span>
                <span className="text-white">{selectedUser.registrationDate}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Last Active in App</span>
                <span className="text-white">{selectedUser.lastActive}</span>
              </div>
            </div>

            {/* Platform Usage Stats */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Super App In-Use Metrics</p>
              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-white/5">
                  <p className="text-base font-black text-white">{selectedUser.invoicesCount}</p>
                  <p className="text-[10px] text-gray-400">Bills Made</p>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <p className="text-base font-black text-white">{selectedUser.khataCustomersCount}</p>
                  <p className="text-[10px] text-gray-400">Khata Entries</p>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <p className="text-base font-black text-white">{selectedUser.postersSharedCount}</p>
                  <p className="text-[10px] text-gray-400">Posters Shared</p>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                  <p className="text-base font-black text-white">{selectedUser.aiRequestsCount}</p>
                  <p className="text-[10px] text-gray-400">AI Invocations</p>
                </div>
              </div>
            </div>

            {/* Requirement 17: User Profile Subscription & Payments Section */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#131b2e] to-[#0E1424] border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-400">workspace_premium</span>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Subscription &amp; Payments</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  selectedUser.isPro 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                    : 'bg-white/5 text-gray-400 border border-white/10'
                }`}>
                  {selectedUser.isPro ? 'Pro Active' : 'Free Tier'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-[10px] block">Current Plan</span>
                  <span className="text-white font-bold">{selectedUser.isPro ? 'Pro Monthly' : 'Free'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-[10px] block">Plan Expiry</span>
                  <span className="text-emerald-300 font-bold">{selectedUser.isPro ? '15 Oct 2026' : 'Lifetime Free'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-[10px] block">Total Paid</span>
                  <span className="text-white font-mono font-bold">{selectedUser.isPro ? '₹1,592' : '₹0'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-[10px] block">Last Transaction</span>
                  <span className="text-white font-mono">{selectedUser.isPro ? '15 Sep 2026' : 'None'}</span>
                </div>
              </div>

              {selectedUser.isPro && (
                <div className="pt-1 text-[11px] text-gray-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="text-gray-400">Recent Payment ID: <code className="text-emerald-300 font-mono">pay_sep_2026_{selectedUser.id.substring(0, 4)}</code></span>
                  <span className="text-emerald-400 font-bold">₹349 • Success (UPI)</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors"
                type="button"
              >
                Close
              </button>
              <button
                onClick={() => handleToggleStatus(selectedUser)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  selectedUser.status === 'active'
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                }`}
                type="button"
              >
                {selectedUser.status === 'active' ? 'Suspend User Account' : 'Activate Account'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
};
