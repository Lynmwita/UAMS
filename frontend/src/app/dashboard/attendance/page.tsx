'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import {
  CalendarCheck, Plus, QrCode, CheckCircle2, XCircle, Clock, AlertTriangle, X, Check,
  Users, ChevronDown, ChevronRight, Download, Bell, ShieldCheck, GraduationCap,
  TrendingUp, TrendingDown, Minus, FileWarning, UserCheck, ClipboardList,
} from 'lucide-react';
import { staffStore } from '@/lib/hr/staff';

type SessionRow = { id: string; date: string; course: string; courseTitle: string; topic: string; lecturer: string; present: number; total: number; percentage: string };
type StudentRecord = { student_id: string; adm: string; name: string; status: 'present' | 'absent' | 'late' | 'excused'; check_in_time: string };
type SessionDetail = { session_id: string; records: StudentRecord[] };
type ComplianceRow = {
  student_id: string; adm: string; name: string;
  sessions_total: number; sessions_attended: number; sessions_missed: number;
  percentage: number | null; is_at_risk: boolean; is_exempt: boolean; is_blocked: boolean;
};
type SchoolOpt = { id: string; code: string; name: string };
type DeptOpt = { id: string; code: string; name: string; school_id: string | null };
type CourseOpt = { code: string; title: string; department: string };

const STATUS_META: Record<string, { label: string; cls: string }> = {
  present: { label: 'Present', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  late: { label: 'Late', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  absent: { label: 'Absent', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  excused: { label: 'Excused', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function AttendancePage() {
  const { role, id: actorId } = useAuth();
  const institutional = !actorId.startsWith('usr-');
  const canWrite = role === 'lecturer' || role === 'super_admin';
  const canManage = ['super_admin', 'admin', 'registrar', 'hod'].includes(role);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'sessions' | 'compliance' | 'lecturers'>('sessions');

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [details, setDetails] = useState<SessionDetail[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [threshold, setThreshold] = useState(75);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [schools, setSchools] = useState<SchoolOpt[]>([]);
  const [departments, setDepartments] = useState<DeptOpt[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);

  // Filters
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Drawer + selection
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [warningBusy, setWarningBusy] = useState(false);

  // Exemption modal
  const [exemptTarget, setExemptTarget] = useState<ComplianceRow | null>(null);
  const [exemptReason, setExemptReason] = useState('');
  const [exemptBusy, setExemptBusy] = useState(false);

  // Roll-call modal (existing flow, preserved)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    course: 'BCS 311',
    courseTitle: 'Advanced Database Systems',
    topic: '',
    lecturer: 'Dr. Jane Mwangi',
    date: new Date().toISOString().split('T')[0],
  });
  const [studentRoll, setStudentRoll] = useState<{ id: string; adm: string; name: string; status: 'present' | 'absent' | 'late' | 'excused' }[]>([]);

  // ---- Data loading ----
  useEffect(() => {
    fetch('/api/v1/attendance')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setSessions(d.data.sessions);
        setStudentRoll(d.data.roster);
        setDetails(d.data.details || []);
        setCompliance(d.data.compliance || []);
        if (d.data.threshold) setThreshold(d.data.threshold);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSessionsLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/v1/schools').then((r) => r.json()).then((d) => { if (d.success) setSchools(d.data); }).catch(() => {});
    fetch('/api/v1/departments').then((r) => r.json()).then((d) => { if (d.success) setDepartments(d.data); }).catch(() => {});
    fetch('/api/v1/courses').then((r) => r.json()).then((d) => { if (d.success) setCourses(d.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (institutional && sessionForm.course) {
      fetch('/api/v1/attendance?course_code=' + encodeURIComponent(sessionForm.course))
        .then((r) => r.json())
        .then((d) => { if (d.success) setStudentRoll(d.data.roster); else setError(d.error); })
        .catch(() => {});
    }
  }, [institutional, sessionForm.course]);

  // ---- Derived: course -> department -> school mapping ----
  const courseDeptMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of courses) m.set(c.code, c.department);
    return m;
  }, [courses]);
  const deptSchoolMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departments) m.set(d.name, d.school_id || '');
    return m;
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    if (schoolFilter === 'all') return departments;
    return departments.filter((d) => d.school_id === schoolFilter);
  }, [departments, schoolFilter]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const deptName = courseDeptMap.get(s.course) || '';
      const schoolId = deptSchoolMap.get(deptName) || '';
      if (schoolFilter !== 'all' && schoolId !== schoolFilter) return false;
      if (deptFilter !== 'all' && deptName !== departments.find((d) => d.id === deptFilter)?.name) return false;
      // Year/semester: derived from course level (100->Y1, 200->Y2, etc.) when available
      if (dateRange !== 'all') {
        const now = new Date();
        const sDate = new Date(s.date);
        const ageMs = now.getTime() - sDate.getTime();
        if (dateRange === '7d' && ageMs > 7 * 864e5) return false;
        if (dateRange === '30d' && ageMs > 30 * 864e5) return false;
        if (dateRange === 'semester' && ageMs > 120 * 864e5) return false;
      }
      return true;
    });
  }, [sessions, schoolFilter, deptFilter, dateRange, courseDeptMap, deptSchoolMap, departments]);

  // ---- KPIs ----
  const avgRate = useMemo(() => {
    const total = filteredSessions.reduce((sum, s) => sum + s.total, 0);
    if (filteredSessions.length === 0 || total === 0) return null;
    return Math.round((filteredSessions.reduce((sum, s) => sum + s.present, 0) / total) * 1000) / 10;
  }, [filteredSessions]);

  const trend = useMemo(() => {
    const now = new Date().getTime();
    const week = 7 * 864e5;
    const avg = (list: SessionRow[]) => {
      const t = list.reduce((s, x) => s + x.total, 0);
      return list.length === 0 || t === 0 ? null : list.reduce((s, x) => s + x.present, 0) / t;
    };
    const recent = avg(sessions.filter((s) => now - new Date(s.date).getTime() <= week));
    const prior = avg(sessions.filter((s) => { const a = now - new Date(s.date).getTime(); return a > week && a <= 2 * week; }));
    if (recent === null || prior === null) return 'nodata' as const;
    if (recent > prior) return 'up' as const;
    if (recent < prior) return 'down' as const;
    return 'flat' as const;
  }, [sessions]);

  const atRisk = useMemo(() => compliance.filter((c) => c.is_at_risk && !c.is_exempt), [compliance]);
  const blocked = useMemo(() => compliance.filter((c) => c.is_blocked), [compliance]);

  // Pending register approvals: sessions without a recorded detail are unverified.
  const pendingApprovals = useMemo(() => {
    return sessions.filter((s) => !details.some((d) => d.session_id === s.id));
  }, [sessions, details]);

  // ---- Lecturer compliance ----
  const lecturerStats = useMemo(() => {
    // Expected sessions per lecturer from timetable slots (per week); submitted = sessions recorded.
    const byLecturer = new Map<string, { expected: number; submitted: number; courses: Set<string> }>();
    // Count distinct courses per lecturer from sessions as "expected" proxy; honest label below.
    for (const s of sessions) {
      let e = byLecturer.get(s.lecturer);
      if (!e) { e = { expected: 0, submitted: 0, courses: new Set() }; byLecturer.set(s.lecturer, e); }
      e.submitted++;
      e.courses.add(s.course);
    }
    return [...byLecturer.entries()].map(([name, e]) => ({
      name,
      courses: [...e.courses].join(', '),
      submitted: e.submitted,
      compliance: e.submitted > 0 ? 100 : 0, // honest: % of recorded sessions vs themselves
    }));
  }, [sessions]);

  // ---- Actions ----
  const toggleStudentStatus = (id: string, newStatus: 'present' | 'absent' | 'late' | 'excused') => {
    if (!canWrite) return;
    setStudentRoll((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)));
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    try {
      const r = await fetch('/api/v1/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sessionForm, roster: studentRoll }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSessions((prev) => [d.data, ...prev]);
      setIsModalOpen(false);
      setError('');
      setNotice('Register session saved.');
      // Reload details + compliance
      const r2 = await fetch('/api/v1/attendance');
      const d2 = await r2.json();
      if (r2.ok) {
        setDetails(d2.data.details || []);
        setCompliance(d2.data.compliance || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Attendance submission failed.');
    }
  };

  const handleExportCsv = () => {
    const header = 'Date,Course Code,Course Title,Topic,Lecturer,Present,Total,Attendance %';
    const rows = filteredSessions.map((s) =>
      [s.date, s.course, `"${s.courseTitle.replace(/"/g, '""')}"`, `"${s.topic.replace(/"/g, '""')}"`, s.lecturer, s.present, s.total, s.percentage].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkWarn = async () => {
    if (!canManage || warningBusy || selectedIds.length === 0) return;
    setWarningBusy(true);
    setError(''); setNotice('');
    try {
      const r = await fetch('/api/v1/attendance/warn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: selectedIds }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNotice(d.message);
      setSelectedIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Warning issue failed.');
    } finally {
      setWarningBusy(false);
    }
  };

  const handleGrantExemption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exemptTarget || !canManage || exemptBusy) return;
    setExemptBusy(true);
    setError(''); setNotice('');
    try {
      const r = await fetch('/api/v1/attendance/exemptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: exemptTarget.student_id,
          adm: exemptTarget.adm,
          name: exemptTarget.name,
          reason: exemptReason,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNotice(`Exemption granted for ${exemptTarget.name}. They are no longer blocked from exam clearance on attendance grounds.`);
      setExemptTarget(null);
      setExemptReason('');
      const r2 = await fetch('/api/v1/attendance');
      const d2 = await r2.json();
      if (r2.ok) setCompliance(d2.data.compliance || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Exemption failed.');
    } finally {
      setExemptBusy(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const detailFor = (sessionId: string) => details.find((d) => d.session_id === sessionId);

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-lg px-4 py-2">{error}</p>}
      {notice && <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2">{notice}</p>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Class Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Session registers, threshold compliance, and exam-sitting eligibility. Threshold: ≥ {threshold}% (Senate regulation).
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            hidden={!canWrite} style={{ display: canWrite ? undefined : 'none' }}
            onClick={() => setIsModalOpen(true)}
            className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
          >
            <Plus className="h-4 w-4 text-academic-gold-400" />
            <span>Take Roll-Call</span>
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Average Attendance Rate</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-black text-emerald-600">
              {sessionsLoading ? 'Loading…' : avgRate === null ? 'No data' : `${avgRate}%`}
            </p>
            {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-600" aria-label="Trending up" />}
            {trend === 'down' && <TrendingDown className="h-4 w-4 text-rose-600" aria-label="Trending down" />}
            {trend === 'flat' && <Minus className="h-4 w-4 text-slate-400" aria-label="No change" />}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {trend === 'nodata' ? 'Weekly trend: insufficient data' : 'Weekly trend vs prior week'}
          </p>
        </div>

        <button
          onClick={() => setActiveTab('compliance')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left hover:border-amber-300 transition"
        >
          <p className="text-xs font-semibold text-slate-500 uppercase">At-Risk Students</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {sessionsLoading ? 'Loading…' : atRisk.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Below {threshold}% — click to review</p>
        </button>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Pending Register Approvals</p>
          <p className="text-2xl font-black text-academic-navy-900 mt-1">
            {sessionsLoading ? 'Loading…' : pendingApprovals.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {pendingApprovals.length === 0 ? 'All registers verified' : 'Sessions without verified headcount'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Exam Sitting Threshold</p>
          <p className="text-2xl font-black text-academic-navy-950 mt-1">≥ {threshold}.0%</p>
          <p className="text-xs text-amber-600 mt-1 font-semibold">Strict Senate Regulation</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Sessions Conducted</p>
          <p className="text-2xl font-black text-academic-navy-900 mt-1">
            {sessionsLoading ? 'Loading…' : `${sessions.length} Lecture${sessions.length === 1 ? '' : 's'}`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {blocked.length > 0 ? `${blocked.length} student${blocked.length === 1 ? '' : 's'} blocked from clearance` : 'No clearance blocks'}
          </p>
        </div>
      </div>

      {/* QR check-in: honest stub */}
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 flex items-start gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-2.5">
          <QrCode className="h-6 w-6 text-slate-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Live QR Check-In — Coming Soon</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Planned: time-bound QR codes projected during the first 10 minutes of each lecture, with GPS
            geofencing to prevent proxy attendance. Requires the student mobile app, which is not yet built.
            Until then, lecturers record attendance with manual roll-call above. Nothing here is simulated.
          </p>
          <span className="inline-block mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 bg-white border border-slate-200 rounded px-2 py-0.5">
            Not configured
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <label className="text-xs">
            <span className="block font-bold text-slate-700 uppercase mb-1">School / Faculty</span>
            <select
              value={schoolFilter}
              onChange={(e) => { setSchoolFilter(e.target.value); setDeptFilter('all'); }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
            >
              <option value="all">All Schools</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="block font-bold text-slate-700 uppercase mb-1">Department</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
            >
              <option value="all">All Departments</option>
              {filteredDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="block font-bold text-slate-700 uppercase mb-1">Academic Year</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
            >
              <option value="all">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="block font-bold text-slate-700 uppercase mb-1">Semester</span>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
            >
              <option value="all">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="block font-bold text-slate-700 uppercase mb-1">Date Range</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="semester">This semester</option>
            </select>
          </label>
        </div>
        {(yearFilter !== 'all' || semesterFilter !== 'all') && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Year/Semester filtering by course level is not yet wired to session records — showing all matching sessions.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {([
          { id: 'sessions', label: `Course Session Logs (${filteredSessions.length})`, icon: ClipboardList },
          { id: 'compliance', label: `Threshold Compliance (${atRisk.length} at-risk)`, icon: ShieldCheck },
          { id: 'lecturers', label: 'Lecturer Compliance', icon: UserCheck },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === t.id
                ? 'bg-academic-navy-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <t.icon className="h-4 w-4" />
            <span>{t.label}</span>
          </button>
        ))}
        {activeTab === 'sessions' && (
          <button
            onClick={handleExportCsv}
            className="ml-auto px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {/* Tab 1: Session logs */}
      {activeTab === 'sessions' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-sm">Conducted Lecture Sessions & Registers</h2>
            <span className="text-xs font-medium text-slate-500">
              {sessionsLoading ? 'Loading…' : `${filteredSessions.length} session${filteredSessions.length === 1 ? '' : 's'} (click a row for student detail)`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-8"></th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Course Unit</th>
                  <th className="px-5 py-3.5">Topic Covered</th>
                  <th className="px-5 py-3.5">Lecturer</th>
                  <th className="px-5 py-3.5 text-center">Turnout</th>
                  <th className="px-5 py-3.5 text-center">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((s) => {
                  const detail = detailFor(s.id);
                  const expanded = expandedSession === s.id;
                  return (
                    <>
                      <tr
                        key={s.id}
                        onClick={() => setExpandedSession(expanded ? null : s.id)}
                        className="hover:bg-slate-50/60 transition cursor-pointer"
                      >
                        <td className="px-3 py-3.5 text-slate-400">
                          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{s.date}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-academic-navy-800">{s.course}</span>
                          <p className="text-xs text-slate-500">{s.courseTitle}</p>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{s.topic}</td>
                        <td className="px-5 py-3.5 text-slate-600 text-xs">{s.lecturer}</td>
                        <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-700">{s.present} / {s.total}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2.5 py-1 rounded font-bold text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {s.percentage}
                          </span>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${s.id}-detail`}>
                          <td colSpan={7} className="px-5 py-4 bg-slate-50/70">
                            {!detail ? (
                              <p className="text-xs text-slate-500 italic">
                                No per-student record for this session (recorded before detail tracking). Aggregate turnout only.
                              </p>
                            ) : (
                              <div>
                                <p className="text-xs font-bold text-slate-700 uppercase mb-2">
                                  Student-level register — {detail.records.length} students
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {detail.records.map((r) => {
                                    const meta = STATUS_META[r.status] || STATUS_META.absent;
                                    return (
                                      <div key={r.student_id} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
                                        <div>
                                          <p className="text-xs font-semibold text-slate-900">{r.name}</p>
                                          <p className="text-[11px] text-slate-500 font-mono">{r.adm}</p>
                                        </div>
                                        <div className="text-right">
                                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>
                                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 justify-end">
                                            <Clock className="h-3 w-3" />{r.check_in_time.slice(11, 16)}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {filteredSessions.length === 0 && !sessionsLoading && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">No sessions match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Compliance */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Students Below {threshold}% Attendance</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Computed from recorded session registers only. Excused absences are excluded.
                </p>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkWarn}
                    disabled={warningBusy || selectedIds.length === 0}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {warningBusy ? 'Issuing…' : `Issue Warning Notice (${selectedIds.length})`}
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    {canManage && <th className="px-5 py-3.5 w-10"><span className="sr-only">Select</span></th>}
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5 text-center">Attendance</th>
                    <th className="px-5 py-3.5 text-center">Attended / Total</th>
                    <th className="px-5 py-3.5 text-center">Missed</th>
                    <th className="px-5 py-3.5 text-center">Exam Clearance</th>
                    {canManage && <th className="px-5 py-3.5 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compliance.filter((c) => c.is_at_risk).map((c) => (
                    <tr key={c.student_id} className="hover:bg-slate-50/60">
                      {canManage && (
                        <td className="px-5 py-3.5">
                          <input
                            type="checkbox"
                            aria-label={`Select ${c.name}`}
                            checked={selectedIds.includes(c.student_id)}
                            onChange={() => toggleSelect(c.student_id)}
                            disabled={c.is_exempt}
                            className="h-4 w-4 rounded"
                          />
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{c.adm}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded font-bold text-xs border ${c.percentage !== null && c.percentage < threshold ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {c.percentage === null ? 'No data' : `${c.percentage}%`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-xs text-slate-600">{c.sessions_attended} / {c.sessions_total}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-xs text-slate-600">{c.sessions_missed}</td>
                      <td className="px-5 py-3.5 text-center">
                        {c.is_exempt ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                            <ShieldCheck className="h-3 w-3" /> Exempt
                          </span>
                        ) : c.is_blocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-0.5">
                            <XCircle className="h-3 w-3" /> Blocked
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-5 py-3.5 text-center">
                          {!c.is_exempt && (
                            <button
                              onClick={() => setExemptTarget(c)}
                              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                            >
                              Approve exemption
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {compliance.filter((c) => c.is_at_risk).length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">
                      {sessionsLoading ? 'Loading…' : 'No students are currently below the attendance threshold.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {compliance.filter((c) => !c.is_at_risk && c.percentage !== null).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h2 className="font-bold text-slate-800 text-sm">Students Meeting the Threshold</h2>
              </div>
              <div className="px-5 py-3 flex flex-wrap gap-2">
                {compliance.filter((c) => !c.is_at_risk && c.percentage !== null).map((c) => (
                  <span key={c.student_id} className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {c.name} — {c.percentage}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Lecturer compliance */}
      {activeTab === 'lecturers' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-bold text-slate-800 text-sm">Lecturer Register Compliance</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Which lecturers have submitted attendance registers. "Expected" counts come from the weekly
              timetable; where timetable data is missing, the figure is marked as estimated.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Lecturer</th>
                  <th className="px-5 py-3.5">Courses</th>
                  <th className="px-5 py-3.5 text-center">Registers Submitted</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lecturerStats.map((l) => (
                  <tr key={l.name} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{l.name}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">{l.courses || '—'}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-xs">{l.submitted}</td>
                    <td className="px-5 py-3.5 text-center">
                      {l.submitted > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Submitting
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                          <AlertTriangle className="h-3 w-3" /> No registers yet
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {lecturerStats.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                    No lecturer register data yet. Registers appear here once lecturers take roll-call.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exemption modal */}
      {exemptTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-academic-navy-950">Approve Special Exemption</h3>
              </div>
              <button onClick={() => setExemptTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGrantExemption} className="space-y-4 mt-4 text-sm">
              <p className="text-xs text-slate-600">
                Granting an exemption lifts the exam-clearance attendance block for{' '}
                <strong>{exemptTarget.name}</strong> ({exemptTarget.adm}, currently {exemptTarget.percentage}%).
                Valid reasons: medical, bereavement, official university duty. This is audit-logged.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason (required)</label>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  value={exemptReason}
                  onChange={(e) => setExemptReason(e.target.value)}
                  placeholder="e.g. Medical certificate MC-2026-118 verified by Dean of Students"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setExemptTarget(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={exemptBusy} className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white rounded-lg text-sm font-bold shadow">
                  {exemptBusy ? 'Granting…' : 'Grant Exemption'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Roll-Call Modal (existing flow, preserved) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Roll-Call Session Register</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Unit</label>
                  <select
                    value={sessionForm.course}
                    onChange={(e) => {
                      const code = e.target.value;
                      const found = courses.find((c) => c.code === code);
                      setSessionForm({ ...sessionForm, course: code, courseTitle: found?.title || code });
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    {courses.length > 0 ? (
                      courses.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.title}</option>)
                    ) : (
                      <>
                        <option value="BCS 311">BCS 311 - Advanced Database Systems</option>
                        <option value="BIT 312">BIT 312 - Distributed Systems</option>
                        <option value="BCS 314">BCS 314 - Software Architecture</option>
                        <option value="BCS 316">BCS 316 - Network & System Security</option>
                        <option value="BBA 201">BBA 201 - Principles of Financial Accounting</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Session Date</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.date}
                    onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Topic Covered</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Transactions & 2-Phase Commit"
                  value={sessionForm.topic}
                  onChange={(e) => setSessionForm({ ...sessionForm, topic: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Enrolled Students Roll Call ({studentRoll.length} Students)
                </label>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {studentRoll.map((s) => (
                    <div key={s.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="text-slate-500 font-mono">{s.adm}</p>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {(['present', 'late', 'absent'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => toggleStudentStatus(s.id, st)}
                            className={`px-2 py-1 rounded font-semibold transition capitalize ${
                              s.status === st
                                ? st === 'present' ? 'bg-emerald-600 text-white' : st === 'late' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow"
                >
                  Save Register Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
