/**
 * BRANDX Admin Header Component
 * Top bar with breadcrumb, quick search, notification dropdown, and admin profile trigger.
 */

import React, { useState } from 'react';
import { useAdminNavigation } from '../context/AdminNavigationContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { resolveImageUrl } from '../../utils/imageUrl';

export const AdminHeader: React.FC = () => {
  const { currentRoute, setMobileSidebarOpen, navigate } = useAdminNavigation();
  const { admin, logout } = useAdminAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const routeTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Executive Overview', subtitle: 'Platform growth, users, active vyaparis & analytics' },
    revenue: { title: 'Revenue & P&L Dashboard', subtitle: 'Pro subscription recurring revenue, gross/net earnings & growth trends' },
    subscribers: { title: 'Pro Subscribers Directory', subtitle: 'Active Pro members, renewals, plan pricing & expiry schedules' },
    payments: { title: 'Transactions Ledger', subtitle: 'Live payment audit trail across Razorpay, Cashfree & UPI gateways' },
    plans: { title: 'Subscription Plans & Tiers', subtitle: 'Configure Free, Pro Monthly & Pro Annual packages' },
    refunds: { title: 'Refund Requests & Disputes', subtitle: 'Track and manage user refund authorizations and turnaround' },
    users: { title: 'User Directory', subtitle: 'Manage registered Indian business owners and KYC status' },
    businesses: { title: 'Business Profiles & GSTIN', subtitle: 'Verified vyapari shops, categories & state distribution' },
    'daily-status': { title: 'Daily Status CMS', subtitle: "Publish today's morning Suvichar & 9:16 WhatsApp posters" },
    posters: { title: 'Marketing Poster Library', subtitle: 'Manage categories, festive banners & promotional templates' },
    festivals: { title: 'Festival Calendar', subtitle: 'Indian cultural & national events greeting scheduler' },
    invoices: { title: 'GST Billing Ledger', subtitle: 'Aggregate billing volume, tax invoices & quotations breakdown' },
    khata: { title: 'Digital Khata Platform', subtitle: 'Credit book activity, udhar-jama volume & settlement metrics' },
    ai: { title: 'Biz AI Copilot Insights', subtitle: 'Voice-to-bill requests, marketing prompt volume & token analytics' },
    announcements: { title: 'In-App Announcement Center', subtitle: 'Push broadcast banners, feature notices & updates' },
    reports: { title: 'Export & Analytics Reports', subtitle: 'Generate downloadable CSV summaries and audits' },
    'admin-users': { title: 'Admin Team & Roles', subtitle: 'Role-based permissions, super admins & content editors' },
    settings: { title: 'Platform Settings', subtitle: 'Global feature flags, branding, AI parameters & security' },
    profile: { title: 'Admin Account & Security Profile', subtitle: 'Manage your name, official email, phone, avatar logo, and credentials' },
  };

  const currentInfo = routeTitles[currentRoute] || { title: 'Admin Portal', subtitle: 'BrandX Management' };

  return (
    <header className="h-16 bg-[#0E1424]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open navigation menu"
          className="lg:hidden w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
          type="button"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="flex lg:hidden items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('dashboard')}>
          <img src="/brandx-logo.png" alt="BrandX Logo" className="w-8 h-8 object-contain rounded-lg bg-[#0B0F19] p-0.5 border border-white/20" />
        </div>

        <div className="min-w-0">
          <h2 className="font-extrabold text-white text-sm lg:text-base tracking-tight truncate">
            {currentInfo.title}
          </h2>
          <p className="text-[11px] text-gray-400 truncate hidden sm:block">{currentInfo.subtitle}</p>
        </div>
      </div>

      {/* Right: Quick Actions, Notifications, User Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick link to return to User App */}
        <button
          onClick={() => (window.location.href = '/')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-xs font-semibold text-emerald-300 border border-emerald-500/20 transition-all hover:scale-[1.02]"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          <span>Open User App</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            aria-label="Notifications"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors relative"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0E1424]"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#131b2e] border border-white/15 rounded-2xl shadow-2xl p-3 z-50 animate-scale-in">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <span className="text-xs font-bold text-white">System Alerts</span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  All Systems Normal
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <p className="font-semibold text-gray-200">🚀 Daily Content CMS Ready</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">Published morning content synchronizing with database.</p>
                  <span className="text-[10px] text-emerald-400">Live</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <p className="font-semibold text-gray-200">🔒 Database &amp; API Active</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">Neon PostgreSQL cloud database operational.</p>
                  <span className="text-[10px] text-emerald-400">Connected</span>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Admin Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            aria-label="Admin Profile Menu"
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/5 transition-colors"
            type="button"
          >
            <img
              key={admin?.avatarUrl || 'header-avatar'}
              src={admin?.avatarUrl && !admin.avatarUrl.startsWith('role:') ? resolveImageUrl(admin.avatarUrl) : '/brandx-logo.png'}
              alt={admin?.name || 'Admin'}
              className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/brandx-logo.png';
              }}
            />
            <span className="material-symbols-outlined text-gray-400 text-[18px] hidden sm:block">
              keyboard_arrow_down
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#131b2e] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-scale-in">
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <p className="text-xs font-bold text-white truncate">{admin?.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{admin?.email}</p>
                <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full mt-1">
                  {(admin?.role || 'SUPER_ADMIN').replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('profile');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">account_circle</span>
                <span>My Profile &amp; Security</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('settings');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Portal Settings</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('admin-users');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">group</span>
                <span>Admin Team</span>
              </button>
              <div className="h-px bg-white/10 my-1"></div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
