/**
 * BRANDX Admin Authentication Service
 * Abstraction layer for admin login, backend API connection, session persistence, and role checks.
 */

import { AdminUser } from '../types';

const ADMIN_STORAGE_KEY = 'brandx_admin_session';
const ADMIN_TOKEN_KEY = 'brandx_admin_token';
import { API_BASE_URL } from '../../config/env';


export const adminAuthService = {
  /**
   * Log in admin with credentials connecting to backend API with offline fallback
   */
  async login(
    email: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    const normalizedEmail = (!email || email.trim().toLowerCase() === 'admin') ? 'admin@brandx.in' : email.trim();

    if (!normalizedEmail || !password) {
      return { success: false, error: 'Kripya Email aur Password bharein' };
    }

    const storage = typeof window !== 'undefined' ? (rememberMe ? localStorage : sessionStorage) : null;

    try {
      const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success && data?.data) {
        const adminData = data.data.admin || data.data.user;
        const token = data.data.token || data.data.tokens?.accessToken;

        const sessionUser: AdminUser = {
          id: adminData.id || 'adm_backend',
          name: adminData.name || 'Admin',
          email: adminData.email || normalizedEmail,
          role: adminData.role || 'SUPER_ADMIN',
          avatarUrl: adminData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          phone: adminData.phone || '',
          status: adminData.status || (adminData.isActive === false ? 'suspended' : 'active'),
          isActive: adminData.isActive !== false,
          permissions: adminData.permissions || [],
          lastLogin: adminData.lastLoginAt || new Date().toISOString(),
          createdAt: adminData.createdAt || new Date().toISOString(),
        };

        if (storage) {
          storage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(sessionUser));
          if (token) storage.setItem(ADMIN_TOKEN_KEY, token);
        }

        return { success: true, user: sessionUser };
      } else {
        return { success: false, error: data?.message || data?.error?.message || 'Invalid admin credentials' };
      }
    } catch (networkErr: any) {
      return {
        success: false,
        error: `Backend server se connect nahi ho paya (${API_BASE_URL}). Kripya server connection check karein.`,
      };
    }
  },

  /**
   * Get current authenticated admin from session
   */
  getCurrentAdmin(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY) || sessionStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error parsing admin session:', e);
    }
    return null;
  },

  /**
   * Get current admin JWT token
   */
  getAdminToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY);
  },

  /**
   * Check if current session is authenticated
   */
  isAuthenticated(): boolean {
    return this.getCurrentAdmin() !== null;
  },

  /**
   * Log out admin and purge session
   */
  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    await new Promise((res) => setTimeout(res, 200));
  },

  /**
   * Synchronize local storage session with updated profile data
   */
  updateStoredAdmin(partial: Partial<AdminUser>): AdminUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const current = this.getCurrentAdmin();
      if (!current) return null;
      const updated = { ...current, ...partial };
      if (localStorage.getItem(ADMIN_STORAGE_KEY)) {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(updated));
      }
      if (sessionStorage.getItem(ADMIN_STORAGE_KEY)) {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    } catch (e) {
      console.error('Error updating stored admin:', e);
      return null;
    }
  },

  /**
   * Fetch current admin profile from PostgreSQL backend
   */
  async getProfile(): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
    const token = this.getAdminToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        this.updateStoredAdmin(json.data);
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || json.message || 'Failed to fetch profile' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  },

  /**
   * Update admin profile (name, email, phone, avatarUrl)
   */
  async updateProfile(payload: {
    name?: string;
    email?: string;
    phone?: string | null;
    avatarUrl?: string | null;
  }): Promise<{ success: boolean; data?: AdminUser; error?: string }> {
    const token = this.getAdminToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        this.updateStoredAdmin(json.data);
        return { success: true, data: json.data };
      }
      return { success: false, error: json.error?.message || json.message || 'Failed to update profile' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  },

  /**
   * Change admin password with current password verification
   */
  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; error?: string }> {
    const token = this.getAdminToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/profile/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true };
      }
      return { success: false, error: json.error?.message || json.message || 'Failed to change password' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  },
};
