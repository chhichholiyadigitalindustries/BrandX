/**
 * BRANDX Admin Business Management Service
 * Connects directly to backend /api/v1/admin/businesses PostgreSQL endpoints.
 */

import { PlatformBusiness } from '../types';
import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';


export const businessService = {
  async getBusinesses(params: {
    search?: string;
    city?: string;
    state?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ businesses: PlatformBusiness[]; total: number; page: number; totalPages: number }> {
    const token = adminAuthService.getAdminToken();
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.city && params.city !== 'all') query.set('city', params.city);
    if (params.category && params.category !== 'all') query.set('category', params.category);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/businesses?${query.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.data) {
        const raw = json.data || [];
        const businesses: PlatformBusiness[] = raw.map((b: any) => ({
          id: b.id,
          ownerId: b.ownerId,
          ownerName: b.ownerName || b.owner?.name || 'Vyapari Owner',
          name: b.name,
          tagline: b.tagline || '',
          businessType: b.businessType || 'Retail',
          category: b.category || 'Retail & Kirana',
          gstin: b.gstin || undefined,
          panNumber: b.pan || undefined,
          phone: b.mobile,
          email: b.email || '',
          address: b.address,
          city: b.city,
          state: b.state,
          pincode: b.pincode,
          upiId: b.upiId || '',
          bankAccount: b.accountNumber
            ? {
                accountNumber: b.accountNumber,
                ifsc: b.ifscCode || '',
                bankName: b.bankName || 'Bank',
              }
            : undefined,
          logoUrl: b.logoUrl || '/brandx-logo.png',
          registrationDate: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '2026-01-01',
          status: b.isVerified ? 'verified' : 'pending',
          totalRevenueCalculated: 0,
          invoicesCount: b._count?.invoices || 0,
        }));

        const total = json.pagination?.total || businesses.length;
        const page = json.pagination?.page || params.page || 1;
        const totalPages = json.pagination?.totalPages || Math.ceil(total / (params.limit || 10)) || 1;

        return { businesses, total, page, totalPages };
      }
    } catch (e) {
      console.warn('[AdminBusinessService] Backend fetch note:', e);
    }

    return { businesses: [], total: 0, page: 1, totalPages: 1 };
  },

  async getBusinessById(id: string): Promise<PlatformBusiness | null> {
    const list = await this.getBusinesses({ limit: 100 });
    return list.businesses.find((b) => b.id === id) || null;
  },
};
