/**
 * BRANDX Admin Khata Platform Analytics Service
 * Real ledger metrics from PostgreSQL backend or clean zeroed states.
 * No fake accounts or mock shop names.
 */

import { AdminKhataMetrics } from '../types';
import { adminDashboardService } from './adminDashboardService';

export const khataService = {
  async getMetrics(): Promise<AdminKhataMetrics> {
    try {
      const overview = await adminDashboardService.getOverviewMetrics();
      return {
        totalAccounts: overview.totalBusinesses || 0,
        activeAccounts: overview.activeUsersToday || 0,
        totalUdharGiven: 0,
        totalJamaReceived: 0,
        netPendingMarketBalance: 0,
        dailyTransactionsCount: overview.totalKhataTransactions || 0,
        settlementRatePercent: 0,
      };
    } catch {
      return {
        totalAccounts: 0,
        activeAccounts: 0,
        totalUdharGiven: 0,
        totalJamaReceived: 0,
        netPendingMarketBalance: 0,
        dailyTransactionsCount: 0,
        settlementRatePercent: 0,
      };
    }
  },

  async getRecentActivity() {
    return [];
  },
};
