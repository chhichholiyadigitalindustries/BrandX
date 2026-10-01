/**
 * BRANDX Admin Accounts & Role Management Service
 * Directly interacts with PostgreSQL AdminUser database via backend API.
 * No mock data, no fake admins.
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
          avatarUrl:
            admin.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          phone: admin.phone || '',
          status: admin.status || (admin.isActive ? 'ACTIVE' : 'SUSPENDED'),
          isActive: admin.isActive !== false,
          permissions: admin.permissions || [],
          createdBy: admin.createdBy,
          lastLogin: admin.lastLoginAt
            ? new Date(admin.lastLoginAt).toLocaleString()
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
   * Disallows creating additional Super Admins via UI
   */
  async createAdmin(data: {
    name: string;
    email: string;
    password: string;
    role: 'MANAGER' | 'ACCOUNTANT' | 'CONTENT_MANAGER' | 'SUPPORT';
    phone?: string;
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
            phone: admin.phone || '',
            status: admin.status || 'ACTIVE',
            isActive: admin.isActive !== false,
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
   * Update role of an admin user
   */
  async updateAdminRole(
    id: string,
    role: AdminRole
  ): Promise<{ success: boolean; error?: string }> {
    const token = adminAuthService.getAdminToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/admin-users/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role }),
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
      });
      if (res.success && res.data) return res.data;
      throw new Error(res.error || 'Failed to create admin user');
    }
    throw new Error('Direct edit without role or status endpoints not supported');
  },
};
