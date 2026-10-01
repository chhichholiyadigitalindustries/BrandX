/**
 * BRANDX Admin Audit Logs Screen (/admin/audit-logs)
 * Immutable security audit trail of all platform administrative actions.
 * Super Admin only.
 */

import React, { useEffect, useState } from 'react';
import { adminAuthService } from '../services/adminAuthService';
import { AdminTable, Column } from '../components/AdminTable';

import { API_BASE_URL } from '../../config/env';


interface AuditLogEntry {
  id: string;
  actorId?: string;
  actorType: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: string;
}

export const AdminAuditLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    const token = adminAuthService.getAdminToken();

    try {
      const res = await fetch(`${API_BASE_URL}/admin/audit-logs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const columns: Column<AuditLogEntry>[] = [
    {
      header: 'Timestamp',
      render: (l) => (
        <span className="font-mono text-[11px] text-gray-300">
          {l.createdAt ? new Date(l.createdAt).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      header: 'Action',
      render: (l) => {
        const isDelete = l.action.includes('DELETE') || l.action.includes('SUSPEND') || l.action.includes('REJECT');
        const isCreate = l.action.includes('CREATE') || l.action.includes('APPROVE') || l.action.includes('LOGIN');

        const color = isDelete
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
          : isCreate
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

        return (
          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${color}`}>
            {l.action}
          </span>
        );
      },
    },
    {
      header: 'Entity / Target',
      render: (l) => (
        <div>
          <span className="font-bold text-white text-xs">{l.entity}</span>
          {l.entityId && (
            <p className="font-mono text-[10px] text-gray-400 truncate max-w-[150px]">
              ID: {l.entityId}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Actor',
      render: (l) => (
        <div>
          <span className="px-1.5 py-0.5 bg-white/10 text-gray-300 rounded text-[10px] font-bold">
            {l.actorType}
          </span>
          {l.actorId && (
            <p className="font-mono text-[10px] text-gray-400 truncate max-w-[120px] mt-0.5">
              {l.actorId}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Details & Metadata',
      render: (l) => {
        const metaStr = l.metadata ? JSON.stringify(l.metadata) : '—';
        return (
          <span className="font-mono text-[11px] text-gray-400 truncate max-w-[250px] block" title={metaStr}>
            {metaStr}
          </span>
        );
      },
    },
    {
      header: 'IP Address',
      render: (l) => (
        <span className="font-mono text-[11px] text-gray-400">
          {l.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-4 rounded-2xl border border-white/10 shadow-lg">
        <div>
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400">history_edu</span>
            Security Audit Trail
          </h3>
          <p className="text-xs text-gray-400">
            Immutable log of administrative operations, role modifications, status changes, and logins.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition-all"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Refresh Trail</span>
        </button>
      </div>

      <AdminTable columns={columns} data={logs} isLoading={isLoading} emptyMessage="No audit logs recorded yet." />
    </div>
  );
};
