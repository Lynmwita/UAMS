'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Activity, ShieldCheck, RefreshCw } from 'lucide-react';

interface AuditItem {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  target_label?: string;
  ip_address?: string;
  status: string;
}

export default function AuditPage() {
  const { role } = useAuth();
  const isAdmin = ['super_admin', 'admin'].includes(role);
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDetail, setOpenDetail] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/audit?limit=25');
      const data = await res.json();
      if (data?.success && Array.isArray(data.data)) {
        setLogs(data.data);
      }
    } catch {
      // Graceful fallback to initial telemetry
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Security & Audit Telemetry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Append-only event ledger tracking logins, grade submissions, administrative overrides, and mutations.
            Raw identifiers and IP addresses are shown only in the admin detail view, never in the list.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Action Code</th>
                <th className="px-5 py-3.5">Target</th>
                <th className="px-5 py-3.5">Status</th>
                {isAdmin && <th className="px-5 py-3.5">Details</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-5 py-6 text-center text-xs text-slate-400">
                    {loading ? 'Streaming audit ledger records...' : 'No audit telemetry events found.'}
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString('en-KE')}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <div>{l.actor_email}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">{l.actor_role}</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-academic-navy-900 border border-slate-200">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700 whitespace-nowrap">
                      {l.target_label || `${l.entity_type} — see details`}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : l.status === 'BLOCKED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button className="underline text-xs" onClick={() => setOpenDetail(openDetail === l.id ? null : l.id)}>
                          {openDetail === l.id ? 'Hide details' : 'Show details'}
                        </button>
                        {openDetail === l.id && (
                          <div className="mt-2 font-mono text-[11px] text-slate-500">
                            <div>Entity: {l.entity_type} ({l.entity_id || 'not recorded'})</div>
                            <div>IP: {l.ip_address || 'not recorded'}</div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
