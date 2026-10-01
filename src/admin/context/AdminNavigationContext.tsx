/**
 * BRANDX Admin Navigation Context
 * Manages admin route navigation, URL path sync, and sidebar collapse state.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AdminRoute =
  | 'dashboard'
  | 'revenue'
  | 'subscribers'
  | 'payments'
  | 'plans'
  | 'refunds'
  | 'withdrawals'
  | 'referrals'
  | 'users'
  | 'businesses'
  | 'daily-status'
  | 'posters'
  | 'festivals'
  | 'invoices'
  | 'khata'
  | 'ai'
  | 'announcements'
  | 'reports'
  | 'admin-users'
  | 'audit-logs'
  | 'settings'
  | 'profile';

interface AdminNavigationContextType {
  currentRoute: AdminRoute;
  navigate: (route: AdminRoute) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

const AdminNavigationContext = createContext<AdminNavigationContextType | undefined>(undefined);

export const AdminNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<AdminRoute>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\/admin\/?/, '');
      if (path && [
        'revenue',
        'subscribers',
        'payments',
        'plans',
        'refunds',
        'withdrawals',
        'referrals',
        'users',
        'businesses',
        'daily-status',
        'posters',
        'festivals',
        'invoices',
        'khata',
        'ai',
        'announcements',
        'reports',
        'admin-users',
        'audit-logs',
        'settings',
        'profile',
      ].includes(path)) {
        return path as AdminRoute;
      }
    }
    return 'dashboard';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync route with browser history
  const navigate = (route: AdminRoute) => {
    setCurrentRoute(route);
    setMobileSidebarOpen(false);
    if (typeof window !== 'undefined') {
      const urlPath = route === 'dashboard' ? '/admin' : `/admin/${route}`;
      window.history.pushState({}, '', urlPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.replace(/^\/admin\/?/, '');
        if (path) {
          setCurrentRoute(path as AdminRoute);
        } else {
          setCurrentRoute('dashboard');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  return (
    <AdminNavigationContext.Provider
      value={{
        currentRoute,
        navigate,
        isSidebarCollapsed,
        toggleSidebar,
        isMobileSidebarOpen,
        setMobileSidebarOpen,
      }}
    >
      {children}
    </AdminNavigationContext.Provider>
  );
};

export function useAdminNavigation() {
  const context = useContext(AdminNavigationContext);
  if (!context) {
    throw new Error('useAdminNavigation must be used within an AdminNavigationProvider');
  }
  return context;
}
