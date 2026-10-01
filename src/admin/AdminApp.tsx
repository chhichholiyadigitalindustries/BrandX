/**
 * BRANDX Admin Master Portal Application Entrypoint
 * Dedicated, protected, and isolated administration console for BrandX.
 */

import React from 'react';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminNavigationProvider, useAdminNavigation } from './context/AdminNavigationContext';
import { AdminToastProvider } from './components/AdminToast';
import { AdminLayout } from './components/AdminLayout';

// Admin Screens
import { AdminLoginScreen } from './screens/AdminLoginScreen';
import { AdminDashboardScreen } from './screens/AdminDashboardScreen';
import { AdminRevenueScreen } from './screens/AdminRevenueScreen';
import { AdminSubscribersScreen } from './screens/AdminSubscribersScreen';
import { AdminPaymentsScreen } from './screens/AdminPaymentsScreen';
import { AdminPlansScreen } from './screens/AdminPlansScreen';
import { AdminRefundsScreen } from './screens/AdminRefundsScreen';
import { AdminUsersScreen } from './screens/AdminUsersScreen';
import { AdminBusinessesScreen } from './screens/AdminBusinessesScreen';
import { AdminDailyStatusScreen } from './screens/AdminDailyStatusScreen';
import { AdminPosterLibraryScreen } from './screens/AdminPosterLibraryScreen';
import { AdminFestivalsScreen } from './screens/AdminFestivalsScreen';
import { AdminInvoicesScreen } from './screens/AdminInvoicesScreen';
import { AdminKhataScreen } from './screens/AdminKhataScreen';
import { AdminAIScreen } from './screens/AdminAIScreen';
import { AdminAnnouncementsScreen } from './screens/AdminAnnouncementsScreen';
import { AdminReportsScreen } from './screens/AdminReportsScreen';
import { AdminUsersManagementScreen } from './screens/AdminUsersManagementScreen';
import { AdminAuditLogsScreen } from './screens/AdminAuditLogsScreen';
import { AdminSettingsScreen } from './screens/AdminSettingsScreen';
import { AdminProfileScreen } from './screens/AdminProfileScreen';
import { AdminReferralsView } from './components/AdminReferralsView';
import { AdminWithdrawalsView } from './components/AdminWithdrawalsView';

const AdminRouteDispatcher: React.FC = () => {
  const { isAuthenticated, isLoading, admin } = useAdminAuth();
  const { currentRoute, navigate } = useAdminNavigation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070A12] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-semibold tracking-wider">Verifying Admin Session...</p>
        </div>
      </div>
    );
  }

  // Force Login if not authenticated
  if (!isAuthenticated) {
    return <AdminLoginScreen />;
  }

  // Role permissions checking
  const role = (admin?.role || 'SUPER_ADMIN').toUpperCase();
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const isAccountant = role === 'ACCOUNTANT';

  // Check if current route is allowed for user's role
  let isAllowed = false;
  if (currentRoute === 'profile') {
    // Every authenticated admin can view and edit their own profile
    isAllowed = true;
  } else if (isSuperAdmin) {
    isAllowed = true;
  } else if (isManager) {
    // Managers can access operational features, CMS, referrals, and reports, but NOT payments, refunds, withdrawals, admin users, audit logs, or settings
    isAllowed = ![
      'payments',
      'revenue',
      'refunds',
      'withdrawals',
      'admin-users',
      'audit-logs',
      'settings',
    ].includes(currentRoute);
  } else if (isAccountant) {
    // Accountants can access financial modules & withdrawals, but NOT users, businesses, CMS, AI, Khata, referrals, admin users, audit logs, or settings
    isAllowed = [
      'dashboard',
      'revenue',
      'subscribers',
      'payments',
      'withdrawals',
      'plans',
      'refunds',
      'invoices',
      'reports',
    ].includes(currentRoute);
  } else {
    isAllowed = currentRoute === 'dashboard';
  }

  const forbiddenView = (
    <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-950/30">
        <span className="material-symbols-outlined text-[32px]">lock</span>
      </div>
      <h2 className="text-xl font-bold text-white mb-1">Access Restricted (403)</h2>
      <p className="text-sm text-gray-400 max-w-md mb-6">
        Your assigned role <span className="font-bold text-rose-300 font-mono">[{role}]</span> does not have authorization to access this administrative module.
      </p>
      <button
        onClick={() => navigate('dashboard')}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs shadow-lg transition-all"
        type="button"
      >
        Return to Dashboard
      </button>
    </div>
  );

  // Render Protected Admin Layout with Active Screen
  return (
    <AdminLayout>
      {!isAllowed && forbiddenView}
      {isAllowed && currentRoute === 'dashboard' && <AdminDashboardScreen />}
      {isAllowed && currentRoute === 'revenue' && <AdminRevenueScreen />}
      {isAllowed && currentRoute === 'subscribers' && <AdminSubscribersScreen />}
      {isAllowed && currentRoute === 'payments' && <AdminPaymentsScreen />}
      {isAllowed && currentRoute === 'plans' && <AdminPlansScreen />}
      {isAllowed && currentRoute === 'refunds' && <AdminRefundsScreen />}
      {isAllowed && currentRoute === 'withdrawals' && <AdminWithdrawalsView />}
      {isAllowed && currentRoute === 'referrals' && <AdminReferralsView />}
      {isAllowed && currentRoute === 'users' && <AdminUsersScreen />}
      {isAllowed && currentRoute === 'businesses' && <AdminBusinessesScreen />}
      {isAllowed && currentRoute === 'daily-status' && <AdminDailyStatusScreen />}
      {isAllowed && currentRoute === 'posters' && <AdminPosterLibraryScreen />}
      {isAllowed && currentRoute === 'festivals' && <AdminFestivalsScreen />}
      {isAllowed && currentRoute === 'invoices' && <AdminInvoicesScreen />}
      {isAllowed && currentRoute === 'khata' && <AdminKhataScreen />}
      {isAllowed && currentRoute === 'ai' && <AdminAIScreen />}
      {isAllowed && currentRoute === 'announcements' && <AdminAnnouncementsScreen />}
      {isAllowed && currentRoute === 'reports' && <AdminReportsScreen />}
      {isAllowed && currentRoute === 'admin-users' && <AdminUsersManagementScreen />}
      {isAllowed && currentRoute === 'audit-logs' && <AdminAuditLogsScreen />}
      {isAllowed && currentRoute === 'settings' && <AdminSettingsScreen />}
      {isAllowed && currentRoute === 'profile' && <AdminProfileScreen />}
    </AdminLayout>
  );
};

export const AdminApp: React.FC = () => {
  return (
    <AdminAuthProvider>
      <AdminNavigationProvider>
        <AdminToastProvider>
          <AdminRouteDispatcher />
        </AdminToastProvider>
      </AdminNavigationProvider>
    </AdminAuthProvider>
  );
};
