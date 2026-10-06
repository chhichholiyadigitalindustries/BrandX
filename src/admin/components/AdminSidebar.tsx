/**
 * BRANDX Admin Sidebar Navigation Component
 * Modern SaaS collapsible sidebar with active badges, grouped sections, and BrandX branding.
 */

import React from 'react';
import { useAdminNavigation, AdminRoute } from '../context/AdminNavigationContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { resolveImageUrl } from '../../utils/imageUrl';

interface NavItem {
  route: AdminRoute;
  label: string;
  icon: string;
  badge?: string;
}

export const AdminSidebar: React.FC = () => {
  const { currentRoute, navigate, isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } =
    useAdminNavigation();
  const { admin, logout } = useAdminAuth();

  const role = (admin?.role || 'SUPER_ADMIN').toUpperCase();
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const isAccountant = role === 'ACCOUNTANT';

  // Role-filtered navigation lists
  const allMainNavItems: NavItem[] = [
    { route: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { route: 'users', label: 'Users', icon: 'group' },
    { route: 'businesses', label: 'Businesses', icon: 'storefront' },
    { route: 'daily-status', label: 'Daily Status CMS', icon: 'calendar_month', badge: 'Live' },
    { route: 'posters', label: 'Poster Library', icon: 'photo_library' },
    { route: 'festivals', label: 'Festivals', icon: 'celebration' },
    { route: 'referrals', label: 'Referrals & Rewards', icon: 'card_giftcard' },
    { route: 'invoices', label: 'Invoices', icon: 'receipt_long' },
    { route: 'khata', label: 'Khata Ledger', icon: 'menu_book' },
    { route: 'ai', label: 'AI Copilot', icon: 'auto_awesome', badge: 'AI' },
    { route: 'announcements', label: 'Announcements', icon: 'campaign' },
    { route: 'reports', label: 'Reports', icon: 'analytics' },
  ];

  const allFinanceNavItems: NavItem[] = [
    { route: 'revenue', label: 'Revenue & P&L', icon: 'monitoring', badge: '₹' },
    { route: 'subscribers', label: 'Pro Subscribers', icon: 'workspace_premium' },
    { route: 'payments', label: 'Transactions', icon: 'credit_card' },
    { route: 'withdrawals', label: 'Withdrawals (Payouts)', icon: 'payments', badge: 'Coins' },
    { route: 'plans', label: 'Plans & Pricing', icon: 'loyalty' },
    { route: 'refunds', label: 'Refunds', icon: 'currency_exchange' },
  ];

  const allSystemNavItems: NavItem[] = [
    { route: 'admin-users', label: 'Admin Users', icon: 'admin_panel_settings' },
    { route: 'audit-logs', label: 'Audit Logs', icon: 'history_edu' },
    { route: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const mainNavItems = allMainNavItems.filter((item) => {
    if (isSuperAdmin) return true;
    if (isManager) return true;
    if (isAccountant) return ['dashboard', 'invoices', 'reports'].includes(item.route);
    return ['dashboard'].includes(item.route);
  });

  const financeNavItems = allFinanceNavItems.filter((item) => {
    if (isSuperAdmin) return true;
    if (isAccountant) return true;
    if (isManager) return ['subscribers', 'plans'].includes(item.route);
    return false;
  });

  const systemNavItems = allSystemNavItems.filter(() => {
    if (isSuperAdmin) return true;
    return false;
  });

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B0F19] text-gray-300 border-r border-white/10 select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => navigate('dashboard')}>
          <div className="w-10 h-10 rounded-xl p-0.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shrink-0 border border-white/20 overflow-hidden">
            <img
              src="/brandx-logo.png"
              alt="BrandX Logo"
              className="w-full h-full object-contain rounded-[10px] bg-[#0B0F19]"
            />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-extrabold text-white text-base tracking-tight leading-none flex items-center gap-1.5">
                BRANDX
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  ADMIN
                </span>
              </h1>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">Control Center</p>
            </div>
          )}
        </div>

        {/* Collapse toggle button on desktop */}
        <button
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white items-center justify-center transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      {/* Navigation Links Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-6 custom-scrollbar">
        {/* Main Section */}
        <div>
          {!isSidebarCollapsed && (
            <p className="px-3 text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">Main Menu</p>
          )}
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  onClick={() => navigate(item.route)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#005338] to-[#008f62] text-white shadow-lg shadow-emerald-950/40 border border-emerald-400/30'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                  type="button"
                >
                  <span
                    className={`material-symbols-outlined text-[20px] shrink-0 ${
                      isActive ? 'text-[#6ffbbe]' : 'text-gray-400'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!isSidebarCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        item.badge === 'Live'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Finances & Revenue Section */}
        {financeNavItems.length > 0 && (
          <div>
            {!isSidebarCollapsed && (
              <p className="px-3 text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">Finances &amp; Revenue</p>
            )}
            <nav className="space-y-1">
              {financeNavItems.map((item) => {
                const isActive = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#005338] to-[#008f62] text-white shadow-lg shadow-emerald-950/40 border border-emerald-400/30'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    }`}
                    type="button"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        isActive ? 'text-[#6ffbbe]' : 'text-gray-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                    {!isSidebarCollapsed && item.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* System Section */}
        {systemNavItems.length > 0 && (
          <div>
            {!isSidebarCollapsed && (
              <p className="px-3 text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">System &amp; Controls</p>
            )}
            <nav className="space-y-1">
              {systemNavItems.map((item) => {
                const isActive = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#005338] to-[#008f62] text-white shadow-lg border border-emerald-400/30'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    }`}
                    type="button"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        isActive ? 'text-[#6ffbbe]' : 'text-gray-400'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Admin Profile Footer */}
      <div className="p-3 border-t border-white/10 shrink-0 bg-[#0E1424]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('profile')}
            title="Edit My Profile & Security"
            className="flex items-center gap-3 min-w-0 flex-1 p-1 rounded-xl hover:bg-white/5 text-left transition-colors cursor-pointer group"
            type="button"
          >
            <div className="relative shrink-0">
              <img
                src={admin?.avatarUrl && !admin.avatarUrl.startsWith('role:') ? resolveImageUrl(admin.avatarUrl) : '/brandx-logo.png'}
                alt="Admin Avatar"
                className="w-9 h-9 rounded-xl object-cover border border-white/20 group-hover:border-emerald-500/50 transition-colors"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
                }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0E1424]" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                  {admin?.name || 'Administrator'}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{admin?.email || 'admin@brandx.in'}</p>
              </div>
            )}
          </button>
          <button
            onClick={logout}
            title="Log Out"
            aria-label="Log Out of Admin Portal"
            className="w-8 h-8 rounded-lg hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block h-screen shrink-0 transition-all duration-300 z-30 sticky top-0 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 shadow-2xl animate-slide-in-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
