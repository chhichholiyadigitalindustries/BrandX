/**
 * BRANDX Admin Auth Context
 * Provides admin state, login, logout, and protected route guarding.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '../types';
import { adminAuthService } from '../services/adminAuthService';

interface AdminAuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateAdmin: (partial: Partial<AdminUser>) => void;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const current = adminAuthService.getCurrentAdmin();
    setAdmin(current);
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string, remember: boolean = true) => {
    const res = await adminAuthService.login(email, pass, remember);
    if (res.success && res.user) {
      setAdmin(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Authentication failed' };
  };

  const logout = async () => {
    await adminAuthService.logout();
    setAdmin(null);
  };

  const updateAdmin = (partial: Partial<AdminUser>) => {
    setAdmin((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      adminAuthService.updateStoredAdmin(updated);
      return updated;
    });
  };

  const refreshAdmin = async () => {
    const res = await adminAuthService.getProfile();
    if (res.success && res.data) {
      setAdmin(res.data);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        updateAdmin,
        refreshAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
