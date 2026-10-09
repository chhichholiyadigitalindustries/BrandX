/**
 * BRANDX Admin Accounts & Role Management Service
 * Directly interacts with PostgreSQL AdminUser database via backend API.
 * Super Admin unrestricted team administration.
 */

import { AdminUser, AdminRole } from '../types';
import { adminAuthService } from './adminAuthService';
import { API_BASE_URL } from '../../config/env';

export const adminUsersService = {
  /**
   * Fetch all real admin users from backend PostgreSQL
   */
  async getAdmins(): Promise<AdminUser[]> {
    const token = adminAuthService.getAdminToken();
    try {
      const response = await fetch(`${API_BASE_URL}/admin/admin-users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.data) {
        return (json.data || []).map((admin: any) => ({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role as AdminRole,
          designation: admin.designation || undefined,
          department: admin.department || undefined,
          avatarUrl:
            admin.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          phone: admin.phone || '',
          status: admin.status || (admin.isActive ? 'ACTIVE' : 'SUSPENDED'),
          isActive: admin.isActive !== false && admin.status !== 'SUSPENDED',
          permissions: admin.permissions || [],
          createdBy: admin.createdBy,
          lastLogin: admin.lastLoginAt
            ? new Date(admin.lastLoginAt).toLocaleString()
            : admin.lastLogin
            ? new Date(admin.lastLogin).toLocaleString()
            : 'Never logged in',
          createdAt: admin.createdAt
            ? new Date(admin.createdAt).toISOString().split('T')[0]
            : 'N/A',
        }));
      }
    } catch (err) {
      console.error('[adminUsersService] getAdmins error:', err);
    }
    return [];
  },

  /**
   * Create a new administrative team member (Super Admin only)
   */
  async createAdmin(data: {
    name: string;
    email: string;
    password: string;
    role: AdminRole;
    phone?: string;
    designation?: string;
    department?: string;
  }): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
    const token = adminAuthService.getAdminToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/admin-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.data) {
        const admin = json.data;
        return {
          success: true,
          data: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role as AdminRole,
            designation: admin.designation || undefined,
            department: admin.department || undefined,
            phone: admin.phone || '',
            status: admin.status || 'ACTIVE',
            isActive: admin.isActive !== false && admin.status !== 'SUSPENDED',
            permissions: admin.permissions || [],
            createdBy: admin.createdBy,
            lastLogin: 'Never logged in',
            createdAt: new Date().toISOString().split('T')[0],
          },
        };
      }

      const detailedError =
        json?.errors && Array.isArray(json.errors) && json.errors.length > 0
          ? json.errors.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ')
          : (json?.message || json?.error?.message || 'Failed to create admin user');

      return {
        success: false,
        error: detailedError,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error creating admin user' };
    }
  },

  /**
   * Edit team-member profile details (Super Admin only)
   */
  async updateAdmin(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string | null;
      designation?: string | null;
      department?: string | null;
      role?: AdminRole;
      status?: 'ACTIVE' | 'SUSPENDED';
      isActive?: boolean;
    }
  ): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
    const token = adminAuthService.getAdminToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/admin-users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.data) {
        const admin = json.data;
        return {
          success: true,
          data: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role as AdminRole,
            designation: admin.designation || undefined,
            department: admin.department || undefined,
            phone: admin.phone || '',
            status: admin.status || 'ACTIVE',
            isActive: admin.isActive !== false && admin.status !== 'SUSPENDED',
            permissions: admin.permissions || [],
            createdBy: admin.createdBy,
            lastLogin: admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never logged in',
            createdAt: admin.createdAt ? new Date(admin.createdAt).toISOString().split('T')[0] : 'N/A',
          },
        };
      }

      const detailedError =
        json?.errors && Array.isArray(json.errors) && json.errors.length > 0
          ? json.errors.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ')
          : (json?.message || json?.error?.message || 'Failed to update team member details');

      return {
        success: false,
        error: detailedError,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating team member' };
    }
  },

  /**
   * Update active/suspended status of an admin user
   */
  async updateAdminStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED',
    isActive?: boolean,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = adminAuthService.getAdminToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/admin-users/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status,
          isActive: isActive !== undefined ? isActive : status === 'ACTIVE',
          reason,
        }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return { success: true };
      }

      return {
        success: false,
        error: json?.message || json?.error?.message || 'Failed to update admin status',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating admin status' };
    }
  },

  /**
   * Update role and designation of an admin user
   */
  async updateAdminRole(
    id: string,
    role: AdminRole,
    designation?: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = adminAuthService.getAdminToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/admin-users/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role, designation }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return { success: true };
      }

      return {
        success: false,
        error: json?.message || json?.error?.message || 'Failed to update admin role',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating admin role' };
    }
  },

  /**
   * Permanently delete an eligible admin user (Super Admin only)
   */
  async deleteAdmin(
    id: string,
    reason?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = adminAuthService.getAdminToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/admin-users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirmation: 'DELETE', reason }),
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return {
          success: true,
          message: json?.data?.message || 'Account permanently deleted.',
        };
      }

      return {
        success: false,
        error: json?.message || json?.error?.message || 'Failed to delete team member account',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error deleting team member' };
    }
  },

  /**
   * Trigger secure temporary password reset for team member
   */
  async resetAdminPassword(id: string): Promise<{ success: boolean; temporaryPassword?: string; error?: string }> {
    const token = adminAuthService.getAdminToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/admin-users/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.success) {
        return {
          success: true,
          temporaryPassword: json.data?.temporaryPassword,
        };
      }

      return {
        success: false,
        error: json?.message || json?.error?.message || 'Failed to trigger password reset',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error triggering password reset' };
    }
  },

  /**
   * Get audit logs for specific team member or general
   */
  async getAuditLogs(adminId?: string): Promise<any[]> {
    const token = adminAuthService.getAdminToken();
    try {
      const url = adminId
        ? `${API_BASE_URL}/admin/admin-users/${adminId}/audit-logs`
        : `${API_BASE_URL}/admin/audit-logs?limit=100`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await response.json().catch(() => null);
      if (response.ok && json?.data) {
        return json.data || [];
      }
    } catch (err) {
      console.error('[adminUsersService] getAuditLogs error:', err);
    }
    return [];
  },

  /**
   * Save or update admin (backward compatibility helper)
   */
  async saveAdmin(admin: Partial<AdminUser> & { password?: string }): Promise<AdminUser> {
    if (!admin.id && admin.name && admin.email && admin.password) {
      const res = await this.createAdmin({
        name: admin.name,
        email: admin.email,
        password: admin.password,
        role: (admin.role?.toUpperCase() as any) || 'MANAGER',
        phone: admin.phone,
        designation: admin.designation,
        department: admin.department,
      });
      if (res.success && res.data) return res.data;
      throw new Error(res.error || 'Failed to create admin user');
    }
    if (admin.id) {
      const res = await this.updateAdmin(admin.id, admin);
      if (res.success && res.data) return res.data;
      throw new Error(res.error || 'Failed to update admin user');
    }
    throw new Error('Invalid admin operation');
  },
};
