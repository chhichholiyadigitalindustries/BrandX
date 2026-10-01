/**
 * BRANDX Admin Businesses Management Screen (/admin/businesses)
 */

import React, { useEffect, useState } from 'react';
import { businessService } from '../services/businessService';
import { PlatformBusiness } from '../types';
import { AdminTable, Column } from '../components/AdminTable';
import { AdminModal } from '../components/AdminModal';

export const AdminBusinessesScreen: React.FC = () => {
  const [businesses, setBusinesses] = useState<PlatformBusiness[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBiz, setSelectedBiz] = useState<PlatformBusiness | null>(null);

  const loadBusinesses = async () => {
    setIsLoading(true);
    const res = await businessService.getBusinesses({
      page,
      search,
      category: categoryFilter,
      limit: 10,
    });
    setBusinesses(res.businesses);
    setTotal(res.total);
    setTotalPages(res.totalPages);
    setPage(res.page);
    setIsLoading(false);
  };

  useEffect(() => {
    loadBusinesses();
  }, [page, categoryFilter]);

  const columns: Column<PlatformBusiness>[] = [
    {
      header: 'Business & Shop',
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border border-white/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">storefront</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-xs truncate">{b.name}</p>
            <p className="text-[11px] text-gray-400 truncate">Owner: {b.ownerName}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Category & Type',
      render: (b) => (
        <div>
          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-emerald-300 font-semibold text-[10px]">
            {b.category}
          </span>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{b.businessType}</p>
        </div>
      ),
    },
    {
      header: 'GSTIN Number',
      render: (b) =>
        b.gstin ? (
          <span className="font-mono text-xs text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            {b.gstin}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400">Non-GST Small Retailer</span>
        ),
    },
    {
      header: 'City / State',
      render: (b) => (
        <div className="text-xs text-gray-200">
          <span>{b.city}, {b.state}</span>
        </div>
      ),
    },
    {
      header: 'UPI Handle',
      render: (b) => (
        <span className="font-mono text-[11px] text-gray-300 bg-white/5 px-2 py-0.5 rounded">
          {b.upiId || 'Not linked'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (b) => (
        <button
          onClick={() => setSelectedBiz(b)}
          className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
          type="button"
        >
          View KYC
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <AdminTable
        columns={columns}
        data={businesses}
        isLoading={isLoading}
        emptyMessage="No businesses found."
        page={page}
        totalPages={totalPages}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search business name, GSTIN, owner or city..."
        actionsHeader={
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all" className="bg-[#0E1424]">All Categories</option>
            <option value="Grocery" className="bg-[#0E1424]">Grocery / Kirana</option>
            <option value="Studio" className="bg-[#0E1424]">Photo Studio &amp; Print</option>
            <option value="Fashion" className="bg-[#0E1424]">Fashion &amp; Boutique</option>
            <option value="Automotive" className="bg-[#0E1424]">Automotive &amp; Spares</option>
          </select>
        }
      />

      {/* Business Details Modal */}
      {selectedBiz && (
        <AdminModal
          isOpen={true}
          onClose={() => setSelectedBiz(null)}
          title={selectedBiz.name}
          subtitle={`Business Profile ID: ${selectedBiz.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <p className="font-extrabold text-base text-white">{selectedBiz.name}</p>
              {selectedBiz.tagline && <p className="text-gray-300 italic">"{selectedBiz.tagline}"</p>}
              <p className="text-emerald-400 font-semibold">{selectedBiz.businessType}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Owner Name</span>
                <span className="text-white font-semibold">{selectedBiz.ownerName}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">GSTIN Number</span>
                <span className="text-emerald-300 font-mono font-bold">{selectedBiz.gstin || 'No GST registered'}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Address</span>
                <span className="text-white">{selectedBiz.address}, {selectedBiz.city} - {selectedBiz.pincode}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-gray-400 block text-[10px] uppercase font-bold">UPI ID</span>
                <span className="text-white font-mono font-semibold">{selectedBiz.upiId || 'Not set'}</span>
              </div>
            </div>

            {/* Requirement 18: Business Profile Subscription Information */}
            <div className="p-4 rounded-2xl bg-[#131b2e] border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-400">workspace_premium</span>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Subscription &amp; Monetization</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Pro Active
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-[10px] block">Plan</span>
                  <span className="text-white font-bold">Pro Monthly</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-[10px] block">Subscription Start</span>
                  <span className="text-white">15 Aug 2026</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-[10px] block">Subscription Expiry</span>
                  <span className="text-emerald-300 font-bold">15 Oct 2026</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-[10px] block">Last Payment</span>
                  <span className="text-white font-mono">15 Sep 2026</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <p className="text-gray-300 font-medium">Estimated Generated Invoices</p>
                <p className="text-xl font-black text-white mt-0.5">₹{selectedBiz.totalRevenueCalculated.toLocaleString('en-IN')}</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-emerald-400">payments</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBiz(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
};
