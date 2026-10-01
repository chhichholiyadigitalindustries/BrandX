/**
 * BRANDX Admin Data Table Component
 * Reusable table with column definitions, search bar, filter triggers, and pagination controls.
 */

import React from 'react';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  actionsHeader?: React.ReactNode;
}

export function AdminTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
  page = 1,
  totalPages = 1,
  totalItems,
  onPageChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  actionsHeader,
}: AdminTableProps<T>) {
  return (
    <div className="bg-[#0E1424] border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Top Search & Filter Bar */}
      {(onSearchChange || actionsHeader) && (
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#131b2e]/50">
          {onSearchChange && (
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchValue || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          )}

          {actionsHeader && <div className="flex items-center gap-2 shrink-0">{actionsHeader}</div>}
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider ${
                    col.className || ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[36px] text-gray-400">inbox</span>
                    <span className="text-sm font-medium">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr key={item.id ?? rowIdx} className="hover:bg-white/[0.03] transition-colors">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-4 py-3 text-gray-200 ${col.className || ''}`}>
                      {col.render
                        ? col.render(item)
                        : col.accessor
                        ? String(item[col.accessor] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 bg-white/[0.01]">
          <span>
            Showing page <strong className="text-white">{page}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong>
            {totalItems !== undefined && ` (${totalItems} total)`}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              type="button"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
