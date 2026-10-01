/**
 * BRANDX Admin User Management Service
 * Connects directly to backend /api/v1/admin/users PostgreSQL endpoints.
 */

import { PlatformUser } from '../types';
import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';


export const userService = {
  async getUsers(params: {
    search?: string;
    status?: string;
    isPro?: boolean;
    state?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ users: PlatformUser[]; total: number; page: number; totalPages: number }> {
    const token = adminAuthService.getAdminToken();
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status.toUpperCase());

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users?${query.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.data) {
        const rawUsers = json.data || [];
        const users: PlatformUser[] = rawUsers.map((u: any) => ({
          id: u.id,
          name: u.name,
          phone: u.mobile,
          email: u.email || '',
          businessName: u.businesses?.[0]?.name || `${u.name}'s Business`,
          businessType: u.businesses?.[0]?.category || 'Retail',
          city: u.businesses?.[0]?.city || '',
          state: u.businesses?.[0]?.state || '',
          isPro: u.isPro || false,
          gstin: u.businesses?.[0]?.gstin || undefined,
          avatarUrl: u.profileImage || '',
          registrationDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
          lastActive: u.updatedAt ? new Date(u.updatedAt).toLocaleString() : '',
          status: (u.status?.toLowerCase() as any) || 'active',
          invoicesCount: u.businesses?.[0]?._count?.invoices || 0,
          khataCustomersCount: u.businesses?.[0]?._count?.customers || 0,
          postersSharedCount: 0,
          aiRequestsCount: u._count?.aiUsageLogs || 0,
        }));

        const total = json.pagination?.total || users.length;
        const page = json.pagination?.page || params.page || 1;
        const totalPages = json.pagination?.totalPages || Math.ceil(total / (params.limit || 10)) || 1;

        return { users, total, page, totalPages };
      }
    } catch (e) {
      console.warn('[AdminUserService] Backend fetch note:', e);
    }

    return { users: [], total: 0, page: 1, totalPages: 1 };
  },

  async getUserById(id: string): Promise<PlatformUser | null> {
    const list = await this.getUsers({ limit: 100 });
    return list.users.find((u) => u.id === id) || null;
  },

  async updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<boolean> {
    const token = adminAuthService.getAdminToken();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: status.toUpperCase() }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[AdminUserService] Update user status note:', e);
      return false;
    }
  },
};
