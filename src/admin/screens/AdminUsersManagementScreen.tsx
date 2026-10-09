/**
 * BRANDX Admin — Organization & Team Access (/admin/admin-users)
 * Super Admin & Executive management of COO, CMO, Manager, Content Manager, and Finance accounts.
 * Server-enforced role assignments, confirmable deactivations, and secure credential resets.
 */

import React, { useEffect, useState } from 'react';
import { adminUsersService } from '../services/adminUsersService';
import { AdminUser, AdminRole } from '../types';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminModal } from '../components/AdminModal';
import { useAdminToast } from '../components/AdminToast';
import { useAdminAuth } from '../context/AdminAuthContext';
import { API_BASE_URL } from '../../config/env';

export const AdminUsersManagementScreen: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { admin: currentAdmin } = useAdminAuth();
  const { showToast } = useAdminToast();

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<AdminRole>('MANAGER');
  const [formPhone, setFormPhone] = useState('');

  // Status Change Confirmation Modal State
  const [confirmStatusModal, setConfirmStatusModal] = useState<{
    isOpen: boolean;
    admin: AdminUser | null;
    nextStatus: 'ACTIVE' | 'SUSPENDED';
    reason: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    admin: null,
    nextStatus: 'SUSPENDED',
    reason: '',
    isProcessing: false,
  });

  // Role Edit Modal State
  const [roleEditModal, setRoleEditModal] = useState<{
    isOpen: boolean;
    admin: AdminUser | null;
    selectedRole: AdminRole;
    isProcessing: boolean;
  }>({
    isOpen: false,
    admin: null,
    selectedRole: 'MANAGER',
    isProcessing: false,
  });

  // Password Reset Result Modal State
  const [resetResultModal, setResetResultModal] = useState<{
    isOpen: boolean;
    email: string;
    tempPassword: string;
  }>({
    isOpen: false,
    email: '',
    tempPassword: '',
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadAdmins = async () => {
    setIsLoading(true);
    const list = await adminUsersService.getAdmins();
    setAdmins(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const openNewModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('MANAGER');
    setFormPhone('');
    setIsCreateModalOpen(true);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    const email = formEmail.trim().toLowerCase();
    const phone = formPhone.trim();

    if (!name || name.length < 2) {
      showToast('Name must be at least 2 characters long', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await adminUsersService.createAdmin({
      name,
      email,
      password: formPassword,
      role: formRole as any,
      phone: phone || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(`${formRole} account created successfully!`, 'success');
      setIsCreateModalOpen(false);
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to create team account', 'error');
    }
  };

  const promptStatusChange = (admin: AdminUser) => {
    const isSuper = (admin.role || '').toUpperCase() === 'SUPER_ADMIN';
    if (isSuper) {
      showToast('Root Super Admin account status cannot be modified', 'error');
      return;
    }

    if (currentAdmin?.id === admin.id) {
      showToast('Self-deactivation is strictly blocked to prevent administrative lockout', 'error');
      return;
    }

    const currentActive = admin.isActive !== false && admin.status !== 'SUSPENDED';
    const nextStatus = currentActive ? 'SUSPENDED' : 'ACTIVE';

    setConfirmStatusModal({
      isOpen: true,
      admin,
      nextStatus,
      reason: '',
      isProcessing: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmStatusModal.admin) return;

    setConfirmStatusModal((prev) => ({ ...prev, isProcessing: true }));
    const target = confirmStatusModal.admin;
    const nextActive = confirmStatusModal.nextStatus === 'ACTIVE';

    const res = await adminUsersService.updateAdminStatus(
      target.id,
      confirmStatusModal.nextStatus,
      nextActive,
      confirmStatusModal.reason || undefined
    );

    setConfirmStatusModal((prev) => ({ ...prev, isProcessing: false, isOpen: false }));

    if (res.success) {
      showToast(
        `Account ${target.name} (${target.email}) is now ${confirmStatusModal.nextStatus}`,
        confirmStatusModal.nextStatus === 'ACTIVE' ? 'success' : 'info'
      );
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to update status', 'error');
    }
  };

  const promptRoleChange = (admin: AdminUser) => {
    if (currentAdmin?.id === admin.id) {
      showToast('Self-promotion or modifying your own role is strictly forbidden', 'error');
      return;
    }
    if ((admin.role || '').toUpperCase() === 'SUPER_ADMIN') {
      showToast('Super Admin role cannot be modified', 'error');
      return;
    }

    setRoleEditModal({
      isOpen: true,
      admin,
      selectedRole: (admin.role?.toUpperCase() as AdminRole) || 'MANAGER',
      isProcessing: false,
    });
  };

  const handleConfirmRoleChange = async () => {
    if (!roleEditModal.admin) return;

    setRoleEditModal((prev) => ({ ...prev, isProcessing: true }));
    const target = roleEditModal.admin;

    const res = await adminUsersService.updateAdminRole(target.id, roleEditModal.selectedRole);
    setRoleEditModal((prev) => ({ ...prev, isProcessing: false, isOpen: false }));

    if (res.success) {
      showToast(`Role updated to ${roleEditModal.selectedRole} for ${target.name}`, 'success');
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to update role', 'error');
    }
  };

  const handleTriggerPasswordReset = async (admin: AdminUser) => {
    if (!window.confirm(`Generate secure temporary credentials for ${admin.name} (${admin.email})?`)) {
      return;
    }

    const res = await adminUsersService.resetAdminPassword(admin.id);
    if (res.success && res.temporaryPassword) {
      setResetResultModal({
        isOpen: true,
        email: admin.email,
        tempPassword: res.temporaryPassword,
      });
      showToast('Temporary credentials generated successfully', 'success');
    } else {
      showToast(res.error || 'Failed to trigger password reset', 'error');
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    setShowAuditModal(true);
    try {
      const token = localStorage.getItem('brandx_admin_token');
      const res = await fetch(`${API_BASE_URL}/admin/audit-logs?limit=50`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setAuditLogs(json.data);
      }
    } catch {
      showToast('Failed to load audit logs', 'error');
    } finally {
      setLoadingAudit(false);
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      header: 'Team Member',
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-700 to-emerald-800 flex items-center justify-center font-bold text-white text-xs border border-white/20 shrink-0 shadow-md">
            {a.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-xs truncate flex items-center gap-1.5">
              {a.name}
              {(a.role === 'SUPER_ADMIN' || a.role === 'super_admin') && (
                <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-mono">
                  Primary Root
                </span>
              )}
              {(a.role === 'COO' || a.role === 'coo') && (
                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-mono">
                  Executive
                </span>
              )}
              {(a.role === 'CMO' || a.role === 'cmo') && (
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-mono">
                  Executive
                </span>
              )}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{a.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Position',
      render: (a) => {
        const normRole = (a.role || '').toUpperCase();
        const roleBadge = {
          SUPER_ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          COO: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          CMO: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          ADMIN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          MANAGER: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          ACCOUNTANT: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          CONTENT_MANAGER: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
          SUPPORT: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        }[normRole] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';

        const roleDesc = {
          SUPER_ADMIN: 'Full Platform Admin',
          COO: 'Chief Operating Officer (Operations & Subscriptions)',
          CMO: 'Chief Marketing Officer (Marketing & Revenue Analytics)',
          ADMIN: 'General Administration',
          MANAGER: 'Operations & Store Support',
          ACCOUNTANT: 'Finances & Invoicing',
          CONTENT_MANAGER: 'Daily Status & Posters CMS',
          SUPPORT: 'Customer Support',
        }[normRole] || 'Staff Member';

        const canEditRole = currentAdmin?.role === 'SUPER_ADMIN' && normRole !== 'SUPER_ADMIN' && a.id !== currentAdmin?.id;

        return (
          <div className="flex items-center gap-2">
            <div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleBadge}`}>
                {normRole.replace('_', ' ')}
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">{roleDesc}</p>
            </div>
            {canEditRole && (
              <button
                onClick={() => promptRoleChange(a)}
                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                title="Change Role"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: 'Contact & Account',
      render: (a) => (
        <div className="text-xs">
          <p className="font-mono text-gray-200">{a.phone || '—'}</p>
          <p className="text-[10px] text-gray-400">Created: {a.createdAt || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Last Session',
      render: (a) => <span className="text-xs text-gray-300">{a.lastLogin || 'Never logged in'}</span>,
    },
    {
      header: 'Account Status & Access',
      render: (a) => {
        const isSuper = (a.role || '').toUpperCase() === 'SUPER_ADMIN';
        const isActive = a.isActive !== false && a.status !== 'SUSPENDED';

        if (isSuper) {
          return (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Active (Protected Root)
            </span>
          );
        }

        const isSelf = currentAdmin?.id === a.id;

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => promptStatusChange(a)}
              disabled={isSelf}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                isSelf
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 opacity-70 cursor-not-allowed'
                  : isActive
                  ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/30'
                  : 'bg-rose-500/20 hover:bg-emerald-500/20 text-rose-300 hover:text-emerald-300 border border-rose-500/30 hover:border-emerald-500/30'
              }`}
              title={isSelf ? 'Cannot modify your own status' : isActive ? 'Click to Suspend Account' : 'Click to Activate Account'}
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isActive ? 'check_circle' : 'block'}
              </span>
              <span>{isActive ? 'Active' : 'Suspended'}</span>
            </button>

            <button
              onClick={() => handleTriggerPasswordReset(a)}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white border border-white/10 text-[11px] font-medium flex items-center gap-1"
              title="Reset Password / Generate Credentials"
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">key</span>
              <span>Reset</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">shield_person</span>
            Organization &amp; Team Access Control
          </h3>
          <p className="text-xs text-gray-400">
            Enterprise RBAC for COO, CMO, Managers, and administrative team members with server-enforced access controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAuditLogs}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 font-bold text-xs flex items-center gap-1.5 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">history_edu</span>
            <span>Audit Trail</span>
          </button>
          <button
            onClick={openNewModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Team Table */}
      <AdminTable columns={columns} data={admins} isLoading={isLoading} emptyMessage="No team accounts found." />

      {/* Create Team Member Modal */}
      {isCreateModalOpen && (
        <AdminModal isOpen={true} onClose={() => setIsCreateModalOpen(false)} title="Create New Administrative Member" maxWidth="md">
          <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Official Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh.ops@brandx.in"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Password (min 6 chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Strong temporary or permanent password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Password will be securely hashed with bcrypt before saving to PostgreSQL.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Assigned Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="COO" className="bg-[#0E1424]">COO (Chief Operating Officer)</option>
                  <option value="CMO" className="bg-[#0E1424]">CMO (Chief Marketing Officer)</option>
                  <option value="ADMIN" className="bg-[#0E1424]">ADMIN (General Administration)</option>
                  <option value="MANAGER" className="bg-[#0E1424]">MANAGER (Store &amp; Customer Ops)</option>
                  <option value="CONTENT_MANAGER" className="bg-[#0E1424]">CONTENT_MANAGER (Posters &amp; CMS)</option>
                  <option value="ACCOUNTANT" className="bg-[#0E1424]">ACCOUNTANT (Finances &amp; Refunds)</option>
                  <option value="SUPPORT" className="bg-[#0E1424]">SUPPORT (Customer Care)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-gray-300 space-y-1">
              <p className="font-semibold text-white">Role Privileges:</p>
              {formRole === 'COO' && (
                <p className="text-blue-300">
                  • Executive Operations: Subscriptions, Payments, Users, Businesses, Revenue reports, Team management, Audit logs.
                </p>
              )}
              {formRole === 'CMO' && (
                <p className="text-purple-300">
                  • Executive Marketing: Approved Revenue &amp; Subscribers analytics, Posters library, Festivals, Campaigns, Announcements. No raw payment secrets.
                </p>
              )}
              {formRole === 'MANAGER' && (
                <p className="text-cyan-300">
                  • Operational access: Users, Businesses, CMS, Referrals, Invoices, Khata. Blocked from Revenue and Team controls.
                </p>
              )}
              {formRole === 'CONTENT_MANAGER' && (
                <p className="text-fuchsia-300">
                  • CMS access: Daily Status, Posters, Festivals, Categories. Strictly blocked from financial and user account data.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Team Account'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Confirmation Modal for Account Status (Suspension / Activation) */}
      {confirmStatusModal.isOpen && confirmStatusModal.admin && (
        <AdminModal
          isOpen={true}
          onClose={() => setConfirmStatusModal((prev) => ({ ...prev, isOpen: false }))}
          title={`Confirm Account ${confirmStatusModal.nextStatus === 'ACTIVE' ? 'Activation' : 'Suspension'}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className={`p-3.5 rounded-xl border ${
              confirmStatusModal.nextStatus === 'SUSPENDED'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}>
              <p className="font-bold text-sm">
                {confirmStatusModal.nextStatus === 'SUSPENDED'
                  ? 'Immediate Session Invalidation'
                  : 'Re-activate Account Access'}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed">
                {confirmStatusModal.nextStatus === 'SUSPENDED'
                  ? `Are you sure you want to suspend ${confirmStatusModal.admin.name} (${confirmStatusModal.admin.email})? All active tokens and sessions will be immediately rejected at the server level.`
                  : `Are you sure you want to restore full portal access for ${confirmStatusModal.admin.name} (${confirmStatusModal.admin.email})?`}
              </p>
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Reason for Audit Log (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Role rotation / Departure / Reinstated"
                value={confirmStatusModal.reason}
                onChange={(e) => setConfirmStatusModal((prev) => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmStatusModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={confirmStatusModal.isProcessing}
                className={`px-5 py-2 rounded-xl font-bold text-white transition-all ${
                  confirmStatusModal.nextStatus === 'SUSPENDED'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {confirmStatusModal.isProcessing
                  ? 'Updating...'
                  : confirmStatusModal.nextStatus === 'SUSPENDED'
                  ? 'Confirm Suspension'
                  : 'Confirm Activation'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Role Assignment Modal */}
      {roleEditModal.isOpen && roleEditModal.admin && (
        <AdminModal
          isOpen={true}
          onClose={() => setRoleEditModal((prev) => ({ ...prev, isOpen: false }))}
          title={`Assign Role — ${roleEditModal.admin.name}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Select New Authorized Role</label>
              <select
                value={roleEditModal.selectedRole}
                onChange={(e) => setRoleEditModal((prev) => ({ ...prev, selectedRole: e.target.value as AdminRole }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="COO" className="bg-[#0E1424]">COO (Chief Operating Officer)</option>
                <option value="CMO" className="bg-[#0E1424]">CMO (Chief Marketing Officer)</option>
                <option value="ADMIN" className="bg-[#0E1424]">ADMIN (General Administration)</option>
                <option value="MANAGER" className="bg-[#0E1424]">MANAGER (Store &amp; Customer Ops)</option>
                <option value="CONTENT_MANAGER" className="bg-[#0E1424]">CONTENT_MANAGER (Posters &amp; CMS)</option>
                <option value="ACCOUNTANT" className="bg-[#0E1424]">ACCOUNTANT (Finances &amp; Refunds)</option>
                <option value="SUPPORT" className="bg-[#0E1424]">SUPPORT (Customer Support)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRoleEditModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={roleEditModal.isProcessing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all"
              >
                {roleEditModal.isProcessing ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Temporary Password Display Modal */}
      {resetResultModal.isOpen && (
        <AdminModal
          isOpen={true}
          onClose={() => setResetResultModal((prev) => ({ ...prev, isOpen: false }))}
          title="Temporary Credentials Generated"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-200">
              <p className="font-bold text-sm">Credentials for {resetResultModal.email}</p>
              <p className="mt-1 text-[11px]">
                Please copy and securely deliver these credentials to the team member.
              </p>
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Temporary Password</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resetResultModal.tempPassword}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-emerald-400 font-mono font-bold select-all focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resetResultModal.tempPassword);
                    showToast('Copied to clipboard!', 'success');
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shrink-0"
                  type="button"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setResetResultModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Audit Log Modal */}
      {showAuditModal && (
        <AdminModal
          isOpen={true}
          onClose={() => setShowAuditModal(false)}
          title="Administrative & Security Audit Trail"
          maxWidth="lg"
        >
          <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto custom-scrollbar">
            {loadingAudit ? (
              <p className="text-center text-gray-400 py-8">Loading audit trail...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No audit logs recorded yet.</p>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-emerald-400">{log.action}</span>
                      <span className="text-[10px] text-gray-400 font-normal">({log.entity || 'System'})</span>
                    </p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      {log.metadata ? JSON.stringify(log.metadata) : 'Action executed'}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </AdminModal>
      )}
    </div>
  );
};
