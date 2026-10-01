/**
 * BRANDX Admin Accounts & Roles Screen (/admin/admin-users)
 * Super Admin management of Manager, Accountant, and Operator accounts.
 * Connects directly to backend PostgreSQL with bcrypt hashing and active status toggling.
 */

import React, { useEffect, useState } from 'react';
import { adminUsersService } from '../services/adminUsersService';
import { AdminUser, AdminRole } from '../types';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminModal } from '../components/AdminModal';
import { useAdminToast } from '../components/AdminToast';

export const AdminUsersManagementScreen: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useAdminToast();

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'MANAGER' | 'ACCOUNTANT' | 'CONTENT_MANAGER' | 'SUPPORT'>('MANAGER');
  const [formPhone, setFormPhone] = useState('');

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
    setIsModalOpen(true);
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
      role: formRole,
      phone: phone || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(`${formRole} account created successfully!`);
      setIsModalOpen(false);
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to create admin user', 'error');
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    const isSuper = admin.role === 'SUPER_ADMIN' || admin.role === 'super_admin';
    if (isSuper) {
      showToast('Super Admin account status cannot be modified', 'error');
      return;
    }

    const currentActive = admin.isActive !== false && admin.status !== 'SUSPENDED' && admin.status !== 'suspended';
    const nextStatus = currentActive ? 'SUSPENDED' : 'ACTIVE';
    const nextActive = !currentActive;

    const res = await adminUsersService.updateAdminStatus(admin.id, nextStatus, nextActive);
    if (res.success) {
      showToast(`Admin ${admin.name} is now ${nextStatus}`);
      loadAdmins();
    } else {
      showToast(res.error || 'Failed to update status', 'error');
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      header: 'Admin Member',
      render: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center font-bold text-white text-xs border border-white/20 shrink-0">
            {a.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-xs truncate flex items-center gap-1.5">
              {a.name}
              {(a.role === 'SUPER_ADMIN' || a.role === 'super_admin') && (
                <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                  Primary Root
                </span>
              )}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{a.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role & Access',
      render: (a) => {
        const normRole = (a.role || '').toUpperCase();
        const roleBadge = {
          SUPER_ADMIN: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          ADMIN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          MANAGER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          ACCOUNTANT: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          CONTENT_MANAGER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          SUPPORT: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        }[normRole] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';

        const roleDesc = {
          SUPER_ADMIN: 'Full Platform Access',
          MANAGER: 'Operations & Content CMS',
          ACCOUNTANT: 'Finances & Refunds',
          CONTENT_MANAGER: 'Banners & Festivals',
          SUPPORT: 'Customer Support',
          ADMIN: 'General Administration',
        }[normRole] || 'Staff Member';

        return (
          <div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleBadge}`}>
              {normRole.replace('_', ' ')}
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5">{roleDesc}</p>
          </div>
        );
      },
    },
    {
      header: 'Contact',
      render: (a) => <span className="font-mono text-xs text-gray-300">{a.phone || '—'}</span>,
    },
    {
      header: 'Last Login',
      render: (a) => <span className="text-xs text-gray-300">{a.lastLogin || 'Never'}</span>,
    },
    {
      header: 'Status & Action',
      render: (a) => {
        const isSuper = a.role === 'SUPER_ADMIN' || a.role === 'super_admin';
        const isActive = a.isActive !== false && a.status !== 'SUSPENDED' && a.status !== 'suspended';

        if (isSuper) {
          return (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Active (Protected)
            </span>
          );
        }

        return (
          <button
            onClick={() => handleToggleStatus(a)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/30'
                : 'bg-rose-500/20 hover:bg-emerald-500/20 text-rose-300 hover:text-emerald-300 border border-rose-500/30 hover:border-emerald-500/30'
            }`}
            title={isActive ? 'Click to Suspend Account' : 'Click to Activate Account'}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">
              {isActive ? 'check_circle' : 'block'}
            </span>
            <span>{isActive ? 'Active' : 'Suspended'}</span>
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">admin_panel_settings</span>
            Admin Team &amp; RBAC Control
          </h3>
          <p className="text-xs text-gray-400">
            Create and manage Manager and Accountant staff with secure credentials and real-time suspension.
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Add Admin Member</span>
        </button>
      </div>

      <AdminTable columns={columns} data={admins} isLoading={isLoading} emptyMessage="No admin accounts found." />

      {/* Invite Modal */}
      {isModalOpen && (
        <AdminModal isOpen={true} onClose={() => setIsModalOpen(false)} title="Create New Administrative Member" maxWidth="md">
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
                <label className="block font-bold text-gray-300 uppercase tracking-wider mb-1">Role Assigned</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="MANAGER" className="bg-[#0E1424]">MANAGER (Operations &amp; Content)</option>
                  <option value="ACCOUNTANT" className="bg-[#0E1424]">ACCOUNTANT (Finances &amp; Refunds)</option>
                  <option value="CONTENT_MANAGER" className="bg-[#0E1424]">CONTENT_MANAGER (Posters &amp; Festivals)</option>
                  <option value="SUPPORT" className="bg-[#0E1424]">SUPPORT (Customer Support)</option>
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
              {formRole === 'MANAGER' && (
                <p className="text-blue-300">
                  • Operational access: Users, Businesses, CMS, Announcements, Reports. Blocked from Finances, Payments, and Admin Management.
                </p>
              )}
              {formRole === 'ACCOUNTANT' && (
                <p className="text-amber-300">
                  • Financial access: Revenue, Payments, Subscribers, Refunds, Financial Reports. Blocked from Users, Businesses, CMS, and Admin Management.
                </p>
              )}
              {formRole === 'CONTENT_MANAGER' && (
                <p className="text-purple-300">
                  • CMS access: Daily Status, Posters, Festivals, Categories.
                </p>
              )}
              {formRole === 'SUPPORT' && (
                <p className="text-cyan-300">
                  • Support access: View users and catalog. Read-only.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Admin Account'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
};
