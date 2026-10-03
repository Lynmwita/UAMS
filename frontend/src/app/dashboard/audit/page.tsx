'use client';

import { Activity, ShieldCheck } from 'lucide-react';

export default function AuditPage() {
  const logs = [
    { timestamp: '2026-10-03 22:15:10', user: 'admin@university.ac.ke', action: 'STUDENT_ADMITTED', entity: 'students (STU/2026/0204)', ip: '192.168.1.10' },
    { timestamp: '2026-10-03 21:40:22', user: 'finance@university.ac.ke', action: 'PAYMENT_VERIFIED', entity: 'transactions (QHJ8917263)', ip: '192.168.1.45' },
    { timestamp: '2026-10-03 20:10:04', user: 'lecturer@university.ac.ke', action: 'GRADE_SUBMITTED', entity: 'student_grades (CSC401)', ip: '192.168.2.18' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Security & Audit Telemetry
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable transaction logs, administrative grade overrides, and permission mutations.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5">Timestamp</th>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Action Code</th>
              <th className="px-5 py-3.5">Target Entity</th>
              <th className="px-5 py-3.5">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{l.timestamp}</td>
                <td className="px-5 py-3.5 font-medium text-slate-900">{l.user}</td>
                <td className="px-5 py-3.5"><span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-academic-navy-900 border border-slate-200">{l.action}</span></td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{l.entity}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
