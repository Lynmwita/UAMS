'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CircleDollarSign,
  CreditCard,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  GraduationCap,
  Megaphone,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { canAccessPage } from '@/lib/auth/roles';
import { ROLE_LABELS, roleHasPermission } from '@/lib/auth/rbac';
import InstitutionalDashboard from './InstitutionalDashboard';
import LibrarianDashboard from './LibrarianDashboard';
import SupportStaffDashboard from './SupportStaffDashboard';

type Summary = {
  generated_at: string;
  students: { total: number; active: number; programs: number };
  staff: { total: number; active: number };
  courses: { total: number; active: number };
  applications: { total: number };
  registrations: { total: number; approved: number; pending: number };
  finance: { invoiced: number; collected: number; outstanding: number; invoices_issued: number; accounts_with_outstanding_balance: number };
  attendance: { sessions: number; average_percentage: number | null };
  catalogue: { code: string; title: string; department: string; status: string; approved_registrations: number }[];
  student: { name: string; cgpa: number; fee_balance: number; approved_registrations: number } | null;
  lecturer: { teaching_units: number; approved_registrations: number; distinct_students: number; units_with_marks: number } | null;
};

const kes = (n: number) => 'KES ' + n.toLocaleString('en-KE');

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardExperience() {
  const session = useAuth();
  const { role, id, firstName } = session;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [now] = useState(() => new Date());
  useEffect(() => {
    if (!id.startsWith('usr-') || role === 'librarian' || role === 'support_staff') return;
    let cancelled = false;
    fetch('/api/v1/dashboard-summary', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !d.success) throw new Error(d.error || 'Dashboard records could not be loaded.');
        if (!cancelled) setSummary(d.data);
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id, role]);
  if (!id.startsWith('usr-')) return <InstitutionalDashboard />;
  if (role === 'librarian') return <LibrarianDashboard />;
  if (role === 'support_staff') return <SupportStaffDashboard />;

  const metrics: { label: string; value: string; detail: string; icon: typeof Users; tone: string }[] = summary
    ? role === 'student' && summary.student
      ? [
          { label: 'Cumulative GPA', value: summary.student.cgpa.toFixed(2), detail: 'Registry CGPA, all semesters', icon: GraduationCap, tone: 'green' },
          { label: 'Approved registrations', value: String(summary.student.approved_registrations), detail: 'Course units approved', icon: BookOpen, tone: 'blue' },
          { label: 'Recorded attendance', value: summary.attendance.average_percentage === null ? 'No sessions yet' : summary.attendance.average_percentage.toFixed(1) + '%', detail: summary.attendance.sessions + ' recorded session' + (summary.attendance.sessions === 1 ? '' : 's'), icon: ClipboardCheck, tone: 'orange' },
          { label: 'Fee balance', value: kes(summary.student.fee_balance), detail: 'From your invoice ledger', icon: CircleDollarSign, tone: 'rose' },
        ]
      : role === 'finance_officer'
        ? [
            { label: 'Fees billed', value: kes(summary.finance.invoiced), detail: summary.finance.invoices_issued + ' invoices issued', icon: CircleDollarSign, tone: 'green' },
            { label: 'Collections', value: kes(summary.finance.collected), detail: 'Allocated fee payments', icon: TrendingUp, tone: 'blue' },
            { label: 'Outstanding', value: kes(summary.finance.outstanding), detail: summary.finance.accounts_with_outstanding_balance + ' account(s) with a balance', icon: Users, tone: 'rose' },
            { label: 'Invoices issued', value: String(summary.finance.invoices_issued), detail: 'From the invoice ledger', icon: ClipboardCheck, tone: 'orange' },
          ]
        : role === 'lecturer' && summary.lecturer
          ? [
              { label: 'Teaching units', value: String(summary.lecturer.teaching_units), detail: 'Your current teaching allocation', icon: BookOpen, tone: 'green' },
              { label: 'Approved registrations', value: String(summary.lecturer.approved_registrations), detail: 'In your course scope', icon: Users, tone: 'blue' },
              { label: 'Distinct students', value: String(summary.lecturer.distinct_students), detail: 'In your course scope', icon: Users, tone: 'orange' },
              { label: 'Marks recorded', value: summary.lecturer.units_with_marks + ' of ' + summary.lecturer.teaching_units, detail: summary.lecturer.units_with_marks < summary.lecturer.teaching_units ? 'Units still awaiting marks' : 'All teaching units have marks', icon: ClipboardCheck, tone: 'rose' },
            ]
          : [
              { label: 'Student records', value: String(summary.students.total), detail: summary.students.active + ' active, ' + summary.students.programs + ' programmes', icon: Users, tone: 'green' },
              { label: 'Course units', value: String(summary.courses.total), detail: summary.courses.active + ' active in the catalogue', icon: GraduationCap, tone: 'blue' },
              { label: 'Staff records', value: String(summary.staff.total), detail: summary.staff.active + ' active staff', icon: BookOpen, tone: 'orange' },
              { label: 'Applications', value: String(summary.applications.total), detail: summary.registrations.pending + ' course registrations pending', icon: TrendingUp, tone: 'rose' },
            ]
    : [];

  const courses = summary ? summary.catalogue : [];
  const tasks = summary
    ? [
        { title: 'Fee clearance review', detail: summary.finance.accounts_with_outstanding_balance + ' account(s) with an outstanding balance', icon: CircleDollarSign, tone: 'blue' },
        { title: 'Course registrations pending', detail: summary.registrations.pending + ' awaiting approval', icon: Clock3, tone: 'orange' },
      ]
    : [];

  return (
    <div className="dashboard-page space-y-7">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">{now.toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()} <span /> ACADEMIC YEAR 2026/27</p>
          <h1>{role === 'super_admin' ? `${greetingFor(now)}, Administrator` : firstName ? `${greetingFor(now)}, ${firstName}` : `${greetingFor(now)}, ${ROLE_LABELS[role]}`}</h1>
          <p className="heading-caption">Here is what is happening across your university today.</p>
        </div>
        <div className="heading-tools">
          <span className="session-pill"><span className="session-dot" /> Semester 1 in session</span>
          {roleHasPermission(role, 'students:read') && <Link style={{ display: canAccessPage(role, 'students') ? undefined : 'none' }} className="search-link" href="/dashboard/students" aria-label="Search student records"><Search size={17} /></Link>}
          <Link className="primary-action" href={role === 'audit_officer' ? '/dashboard/audit' : role === 'student' || role === 'finance_officer' ? '/dashboard/finance' : roleHasPermission(role, 'students:write') ? '/dashboard/students?action=register' : '/dashboard/courses'}>
            <FilePlus2 size={16} />
            {role === 'audit_officer' ? 'Inspect Audit Logs' : role === 'student' ? 'Make a payment' : role === 'finance_officer' ? 'Review payments' : roleHasPermission(role, 'students:write') ? 'Register student' : 'View courses'}
          </Link>
        </div>
      </section>

      {!summary && !error && <p role="status">Loading dashboard records…</p>}
      {error && <p role="alert" className="border border-amber-300 rounded p-4 text-amber-900">{error}</p>}

      {summary && (
        <>
          <section aria-label="Institution overview" className="metric-grid">
            {metrics.map(({ label, value, detail, icon: Icon, tone }, index) => (
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

          {(role === 'super_admin' || role === 'admin' || role === 'registrar' || role === 'hod') && (
            <p className="text-sm text-slate-600">Active students: {summary.students.active} of {summary.students.total} student records.</p>
          )}

          <section className="workspace-grid">
            <article className="surface-panel course-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">ACADEMIC OVERVIEW</p><h2>{role === 'student' ? 'Your registered units' : role === 'lecturer' ? 'Your teaching units' : 'Course catalogue'}</h2></div>
                <Link style={{ display: canAccessPage(role, 'courses') ? undefined : 'none' }} href="/dashboard/courses" className="text-link">View catalogue <ArrowRight size={15} /></Link>
              </div>
              <div className="table-wrap">
                <table className="overview-table">
                  <thead><tr><th scope="col">Course</th><th scope="col">Department</th><th scope="col">Approved registrations</th><th scope="col">Status</th><th scope="col"><span className="sr-only">More</span></th></tr></thead>
                  <tbody>{courses.map((course) => (
                    <tr key={course.code}>
                      <td><span className="course-code">{course.code}</span><span className="course-title">{course.title}</span></td>
                      <td className="muted-cell">{course.department}</td>
                      <td className="number-cell">{course.approved_registrations}</td>
                      <td><span className={`status-badge ${course.status === 'Active' || course.status === 'approved' ? 'status-active' : 'status-review'}`}><span />{course.status}</span></td>
                      <td><Link style={{ display: canAccessPage(role, 'courses') ? undefined : 'none' }} className="row-action" href="/dashboard/courses" aria-label={`Open ${course.code}`}><MoreHorizontal size={18} /></Link></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="table-footnote"><span><Check size={14} /> Catalogue data retrieved {new Date(summary.generated_at).toLocaleString('en-KE')}</span><span>Showing {courses.length} of {role === 'student' ? courses.length + ' registered units' : summary.courses.total + ' catalogue units'}</span></div>
            </article>

            <aside className="side-stack">
              <article className="surface-panel notice-panel">
                <div className="panel-heading compact-heading">
                  <div><p className="eyebrow">KEEP ON TRACK</p><h2>Coming up</h2></div>
                  <span className="calendar-icon"><CalendarDays size={18} /></span>
                </div>
                <div className="task-list">
                  {tasks.map(({ title, detail, icon: Icon, tone }) => (
                    <div className="task-item" key={title}>
                      <span className={`task-icon task-${tone}`}><Icon size={16} /></span>
                      <span className="task-copy"><strong>{title}</strong><small>{detail}</small></span>
                      <ArrowRight className="task-arrow" size={15} />
                    </div>
                  ))}
                </div>
                <Link style={{ display: canAccessPage(role, 'announcements') ? undefined : 'none' }} className="notice-link" href="/dashboard/announcements"><Megaphone size={15} /> All announcements <ArrowRight size={14} /></Link>
              </article>

              <article className="focus-panel">
                <div className="focus-top"><span className="focus-symbol"><ShieldCheck size={18} /></span><span>INSTITUTIONAL STATUS</span></div>
                <h2>Live demo records</h2>
                <p>Counts on this page are read from the same records as the list pages and Reports. Records retrieved {new Date(summary.generated_at).toLocaleString('en-KE')}.</p>
                <Link style={{ display: canAccessPage(role, 'audit') ? undefined : 'none' }} href="/dashboard/audit">View system activity <ArrowUpRight size={15} /></Link>
              </article>
            </aside>
          </section>
        </>
      )}

      <section className="shortcut-strip" aria-label="Quick access">
        <div className="shortcut-title"><span className="shortcut-rule" /><span>QUICK ACCESS</span></div>
        <Link style={{ display: canAccessPage(role, 'students') ? undefined : 'none' }} href="/dashboard/students"><Users size={17} /> Student records <ArrowUpRight size={14} /></Link>
        <Link style={{ display: canAccessPage(role, 'ai') ? undefined : 'none' }} href="/dashboard/ai"><Sparkles size={17} /> AI Advisor <ArrowUpRight size={14} /></Link>
        <Link style={{ display: canAccessPage(role, 'finance') ? undefined : 'none' }} href="/dashboard/finance"><CreditCard size={17} /> Finance desk <ArrowUpRight size={14} /></Link>
        <Link style={{ display: canAccessPage(role, 'attendance') ? undefined : 'none' }} href="/dashboard/attendance"><ClipboardCheck size={17} /> Attendance <ArrowUpRight size={14} /></Link>
        <Link style={{ display: canAccessPage(role, 'announcements') ? undefined : 'none' }} href="/dashboard/announcements"><Megaphone size={17} /> Announcements <ArrowUpRight size={14} /></Link>
      </section>
    </div>
  );
}
