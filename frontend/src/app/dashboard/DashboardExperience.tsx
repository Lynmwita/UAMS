'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  TrendingUp,
  Users,
} from 'lucide-react';
import { UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/auth/rbac';

const courses = [
  { code: 'CSC101', title: 'Introduction to Computer Science', department: 'Computing', enrolled: '124', status: 'Active' },
  { code: 'CSC301', title: 'Database Systems and Architecture', department: 'Computing', enrolled: '86', status: 'Active' },
  { code: 'BUS214', title: 'Business Information Systems', department: 'Business', enrolled: '72', status: 'Review' },
];

export default function DashboardExperience() {
  const searchParams = useSearchParams();
  const role = (searchParams.get('role') as UserRole) || 'super_admin';
  const metrics = role === 'student'
    ? [
        { label: 'Semester GPA', value: '3.82', detail: 'Cumulative 3.75', icon: GraduationCap, tone: 'green' },
        { label: 'Registered units', value: '06', detail: '18 credit hours', icon: BookOpen, tone: 'blue' },
        { label: 'Attendance', value: '94.5%', detail: 'Above 75% threshold', icon: ClipboardCheck, tone: 'orange' },
        { label: 'Fee balance', value: 'KSh 15k', detail: 'Of KSh 75,000 billed', icon: CircleDollarSign, tone: 'rose' },
      ]
    : role === 'finance_officer'
      ? [
          { label: 'Fees billed', value: 'KSh 128.4M', detail: 'Semester 1 invoices', icon: CircleDollarSign, tone: 'green' },
          { label: 'Collections', value: 'KSh 94.2M', detail: '73.3% collection rate', icon: TrendingUp, tone: 'blue' },
          { label: 'Outstanding', value: 'KSh 34.2M', detail: 'Across 812 students', icon: Users, tone: 'rose' },
          { label: 'Needs review', value: '28 slips', detail: 'Awaiting verification', icon: ClipboardCheck, tone: 'orange' },
        ]
      : role === 'lecturer'
        ? [
            { label: 'Teaching units', value: '03', detail: 'Across 3 class groups', icon: BookOpen, tone: 'green' },
            { label: 'Enrolled students', value: '240', detail: 'Across all units', icon: Users, tone: 'blue' },
            { label: 'Marks submitted', value: '2 of 3', detail: 'CSC401 needs attention', icon: ClipboardCheck, tone: 'orange' },
            { label: 'Today’s classes', value: '02', detail: 'Next class at 10:00', icon: CalendarDays, tone: 'rose' },
          ]
        : [
            { label: 'Active students', value: '4,820', detail: '12% above last year', icon: Users, tone: 'green' },
            { label: 'Academic programs', value: '34', detail: 'Undergraduate and postgraduate', icon: GraduationCap, tone: 'blue' },
            { label: 'Faculty and staff', value: '186', detail: 'Across 14 departments', icon: BookOpen, tone: 'orange' },
            { label: 'Registration', value: '96.8%', detail: 'Window is open', icon: TrendingUp, tone: 'rose' },
          ];

  const tasks = [
    { title: 'Course registration closes', detail: 'October 15, 2026', icon: Clock3, tone: 'orange' },
    { title: 'Fee clearance review', detail: '812 student accounts', icon: CircleDollarSign, tone: 'blue' },
  ];

  return (
    <div className="dashboard-page space-y-7">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">MONDAY, OCTOBER 5, 2026 <span /> ACADEMIC YEAR 2026/27</p>
          <h1>{role === 'super_admin' ? 'Good morning, Administrator' : `Welcome back, ${ROLE_LABELS[role]}`}</h1>
          <p className="heading-caption">Here is what is happening across your university today.</p>
        </div>
        <div className="heading-tools">
          <span className="session-pill"><span className="session-dot" /> Semester 1 in session</span>
          <Link className="search-link" href="/dashboard/students" aria-label="Search student records"><Search size={17} /></Link>
          <Link className="primary-action" href={role === 'student' ? '/dashboard/finance' : '/dashboard/students'}>
            <FilePlus2 size={16} />
            {role === 'student' ? 'Make a payment' : 'Register student'}
          </Link>
        </div>
      </section>

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

      <section className="workspace-grid">
        <article className="surface-panel course-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">ACADEMIC OVERVIEW</p><h2>{role === 'student' ? 'Your registered units' : role === 'lecturer' ? 'Your teaching units' : 'Course catalogue'}</h2></div>
            <Link href="/dashboard/courses" className="text-link">View catalogue <ArrowRight size={15} /></Link>
          </div>
          <div className="table-wrap">
            <table className="overview-table">
              <thead><tr><th scope="col">Course</th><th scope="col">Department</th><th scope="col">Enrolled</th><th scope="col">Status</th><th scope="col"><span className="sr-only">More</span></th></tr></thead>
              <tbody>{courses.map((course) => (
                <tr key={course.code}>
                  <td><span className="course-code">{course.code}</span><span className="course-title">{course.title}</span></td>
                  <td className="muted-cell">{course.department}</td>
                  <td className="number-cell">{course.enrolled}</td>
                  <td><span className={`status-badge ${course.status === 'Active' ? 'status-active' : 'status-review'}`}><span />{course.status}</span></td>
                  <td><Link className="row-action" href="/dashboard/courses" aria-label={`Open ${course.code}`}><MoreHorizontal size={18} /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="table-footnote"><span><Check size={14} /> Catalogue data refreshed today</span><span>Showing 3 of 34 programs</span></div>
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
            <Link className="notice-link" href="/dashboard/announcements"><Megaphone size={15} /> All announcements <ArrowRight size={14} /></Link>
          </article>

          <article className="focus-panel">
            <div className="focus-top"><span className="focus-symbol"><ShieldCheck size={18} /></span><span>INSTITUTIONAL STATUS</span></div>
            <h2>All systems are running smoothly</h2>
            <p>Academic services are available. Last system check completed at 09:42.</p>
            <Link href="/dashboard/audit">View system activity <ArrowUpRight size={15} /></Link>
          </article>
        </aside>
      </section>

      <section className="shortcut-strip" aria-label="Quick access">
        <div className="shortcut-title"><span className="shortcut-rule" /><span>QUICK ACCESS</span></div>
        <Link href="/dashboard/students"><Users size={17} /> Student records <ArrowUpRight size={14} /></Link>
        <Link href="/dashboard/finance"><CreditCard size={17} /> Finance desk <ArrowUpRight size={14} /></Link>
        <Link href="/dashboard/attendance"><ClipboardCheck size={17} /> Attendance <ArrowUpRight size={14} /></Link>
        <Link href="/dashboard/announcements"><Megaphone size={17} /> Announcements <ArrowUpRight size={14} /></Link>
      </section>
    </div>
  );
}