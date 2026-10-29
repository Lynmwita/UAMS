'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

export type CommandSummary = {
  generated_at: string;
  students: { total: number; active: number; programs: number; byStatus?: Record<string, number> };
  staff: { total: number; active: number };
  finance: { invoiced: number; collected: number; outstanding: number; invoices_issued: number; accounts_with_outstanding_balance: number };
  approvalQueue?: {
    pendingAdmissions: { id: string; name: string; program: string; reference: string; status: string }[];
    pendingRegistrations: { id: string; student: string; course: string }[];
    feeExceptions: { id: string; name: string; balance: number; admission: string }[];
  };
  recentActivity?: { action: string; actor: string; at: string; detail: string }[];
};

const kes = (n: number) => 'KES ' + n.toLocaleString('en-KE');
const timeAgo = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/**
 * Admin Command Center (approved 2026-10-29): the admin dashboard is a
 * decision-making surface, not a repeat of the sidebar. Top-level
 * institutional health (KPIs), a real approval queue, a live activity
 * stream, and high-frequency quick actions. Everything shown is read from
 * the same stores as the list pages; features with no data source yet
 * (grade-change requests, hostel disputes) show honest "not tracked" states
 * instead of invented numbers.
 */
export default function AdminCommandCenter({ summary }: { summary: CommandSummary }) {
  const [demoNoticeDismissed, setDemoNoticeDismissed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('uams-demo-notice-dismissed') === '1') setDemoNoticeDismissed(true);
    } catch { /* ignore */ }
  }, []);
  const dismissDemoNotice = () => {
    setDemoNoticeDismissed(true);
    try { localStorage.setItem('uams-demo-notice-dismissed', '1'); } catch { /* ignore */ }
  };

  const q = summary.approvalQueue || { pendingAdmissions: [], pendingRegistrations: [], feeExceptions: [] };
  const approvalsTotal = q.pendingAdmissions.length + q.pendingRegistrations.length + q.feeExceptions.length;
  const statusBits = summary.students.byStatus
    ? Object.entries(summary.students.byStatus).map(([k, v]) => `${v} ${k}`).join(' · ')
    : `${summary.students.programs} programmes`;

  const kpis = [
    { label: 'Fee collection', value: kes(summary.finance.collected), detail: `${kes(summary.finance.outstanding)} outstanding · ${kes(summary.finance.invoiced)} invoiced`, icon: CircleDollarSign, tone: 'green' },
    { label: 'Active students', value: `${summary.students.active} / ${summary.students.total}`, detail: statusBits, icon: Users, tone: 'blue' },
    { label: 'Pending approvals', value: String(approvalsTotal), detail: `${q.pendingAdmissions.length} admissions · ${q.pendingRegistrations.length} registrations · ${q.feeExceptions.length} fee exceptions`, icon: Clock3, tone: 'orange' },
    { label: 'Staff strength', value: `${summary.staff.active} / ${summary.staff.total}`, detail: 'Active of total staff records', icon: ShieldCheck, tone: 'rose' },
  ];

  const activity = summary.recentActivity || [];

  return (
    <div className="space-y-7">
      {!demoNoticeDismissed && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p><strong>Demonstration workspace.</strong> Counts on this page are read live from the same records as the list pages and Reports.</p>
          <button onClick={dismissDemoNotice} aria-label="Dismiss notice" className="text-amber-700 hover:text-amber-900 p-0.5"><X size={16} /></button>
        </div>
      )}

      {/* KPI row */}
      <section aria-label="Institution health" className="metric-grid">
        {kpis.map(({ label, value, detail, icon: Icon, tone }, index) => (
          <article className={`metric-card metric-${tone}`} key={label} style={{ animationDelay: `${index * 70}ms` }}>
            <div className="metric-topline">
              <span>{label}</span>
              <span className="metric-icon"><Icon size={18} strokeWidth={1.8} /></span>
            </div>
            <p className="metric-value">{value}</p>
            <div className="metric-detail"><span className="metric-mark"><ArrowUpRight size={13} /></span>{detail}</div>
          </article>
        ))}
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="flex flex-wrap gap-2.5">
        <Link href="/dashboard/students?action=register" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-academic-navy-900 hover:bg-academic-navy-800 text-white text-sm font-semibold transition">
          <UserPlus size={15} /> Register student
        </Link>
        <Link href="/dashboard/staff" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition">
          <FilePlus2 size={15} /> Register staff
        </Link>
        <Link href="/dashboard/announcements" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition">
          <Megaphone size={15} /> Broadcast announcement
        </Link>
        <Link href="/dashboard/reports" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold transition">
          <TrendingUp size={15} /> Financial report
        </Link>
      </section>

      <section className="workspace-grid">
        {/* Approval queue */}
        <article className="surface-panel course-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">PRIORITY WORKFLOWS</p><h2>Pending approvals</h2></div>
            <span className="text-xs font-semibold text-slate-500">{approvalsTotal} awaiting action</span>
          </div>
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Admissions awaiting sign-off ({q.pendingAdmissions.length})</h3>
              {q.pendingAdmissions.length === 0 ? (
                <p className="text-sm text-slate-500">No applications waiting. 🎉</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {q.pendingAdmissions.map((a) => (
                    <li key={a.id} className="py-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500">{a.program} · {a.reference} · {a.status.replace('_', ' ')}</p>
                      </div>
                      <Link href="/dashboard/admissions" className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1">Review <ArrowRight size={13} /></Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Course registrations pending ({q.pendingRegistrations.length})</h3>
              {q.pendingRegistrations.length === 0 ? (
                <p className="text-sm text-slate-500">No registrations waiting. 🎉</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {q.pendingRegistrations.map((r) => (
                    <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{r.student}</p>
                        <p className="text-xs text-slate-500">{r.course}</p>
                      </div>
                      <Link href="/dashboard/courses" className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1">Review <ArrowRight size={13} /></Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Fee clearance exceptions ({q.feeExceptions.length})</h3>
              {q.feeExceptions.length === 0 ? (
                <p className="text-sm text-slate-500">Every account is clear. 🎉</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {q.feeExceptions.map((f) => (
                    <li key={f.id} className="py-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{f.name}</p>
                        <p className="text-xs text-slate-500">{f.admission} · owes {kes(f.balance)}</p>
                      </div>
                      <Link href="/dashboard/finance" className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1">Review <ArrowRight size={13} /></Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-500">
              Grade-change requests and hostel allocation disputes are not tracked in the system yet — they will appear here once those workflows exist.
            </div>
          </div>
        </article>

        {/* Activity stream */}
        <aside className="side-stack">
          <article className="surface-panel notice-panel">
            <div className="panel-heading compact-heading">
              <div><p className="eyebrow">LIVE</p><h2>Activity stream</h2></div>
              <span className="calendar-icon"><Bell size={18} /></span>
            </div>
            {activity.length === 0 ? (
              <p className="text-sm text-slate-500">No admin activity recorded yet in this session.</p>
            ) : (
              <ul className="task-list">
                {activity.map((e, i) => (
                  <li className="task-item" key={`${e.at}-${i}`}>
                    <span className="task-icon task-blue"><ClipboardCheck size={16} /></span>
                    <span className="task-copy">
                      <strong>{e.action.replace(/_/g, ' ')}</strong>
                      <small>{e.actor}{e.detail ? ` · ${e.detail}` : ''} · {timeAgo(e.at)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link className="notice-link" href="/dashboard/audit"><ShieldCheck size={15} /> Full audit log <ArrowRight size={14} /></Link>
          </article>
        </aside>
      </section>
    </div>
  );
}
