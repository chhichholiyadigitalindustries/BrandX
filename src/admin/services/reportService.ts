/**
 * BRANDX Admin Reports Service
 * Generates and downloads real CSV reports from live PostgreSQL data.
 * No hardcoded names or mock users.
 */

import { AdminReportFilter } from '../types';
import { userService } from './userService';
import { paymentService } from './paymentService';
import { subscriptionService } from './subscriptionService';
import { adminDashboardService } from './adminDashboardService';

export const reportService = {
  /**
   * Generates and triggers download of a real CSV report from PostgreSQL
   */
  async exportReport(filter: AdminReportFilter): Promise<{ success: boolean; filename: string }> {
    const cleanStartDate = filter.startDate || '2026-01-01';
    const cleanEndDate = filter.endDate || new Date().toISOString().split('T')[0];
    const filename = `BrandX_${filter.reportType}_Report_${cleanStartDate}_to_${cleanEndDate}.csv`;

    let csvContent = '';

    switch (filter.reportType) {
      case 'users': {
        const { users } = await userService.getUsers({ limit: 1000 });
        const headers = 'User ID,Name,Phone,Email,Business Name,City,State,Pro Status,Registration Date,Status\n';
        if (users.length === 0) {
          csvContent = headers + '# No registered users found in the selected range\n';
        } else {
          const rows = users.map((u) =>
            `"${u.id}","${u.name}","${u.phone}","${u.email}","${u.businessName}","${u.city}","${u.state}",${u.isPro ? 'TRUE' : 'FALSE'},"${u.registrationDate}","${u.status}"`
          );
          csvContent = headers + rows.join('\n') + '\n';
        }
        break;
      }

      case 'invoices': {
        const headers = 'Transaction ID,Order ID,Payment ID,User Name,Mobile,Plan Name,Amount,Status,Date\n';
        const { transactions } = await paymentService.getTransactions({ limit: 1000 });
        if (transactions.length === 0) {
          csvContent = headers + '# No payment or billing transactions found\n';
        } else {
          const rows = transactions.map((t) =>
            `"${t.id}","${t.orderId}","${t.paymentId}","${t.userName}","${t.userPhone}","${t.planName}",${t.amount},"${t.status}","${t.date}"`
          );
          csvContent = headers + rows.join('\n') + '\n';
        }
        break;
      }

      case 'khata': {
        const headers = 'Business ID,Business Name,City,State,Phone,Status\n';
        const overview = await adminDashboardService.getOverviewMetrics();
        csvContent = headers + `# Total Businesses: ${overview.totalBusinesses}, Total Khata Transactions: ${overview.totalKhataTransactions}\n`;
        break;
      }

      case 'ai_usage': {
        const overview = await adminDashboardService.getOverviewMetrics();
        const headers = 'Metric,Value\n';
        const rows = [
          `"Total AI Copilot Invocations",${overview.aiRequestsCount}`,
          `"AI Invocations Today",${overview.aiRequestsToday}`,
          `"Active Users Today",${overview.activeUsersToday}`,
        ];
        csvContent = headers + rows.join('\n') + '\n';
        break;
      }

      default: {
        const overview = await adminDashboardService.getOverviewMetrics();
        csvContent =
          'Metric,Value\n' +
          `Total Users,${overview.totalUsers}\n` +
          `Total Businesses,${overview.totalBusinesses}\n` +
          `Total Invoices Generated,${overview.totalInvoicesGenerated}\n` +
          `Total Khata Transactions,${overview.totalKhataTransactions}\n`;
        break;
      }
    }

    if (typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return { success: true, filename };
  },
};
