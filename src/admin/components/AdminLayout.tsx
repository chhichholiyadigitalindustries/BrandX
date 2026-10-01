/**
 * BRANDX Admin Layout Component
 * Shell container providing responsive sidebar, top bar, and content stage.
 */

import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#070A12] text-gray-100 flex flex-row selection:bg-emerald-600 selection:text-white font-sans">
      {/* Persistent Sidebar */}
      <AdminSidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden min-h-screen">
        <AdminHeader />
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto animate-fade-in pb-16">
          {children}
        </main>
      </div>
    </div>
  );
};
