'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeAlert,
  FileWarning,
  ShieldCheck,
  ShieldAlert,
  UserX,
} from 'lucide-react';

type ComplianceSummary = {
  pendingWaivers: number;
  gradeModifications: { id: string; course: string; student: string; at: string; actor: string; reason: string }[];
  attendanceBreaches: number;
  failedLogins: number;
  recentActivity: { action: string; actor: string; at: string; detail: string }[];
};

/**
 * Risk & Compliance Control Center for the Audit & Compliance Officer.
 *
 * Segregation of duties: this dashboard is strictly read-only and stripped of
 * ALL operational creation tools (no Register student, no Finance desk triggers,
 * no course management). The auditor monitors; they never operate.
 */
export default function AuditOfficerDashboard() {
  const [data, setData] = useState<ComplianceSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/audit/compliance-summary', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.success) throw new Error(d.error || 'Compliance data could not be loaded.');
        if (!cancelled) setData(d.data);
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const kpis = data
    ? [
        {
          label: 'Pending fee waivers',
          value: String(data.pendingWaivers),
          detail: 'Students cleared without 100% payment — need review',
          icon: BadgeAlert,
          tone: data.pendingWaivers > 0 ? 'amber' : 'green',
        },
        {
          label: 'Grade modifications',
          value: String(data.gradeModifications.length),
          detail: 'Post-approval changes logged this week',
          icon: FileWarning,
          tone: data.gradeModifications.length > 0 ? 'amber' : 'green',
        },
        {
          label: 'Attendance breaches',
          value: String(data.attendanceBreaches),
          detail: 'Students below 75% threshold',
          icon: AlertTriangle,
          tone: data.attendanceBreaches > 0 ? 'rose' : 'green',
        },
        {
          label: 'Failed logins',
          value: String(data.failedLogins),
          detail: 'Authentication failures under review',
          icon: UserX,
          tone: data.failedLogins > 0 ? 'rose' : 'green',
        },
      ]
    : [];

  return (
    <div className="dashboard-page space-y-7">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">RISK & COMPLIANCE CONTROL CENTER</p>
          <h1>
            <ShieldCheck className="inline h-8 w-8 mr-2 text-emerald-700" />
            Oversight Dashboard
          </h1>
          <p className="heading-caption">
            Independent monitoring only. This view is read-only — no operational actions are available to preserve audit neutrality.
          </p>
        </div>
        <div className="heading-tools">
          <Link className="primary-action" href="/dashboard/audit">
            <ShieldAlert size={16} />
            Inspect Audit Logs
          </Link>
        </div>
      </section>

      {!data && !error && <p role="status">Loading compliance data…</p>}
      {error && <p role="alert" className="border border-amber-300 rounded p-4 text-amber-900">{error}</p>}

      {data && (
        <>
          <section aria-label="Compliance indicators" className="metric-grid">
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

          <section className="workspace-grid">
            <article className="surface-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">READ-ONLY ACTIVITY STREAM</p>
                  <h2>Critical system events</h2>
                </div>
                <Link href="/dashboard/audit" className="text-link">Full audit log <ArrowRight size={15} /></Link>
              </div>
              <div className="table-wrap">
                {data.recentActivity.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No critical events recorded.</p>
                ) : (
                  <table className="overview-table">
                    <thead><tr><th scope="col">Event</th><th scope="col">Actor</th><th scope="col">Time</th></tr></thead>
                    <tbody>
                      {data.recentActivity.slice(0, 10).map((event, i) => (
                        <tr key={i}>
                          <td><span className="font-medium">{event.action}</span><span className="course-title">{event.detail}</span></td>
                          <td className="muted-cell">{event.actor}</td>
                          <td className="muted-cell text-xs">{new Date(event.at).toLocaleString('en-KE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="table-footnote">
                <span><ShieldCheck size={14} /> This feed is un-editable. All events are preserved permanently.</span>
              </div>
            </article>

            <aside className="side-stack">
              <article className="surface-panel notice-panel">
                <div className="panel-heading compact-heading">
                  <div><p className="eyebrow">GRADE MODIFICATIONS</p><h2>Flags this week</h2></div>
                </div>
                {data.gradeModifications.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No post-approval grade changes this week.</p>
                ) : (
                  <div className="task-list">
                    {data.gradeModifications.slice(0, 5).map((g) => (
                      <div className="task-item" key={g.id}>
                        <span className="task-icon task-amber"><FileWarning size={16} /></span>
                        <span className="task-copy"><strong>{g.course} — {g.student}</strong><small>{g.reason}</small></span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="focus-panel">
                <div className="focus-top"><span className="focus-symbol"><ShieldCheck size={18} /></span><span>SEGRAGATION OF DUTIES</span></div>
                <h2>Read-only access</h2>
                <p>As Audit & Compliance Officer, you can inspect but never modify records. Operational actions (registering students, managing finances, approving grades) are intentionally unavailable in this view.</p>
                <Link href="/dashboard/audit">View system activity <ArrowUpRight size={15} /></Link>
              </article>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
