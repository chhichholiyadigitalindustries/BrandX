/**
 * BRANDX Admin Dashboard Overview Service
 * Aggregates high-level metrics, growth rates, and analytics chart data from real PostgreSQL backend.
 */

import { AdminDashboardOverview } from '../types';
import { adminAuthService } from './adminAuthService';

import { API_BASE_URL } from '../../config/env';


export const adminDashboardService = {
  async getOverviewMetrics(): Promise<AdminDashboardOverview> {
    const token = adminAuthService.getAdminToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.success && json?.data) {
        const d = json.data;
        return {
          totalUsers: d.totalUsers || 0,
          newUsersToday: d.newUsersToday || 0,
          activeUsersToday: d.activeUsersToday || 0,
          totalBusinesses: d.totalBusinesses || 0,
          totalInvoicesGenerated: d.totalInvoices || 0,
          invoicesToday: d.invoicesToday || 0,
          totalKhataTransactions: d.totalKhataTransactions || 0,
          postersSharedCount: d.postersSharedCount || 0,
          postersSharedToday: d.postersSharedToday || 0,
          aiRequestsCount: d.aiRequestsCount || 0,
          aiRequestsToday: d.aiRequestsToday || 0,
          userGrowthPercent: d.userGrowthPercent || 0,
          revenueGrowthPercent: d.revenueGrowthPercent || 0,
          chartUserRegistrations: d.chartUserRegistrations || [
            { label: 'Mon', value: 0 },
            { label: 'Tue', value: 0 },
            { label: 'Wed', value: 0 },
            { label: 'Thu', value: 0 },
            { label: 'Fri', value: 0 },
            { label: 'Sat', value: 0 },
            { label: 'Sun', value: 0 },
          ],
          chartDailyActiveUsers: d.chartDailyActiveUsers || [
            { label: 'Mon', value: 0 },
            { label: 'Tue', value: 0 },
            { label: 'Wed', value: 0 },
            { label: 'Thu', value: 0 },
            { label: 'Fri', value: 0 },
            { label: 'Sat', value: 0 },
            { label: 'Sun', value: 0 },
          ],
          chartInvoiceGeneration: d.chartInvoiceGeneration || [
            { label: 'Mon', value: 0 },
            { label: 'Tue', value: 0 },
            { label: 'Wed', value: 0 },
            { label: 'Thu', value: 0 },
            { label: 'Fri', value: 0 },
            { label: 'Sat', value: 0 },
            { label: 'Sun', value: 0 },
          ],
          chartAiUsage: d.chartAiUsage || [
            { label: 'Mon', value: 0 },
            { label: 'Tue', value: 0 },
            { label: 'Wed', value: 0 },
            { label: 'Thu', value: 0 },
            { label: 'Fri', value: 0 },
            { label: 'Sat', value: 0 },
            { label: 'Sun', value: 0 },
          ],
          chartContentEngagement: d.chartContentEngagement || [
            { label: 'Morning Suvichar', value: 0 },
            { label: 'Festival Posters', value: 0 },
            { label: 'UPI QR Standee', value: 0 },
            { label: 'Khata Statement', value: 0 },
          ],
        };
      }
    } catch (err) {
      console.warn('[AdminDashboard] Backend fetch note:', err);
    }

    // Clean zeroed fallback when no data exists
    return {
      totalUsers: 0,
      newUsersToday: 0,
      activeUsersToday: 0,
      totalBusinesses: 0,
      totalInvoicesGenerated: 0,
      invoicesToday: 0,
      totalKhataTransactions: 0,
      postersSharedCount: 0,
      postersSharedToday: 0,
      aiRequestsCount: 0,
      aiRequestsToday: 0,
      userGrowthPercent: 0,
      revenueGrowthPercent: 0,
      chartUserRegistrations: [],
      chartDailyActiveUsers: [],
      chartInvoiceGeneration: [],
      chartAiUsage: [],
      chartContentEngagement: [],
    };
  },
};
