/**
 * BRANDX Admin — Organization & Team Access (/admin/admin-users)
 * Super Admin Full Team Control & Enterprise Role Management.
 * Comprehensive controls: View, Create, Edit Details, Role & Designation Assignment,
 * Activation/Suspension, Permanent Deletion, Password Reset, and Audit Logs.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { adminUsersService } from '../services/adminUsersService';
import { AdminUser, AdminRole } from '../types';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminModal } from '../components/AdminModal';
import { useAdminToast } from '../components/AdminToast';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminUsersManagementScreen: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { admin: currentAdmin } = useAdminAuth();
  const { showToast } = useAdminToast();

  const isSuperAdmin = (currentAdmin?.role || '').toUpperCase() === 'SUPER_ADMIN';

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    department: '',
    role: 'MANAGER' as AdminRole,
  });

  // Edit Details Modal State
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    admin: AdminUser | null;
    name: string;
    email: string;
    phone: string;
    designation: string;
    department: string;
    role: AdminRole;
    status: 'ACTIVE' | 'SUSPENDED';
    isProcessing: boolean;
  }>({
    isOpen: false,
    admin: null,
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    role: 'MANAGER',
    status: 'ACTIVE',
    isProcessing: false,
  });

  // Role Assignment Modal State
  const [roleEditModal, setRoleEditModal] = useState<{
    isOpen: boolean;
    admin: AdminUser | null;
    selectedRole: AdminRole;
    designation: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    admin: null,
    selectedRole: 'MANAGER',
    designation: '',
    isProcessing: false,
  });

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

  // Permanent Delete Modal State (Two-Step Safe Confirmation)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    admin: AdminUser | null;
    step: 1 | 2;
    confirmText: string;
    reason: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    admin: null,
    step: 1,
    confirmText: '',
    reason: '',
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
  const [auditModal, setAuditModal] = useState<{
    isOpen: boolean;
    targetAdmin: AdminUser | null;
    logs: any[];
    isLoading: boolean;
  }>({
    isOpen: false,
    targetAdmin: null,
    logs: [],
    isLoading: false,
  });

  const loadAdmins = async () => {
    setIsLoading(true);
    const list = await adminUsersService.getAdmins();
    setAdmins(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // Filtered admins based on search and filters
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone && a.phone.includes(q)) ||
        (a.designation && a.designation.toLowerCase().includes(q)) ||
        (a.department && a.department.toLowerCase().includes(q)) ||
        (a.role && a.role.toLowerCase().includes(q));

      const matchesRole =
        roleFilter === 'ALL' || (a.role || '').toUpperCase() === roleFilter.toUpperCase();

      const isActive = a.isActive !== false && a.status !== 'SUSPENDED';
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isActive) ||
        (statusFilter === 'SUSPENDED' && !isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [admins, searchQuery, roleFilter, statusFilter]);

  // Open Create Modal
  const openCreateModal = () => {
    setCreateForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      designation: '',
      department: '',
      role: 'MANAGER',
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create Team Member
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createForm.name.trim();
    const email = createForm.email.trim().toLowerCase();

    if (!name || name.length < 2) {
      showToast('Name must be at least 2 characters long', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await adminUsersService.createAdmin({
      name,
      email,
      password: createForm.password,
      role: createForm.role,
      phone: createForm.phone.trim() || undefined,
      designation: createForm.designation.trim() || undefined,
      department: createForm.department.trim() || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(`${createForm.role} account created successfully!`, 'success');
      setIsCreateModalOpen(false);
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to create team account', 'error');
    }
  };

  // Open Edit Details Modal
  const openEditModal = (admin: AdminUser) => {
    setEditModal({
      isOpen: true,
      admin,
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      designation: admin.designation || '',
      department: admin.department || '',
      role: (admin.role?.toUpperCase() as AdminRole) || 'MANAGER',
      status: admin.isActive !== false && admin.status !== 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
      isProcessing: false,
    });
  };

  // Submit Edit Details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.admin) return;

    const name = editModal.name.trim();
    const email = editModal.email.trim().toLowerCase();

    if (!name || name.length < 2) {
      showToast('Name must be at least 2 characters long', 'error');
      return;
    }
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setEditModal((prev) => ({ ...prev, isProcessing: true }));
    const res = await adminUsersService.updateAdmin(editModal.admin.id, {
      name,
      email,
      phone: editModal.phone.trim() || null,
      designation: editModal.designation.trim() || null,
      department: editModal.department.trim() || null,
      role: editModal.role,
      status: editModal.status,
      isActive: editModal.status === 'ACTIVE',
    });

    setEditModal((prev) => ({ ...prev, isProcessing: false }));

    if (res.success) {
      showToast(`Updated details for ${name} successfully!`, 'success');
      setEditModal((prev) => ({ ...prev, isOpen: false }));
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to update team member details', 'error');
    }
  };

  // Open Role Edit Modal
  const openRoleEditModal = (admin: AdminUser) => {
    if (currentAdmin?.id === admin.id) {
      showToast('Self-promotion or modifying your own role is strictly forbidden', 'error');
      return;
    }

    setRoleEditModal({
      isOpen: true,
      admin,
      selectedRole: (admin.role?.toUpperCase() as AdminRole) || 'MANAGER',
      designation: admin.designation || '',
      isProcessing: false,
    });
  };

  // Submit Role Change
  const handleConfirmRoleChange = async () => {
    if (!roleEditModal.admin) return;

    setRoleEditModal((prev) => ({ ...prev, isProcessing: true }));
    const target = roleEditModal.admin;

    const res = await adminUsersService.updateAdminRole(
      target.id,
      roleEditModal.selectedRole,
      roleEditModal.designation.trim() || undefined
    );
    setRoleEditModal((prev) => ({ ...prev, isProcessing: false, isOpen: false }));

    if (res.success) {
      showToast(`Role updated to ${roleEditModal.selectedRole} for ${target.name}`, 'success');
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to update role', 'error');
    }
  };

  // Prompt Status Change (Active / Suspended)
  const promptStatusChange = (admin: AdminUser) => {
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

  // Confirm Status Change
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

  // Open Permanent Delete Modal
  const openDeleteModal = (admin: AdminUser) => {
    if (currentAdmin?.id === admin.id) {
      showToast('Self-deletion is strictly blocked to protect account access', 'error');
      return;
    }
    const isSuper = (admin.role || '').toUpperCase() === 'SUPER_ADMIN';
    if (isSuper) {
      const activeSuperAdmins = admins.filter(
        (a) => (a.role || '').toUpperCase() === 'SUPER_ADMIN' && a.isActive !== false
      ).length;
      if (activeSuperAdmins <= 1) {
        showToast('Cannot delete the last remaining Super Admin account', 'error');
        return;
      }
    }

    setDeleteModal({
      isOpen: true,
      admin,
      step: 1,
      confirmText: '',
      reason: '',
      isProcessing: false,
    });
  };

  // Confirm Permanent Deletion
  const handleConfirmDelete = async () => {
    if (!deleteModal.admin) return;

    if (deleteModal.step === 1) {
      setDeleteModal((prev) => ({ ...prev, step: 2 }));
      return;
    }

    if (deleteModal.confirmText.trim() !== 'DELETE') {
      showToast('Please type DELETE in capital letters to confirm permanent removal', 'error');
      return;
    }

    setDeleteModal((prev) => ({ ...prev, isProcessing: true }));
    const target = deleteModal.admin;

    const res = await adminUsersService.deleteAdmin(target.id, deleteModal.reason || undefined);
    setDeleteModal((prev) => ({ ...prev, isProcessing: false, isOpen: false }));

    if (res.success) {
      showToast(`Account ${target.name} (${target.email}) permanently removed`, 'success');
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to delete team member', 'error');
    }
  };

  // Trigger Password Reset
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

  // Open Audit Modal for specific admin or global
  const openAuditModal = async (admin?: AdminUser) => {
    setAuditModal({
      isOpen: true,
      targetAdmin: admin || null,
      logs: [],
      isLoading: true,
    });

    const logs = await adminUsersService.getAuditLogs(admin?.id);
    setAuditModal((prev) => ({
      ...prev,
      logs,
      isLoading: false,
    }));
  };

  const columns: Column<AdminUser>[] = [
    {
      header: 'Team Member',
      render: (a) => {
        const normRole = (a.role || '').toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-700 to-emerald-800 flex items-center justify-center font-bold text-white text-xs border border-white/20 shrink-0 shadow-md">
              {a.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                {a.name}
                {normRole === 'SUPER_ADMIN' && (
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 font-mono font-bold">
                    Super Admin
                  </span>
                )}
                {normRole === 'COO' && (
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-mono font-bold">
                    Executive COO
                  </span>
                )}
                {normRole === 'CMO' && (
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-mono font-bold">
                    Executive CMO
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{a.email}</p>
              <p className="text-[10px] text-gray-500 font-mono">{a.phone || 'No phone'}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Department & Designation',
      render: (a) => (
        <div className="text-xs">
          <p className="font-semibold text-white truncate max-w-[200px]">
            {a.designation || (
              <span className="text-gray-500 italic">No designation set</span>
            )}
          </p>
          <p className="text-[11px] text-emerald-400/90 truncate max-w-[200px] mt-0.5">
            {a.department ? `📁 ${a.department}` : '📁 General'}
          </p>
        </div>
      ),
    },
    {
      header: 'System Role',
      render: (a) => {
        const normRole = (a.role || '').toUpperCase();
        const roleBadge =
          {
            SUPER_ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
            COO: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            CMO: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            ADMIN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            MANAGER: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
            ACCOUNTANT: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            CONTENT_MANAGER: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
            SUPPORT: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          }[normRole] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';

        return (
          <div className="flex items-center gap-1.5">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wider ${roleBadge}`}>
              {normRole.replace('_', ' ')}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Account Status',
      render: (a) => {
        const isActive = a.isActive !== false && a.status !== 'SUSPENDED';
        const isSelf = currentAdmin?.id === a.id;

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => promptStatusChange(a)}
              disabled={isSelf || !isSuperAdmin}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                isSelf || !isSuperAdmin
                  ? isActive
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 cursor-default'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20 cursor-default'
                  : isActive
                  ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/30'
                  : 'bg-rose-500/20 hover:bg-emerald-500/20 text-rose-300 hover:text-emerald-300 border border-rose-500/30 hover:border-emerald-500/30'
              }`}
              title={
                !isSuperAdmin
                  ? 'Only Super Admin can change account status'
                  : isSelf
                  ? 'Cannot modify your own status'
                  : isActive
                  ? 'Click to Suspend Account'
                  : 'Click to Activate Account'
              }
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">
                {isActive ? 'check_circle' : 'block'}
              </span>
              <span>{isActive ? 'Active' : 'Suspended'}</span>
            </button>
          </div>
        );
      },
    },
    {
      header: 'Activity & Session',
      render: (a) => (
        <div className="text-xs">
          <p className="text-gray-300">{a.lastLogin || 'Never logged in'}</p>
          <p className="text-[10px] text-gray-500">Joined: {a.createdAt || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Administrative Actions',
      render: (a) => {
        const normRole = (a.role || '').toUpperCase();
        const isSelf = currentAdmin?.id === a.id;
        const isRootSuper = normRole === 'SUPER_ADMIN';

        return (
          <div className="flex items-center gap-1.5">
            {/* Edit Details */}
            {isSuperAdmin && (
              <button
                onClick={() => openEditModal(a)}
                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/20 transition-colors"
                title="Edit Team Member Details"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
              </button>
            )}

            {/* Change Role & Designation */}
            {isSuperAdmin && !isSelf && (
              <button
                onClick={() => openRoleEditModal(a)}
                className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/20 transition-colors"
                title="Change Role & Designation"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">badge</span>
              </button>
            )}

            {/* Password Reset */}
            {isSuperAdmin && (
              <button
                onClick={() => handleTriggerPasswordReset(a)}
                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/20 transition-colors"
                title="Reset Password / Generate Credentials"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">key</span>
              </button>
            )}

            {/* Audit History */}
            <button
              onClick={() => openAuditModal(a)}
              className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-500/20 transition-colors"
              title="View Account Audit History"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">history</span>
            </button>

            {/* Permanent Delete */}
            {isSuperAdmin && !isSelf && (
              <button
                onClick={() => openDeleteModal(a)}
                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-colors"
                title="Permanently Delete Team Member"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">delete_forever</span>
              </button>
            )}
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
            Enterprise full-team administration: SUPER_ADMIN, COO, CMO, Manager, Content Manager, and Finance accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAuditModal()}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 font-bold text-xs flex items-center gap-1.5 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">history_edu</span>
            <span>Audit Trail</span>
          </button>
          {isSuperAdmin && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#0E1424] p-3 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone, designation, or role..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL" className="bg-[#0E1424]">All Roles</option>
            <option value="SUPER_ADMIN" className="bg-[#0E1424]">Super Admin</option>
            <option value="COO" className="bg-[#0E1424]">COO (Operations)</option>
            <option value="CMO" className="bg-[#0E1424]">CMO (Marketing)</option>
            <option value="ADMIN" className="bg-[#0E1424]">Admin</option>
            <option value="MANAGER" className="bg-[#0E1424]">Manager</option>
            <option value="CONTENT_MANAGER" className="bg-[#0E1424]">Content Manager</option>
            <option value="ACCOUNTANT" className="bg-[#0E1424]">Accountant / Finance</option>
            <option value="SUPPORT" className="bg-[#0E1424]">Support</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL" className="bg-[#0E1424]">All Status</option>
            <option value="ACTIVE" className="bg-[#0E1424]">Active Only</option>
            <option value="SUSPENDED" className="bg-[#0E1424]">Suspended Only</option>
          </select>

          <button
            onClick={loadAdmins}
            className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors"
            title="Refresh List"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Team Table */}
      <AdminTable
        columns={columns}
        data={filteredAdmins}
        isLoading={isLoading}
        emptyMessage="No matching team accounts found."
      />

      {/* Create Team Member Modal */}
      {isCreateModalOpen && (
        <AdminModal
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Team Member"
          maxWidth="md"
        >
          <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Official Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@brandx.in"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Designation / Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Operations Executive"
                  value={createForm.designation}
                  onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operations & Support"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  System Role <span className="text-rose-400">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as AdminRole })}
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

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 00000"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Initial Password <span className="text-rose-400">*</span> (min 6 chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Strong initial password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Password will be securely hashed with bcrypt before saving to PostgreSQL.
              </p>
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
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Edit Details Modal */}
      {editModal.isOpen && editModal.admin && (
        <AdminModal
          isOpen={true}
          onClose={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
          title={`Edit Profile — ${editModal.admin.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editModal.email}
                  onChange={(e) => setEditModal({ ...editModal, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editModal.phone}
                  onChange={(e) => setEditModal({ ...editModal, phone: e.target.value })}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editModal.department}
                  onChange={(e) => setEditModal({ ...editModal, department: e.target.value })}
                  placeholder="e.g. Operations / Growth"
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Designation / Job Title
              </label>
              <input
                type="text"
                value={editModal.designation}
                onChange={(e) => setEditModal({ ...editModal, designation: e.target.value })}
                placeholder="e.g. Chief Operating Officer (COO)"
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Display title visible across organizational hierarchy and team directories.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  System Role
                </label>
                <select
                  value={editModal.role}
                  onChange={(e) => setEditModal({ ...editModal, role: e.target.value as AdminRole })}
                  disabled={currentAdmin?.id === editModal.admin.id}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="SUPER_ADMIN" className="bg-[#0E1424]">SUPER_ADMIN</option>
                  <option value="COO" className="bg-[#0E1424]">COO (Chief Operating Officer)</option>
                  <option value="CMO" className="bg-[#0E1424]">CMO (Chief Marketing Officer)</option>
                  <option value="ADMIN" className="bg-[#0E1424]">ADMIN (General Administration)</option>
                  <option value="MANAGER" className="bg-[#0E1424]">MANAGER (Store &amp; Customer Ops)</option>
                  <option value="CONTENT_MANAGER" className="bg-[#0E1424]">CONTENT_MANAGER (Posters &amp; CMS)</option>
                  <option value="ACCOUNTANT" className="bg-[#0E1424]">ACCOUNTANT (Finances &amp; Refunds)</option>
                  <option value="SUPPORT" className="bg-[#0E1424]">SUPPORT (Customer Support)</option>
                </select>
                {currentAdmin?.id === editModal.admin.id && (
                  <p className="text-[10px] text-amber-400 mt-1">Self-role changes are blocked.</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Account Status
                </label>
                <select
                  value={editModal.status}
                  onChange={(e) => setEditModal({ ...editModal, status: e.target.value as any })}
                  disabled={currentAdmin?.id === editModal.admin.id}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                >
                  <option value="ACTIVE" className="bg-[#0E1424]">ACTIVE (Portal Access Granted)</option>
                  <option value="SUSPENDED" className="bg-[#0E1424]">SUSPENDED (Sessions Blocked)</option>
                </select>
                {currentAdmin?.id === editModal.admin.id && (
                  <p className="text-[10px] text-amber-400 mt-1">Self-deactivation is blocked.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editModal.isProcessing}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold disabled:opacity-50"
              >
                {editModal.isProcessing ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}

      {/* Role & Designation Assignment Modal */}
      {roleEditModal.isOpen && roleEditModal.admin && (
        <AdminModal
          isOpen={true}
          onClose={() => setRoleEditModal((prev) => ({ ...prev, isOpen: false }))}
          title={`Assign Role & Designation — ${roleEditModal.admin.name}`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Select System Role
              </label>
              <select
                value={roleEditModal.selectedRole}
                onChange={(e) => setRoleEditModal({ ...roleEditModal, selectedRole: e.target.value as AdminRole })}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="SUPER_ADMIN" className="bg-[#0E1424]">SUPER_ADMIN (Full Platform Control)</option>
                <option value="COO" className="bg-[#0E1424]">COO (Chief Operating Officer)</option>
                <option value="CMO" className="bg-[#0E1424]">CMO (Chief Marketing Officer)</option>
                <option value="ADMIN" className="bg-[#0E1424]">ADMIN (General Administration)</option>
                <option value="MANAGER" className="bg-[#0E1424]">MANAGER (Store &amp; Customer Ops)</option>
                <option value="CONTENT_MANAGER" className="bg-[#0E1424]">CONTENT_MANAGER (Posters &amp; CMS)</option>
                <option value="ACCOUNTANT" className="bg-[#0E1424]">ACCOUNTANT (Finances &amp; Refunds)</option>
                <option value="SUPPORT" className="bg-[#0E1424]">SUPPORT (Customer Support)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Displayed Designation
              </label>
              <input
                type="text"
                value={roleEditModal.designation}
                onChange={(e) => setRoleEditModal({ ...roleEditModal, designation: e.target.value })}
                placeholder="e.g. Chief Operating Officer (COO)"
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Role determines backend permissions. Designation determines public display.
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-gray-300 space-y-1">
              <p className="font-semibold text-white">Permission Scope:</p>
              {roleEditModal.selectedRole === 'COO' && (
                <p className="text-blue-300">
                  • Executive Operations: Full access to Subscriptions, Payments, Users, Businesses, Revenue reports, Team management, and Audit logs.
                </p>
              )}
              {roleEditModal.selectedRole === 'CMO' && (
                <p className="text-purple-300">
                  • Executive Marketing: Approved Revenue &amp; Subscribers analytics, Posters library, Festivals, Campaigns, Announcements.
                </p>
              )}
              {roleEditModal.selectedRole === 'MANAGER' && (
                <p className="text-cyan-300">
                  • Operations: Users, Businesses, Referrals, Invoices, Khata. Blocked from Revenue and Team controls.
                </p>
              )}
              {roleEditModal.selectedRole === 'CONTENT_MANAGER' && (
                <p className="text-fuchsia-300">
                  • Content: Daily Status, Posters, Festivals, Categories. Strictly blocked from financial and user account data.
                </p>
              )}
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
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all disabled:opacity-50"
              >
                {roleEditModal.isProcessing ? 'Updating...' : 'Confirm Role Change'}
              </button>
            </div>
          </div>
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
            <div
              className={`p-3.5 rounded-xl border ${
                confirmStatusModal.nextStatus === 'SUSPENDED'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              }`}
            >
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
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Reason for Audit Log (Optional)
              </label>
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
                className={`px-5 py-2 rounded-xl font-bold text-white transition-all disabled:opacity-50 ${
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

      {/* Permanent Delete Modal (Two-Step Explicit Confirmation) */}
      {deleteModal.isOpen && deleteModal.admin && (
        <AdminModal
          isOpen={true}
          onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
          title={
            deleteModal.step === 1
              ? `Permanently Delete Account — Step 1 of 2`
              : `Final Confirmation — Permanent Account Deletion`
          }
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-200">
              <p className="font-bold text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400 text-[18px]">warning</span>
                Destructive &amp; Irreversible Operation
              </p>
              <p className="mt-2 text-[11px] leading-relaxed">
                Target: <strong className="text-white">{deleteModal.admin.name}</strong> (
                <span className="font-mono text-gray-300">{deleteModal.admin.email}</span>)
                <br />
                Role: <span className="font-bold text-white">{deleteModal.admin.role}</span>
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-rose-300/90">
                • All active sessions and tokens will be permanently revoked immediately.
                <br />
                • Login access will be permanently disabled.
                <br />
                • Financial records, transactions, invoices, and Khata ledger remain fully preserved.
                <br />
                • <strong>This operation cannot be undone.</strong>
              </p>
            </div>

            {deleteModal.step === 1 ? (
              <div>
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                  Reason for Removal (Required for Audit Trail)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Employee offboarded / Account retired"
                  value={deleteModal.reason}
                  onChange={(e) => setDeleteModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            ) : (
              <div>
                <label className="block font-bold text-rose-300 uppercase tracking-wider mb-1">
                  Type <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  placeholder="Type DELETE in capital letters"
                  value={deleteModal.confirmText}
                  onChange={(e) => setDeleteModal((prev) => ({ ...prev, confirmText: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-rose-500/50 rounded-xl text-white font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  deleteModal.isProcessing ||
                  (deleteModal.step === 2 && deleteModal.confirmText.trim() !== 'DELETE')
                }
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white transition-all disabled:opacity-40"
              >
                {deleteModal.isProcessing
                  ? 'Deleting...'
                  : deleteModal.step === 1
                  ? 'Proceed to Confirmation'
                  : 'Permanently Delete Account'}
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
              <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">
                Temporary Password
              </label>
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
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shrink-0 flex items-center gap-1"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  <span>Copy</span>
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
      {auditModal.isOpen && (
        <AdminModal
          isOpen={true}
          onClose={() => setAuditModal((prev) => ({ ...prev, isOpen: false }))}
          title={
            auditModal.targetAdmin
              ? `Audit Trail — ${auditModal.targetAdmin.name} (${auditModal.targetAdmin.email})`
              : 'Administrative & Security Audit Trail'
          }
          maxWidth="lg"
        >
          <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto custom-scrollbar">
            {auditModal.isLoading ? (
              <p className="text-center text-gray-400 py-8">Loading audit trail...</p>
            ) : auditModal.logs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No audit logs recorded for this account yet.</p>
            ) : (
              auditModal.logs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-emerald-400">{log.action}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        ({log.entity || 'System'})
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-300 mt-1 break-all">
                      {log.metadata
                        ? typeof log.metadata === 'string'
                          ? log.metadata
                          : JSON.stringify(log.metadata)
                        : 'Action executed'}
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
