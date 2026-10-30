'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { roleHasPermission } from '@/lib/auth/rbac';
import {
  FileCheck2, Calendar, ShieldCheck, CheckCircle2, QrCode, AlertTriangle, Printer,
  Download, Stamp, ScanLine, X, ChevronDown, RefreshCw, MapPin, Building2, Armchair,
} from 'lucide-react';
import { ExamSchedule, ExamClearanceCard, ExamClearanceStatus, ExamWaiver } from '@/types';

type Tab = 'ledger' | 'waivers' | 'timetable' | 'new_exam';

const STATUS_LABEL: Record<ExamClearanceStatus, string> = {
  cleared: 'Cleared',
  blocked_fee: 'Blocked',
  blocked_attendance: 'Blocked',
  waived: 'Waived',
};

const STATUS_STYLE: Record<ExamClearanceStatus, string> = {
  cleared: 'bg-emerald-100 text-emerald-800',
  blocked_fee: 'bg-rose-100 text-rose-800',
  blocked_attendance: 'bg-rose-100 text-rose-800',
  waived: 'bg-amber-100 text-amber-800',
};

const WAIVER_TYPE_LABEL: Record<string, string> = {
  gov_disbursement_delay: 'Government-sponsored disbursement delay',
  payment_plan: 'Approved payment plan',
  scholarship: 'Scholarship beneficiary',
  other: 'Other',
};

function statusReason(c: ExamClearanceCard): string {
  if (c.status === 'blocked_attendance') return 'Blocked: attendance below 75%';
  if (c.status === 'blocked_fee') return `Blocked: fee balance KES ${c.fee_balance.toLocaleString()}`;
  if (c.status === 'waived') return `Waived until ${c.waiver?.valid_until}`;
  return `Cleared (${c.fee_paid_percentage}% paid)`;
}

export default function ExamsPage() {
  const { role } = useAuth();
  const canSchedule = roleHasPermission(role, 'exams:schedule');
  const canWaive = ['super_admin', 'admin', 'finance_officer', 'hod'].includes(role || '');
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [cards, setCards] = useState<ExamClearanceCard[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [waivers, setWaivers] = useState<ExamWaiver[]>([]);
  const [clearanceThreshold, setClearanceThreshold] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('ledger');

  // Ledger filters + selection
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ExamClearanceStatus>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  // Modals
  const [passCard, setPassCard] = useState<ExamClearanceCard | null>(null);
  const [waiverCard, setWaiverCard] = useState<ExamClearanceCard | null>(null);
  const [waiverForm, setWaiverForm] = useState({ waiver_type: 'payment_plan', valid_until: '', reason: '' });
  const [waiverError, setWaiverError] = useState('');
  const [waiverScope, setWaiverScope] = useState<'active' | 'expired' | 'revoked'>('active');

  // Venue editing
  const [venueEdits, setVenueEdits] = useState<Record<string, { venue: string; building: string; seat_range: string }>>({});
  const [venueSaving, setVenueSaving] = useState<string | null>(null);

  // Schedule form (kept from original)
  const [newExam, setNewExam] = useState({
    course_code: 'BCS 311',
    course_title: 'Advanced Database Systems',
    exam_date: '2026-12-07',
    start_time: '09:00 AM',
    end_time: '12:00 PM',
    venue: 'Multi-Purpose Hall A',
    chief_invigilator: 'Dr. Jane Mwangi',
    total_candidates: 1,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [examsRes, waiversRes, studentsRes] = await Promise.all([
        fetch('/api/v1/exams'),
        fetch('/api/v1/exams/waivers').catch(() => null),
        fetch('/api/v1/students').catch(() => null),
      ]);
      const examsJson = await examsRes.json();
      if (examsJson.success) {
        setSchedules(examsJson.data.schedules);
        setCards(examsJson.data.cards);
        if (typeof examsJson.data.clearance_threshold_percentage === 'number')
          setClearanceThreshold(examsJson.data.clearance_threshold_percentage);
      }
      if (waiversRes) {
        const w = await waiversRes.json();
        if (w.success) setWaivers(w.data);
      }
      if (studentsRes) {
        const st = await studentsRes.json();
        if (st.success) setStudents(st.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Join cards with student faculty/department for filters
  const cardsWithMeta = useMemo(() => {
    return cards.map((c) => {
      const st = students.find((s: any) => s.id === c.student_id);
      return { ...c, faculty: st?.faculty || 'Unknown', department: st?.department || 'Unknown' };
    });
  }, [cards, students]);

  const schools = useMemo(() => [...new Set(cardsWithMeta.map((c) => c.faculty))].sort(), [cardsWithMeta]);
  const departments = useMemo(
    () => [...new Set(cardsWithMeta.filter((c) => schoolFilter === 'all' || c.faculty === schoolFilter).map((c) => c.department))].sort(),
    [cardsWithMeta, schoolFilter]
  );

  const filteredCards = useMemo(() => {
    return cardsWithMeta.filter((c) => {
      if (schoolFilter !== 'all' && c.faculty !== schoolFilter) return false;
      if (deptFilter !== 'all' && c.department !== deptFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [cardsWithMeta, schoolFilter, deptFilter, statusFilter]);

  const pendingCount = cards.filter((c) => c.status === 'blocked_fee' || c.status === 'blocked_attendance').length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.length === filteredCards.length ? [] : filteredCards.map((c) => c.student_id)
    );
  };

  const handleBulkExport = async () => {
    if (selectedIds.length === 0 || exporting) return;
    setExporting(true);
    setExportMsg(`Generating ${selectedIds.length} passes…`);
    try {
      const res = await fetch('/api/v1/exams/bulk-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: selectedIds }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Export failed.');
      }
      const blob = await res.blob();
      const issued = res.headers.get('X-Issued-Count');
      const skipped = res.headers.get('X-Skipped-Count');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exam-passes.zip';
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(`Done: ${issued} passes issued, ${skipped} skipped (blocked students never get a pass).`);
      setSelectedIds([]);
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleAutoReconcile = async () => {
    setMessage({ type: 'success', text: 'Reconciliation re-ran: clearance cards are rebuilt live from the registry + invoice ledger on every load.' });
    await fetchAll();
  };

  const handleGrantWaiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaiverError('');
    if (!waiverCard) return;
    try {
      const res = await fetch('/api/v1/exams/waivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: waiverCard.student_id,
          waiver_type: waiverForm.waiver_type,
          valid_until: waiverForm.valid_until,
          reason: waiverForm.reason,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Waiver failed.');
      setWaiverCard(null);
      setWaiverForm({ waiver_type: 'payment_plan', valid_until: '', reason: '' });
      setMessage({ type: 'success', text: `Waiver granted for ${d.data.student_name} until ${d.data.valid_until}.` });
      await fetchAll();
    } catch (e) {
      setWaiverError(e instanceof Error ? e.message : 'Waiver failed.');
    }
  };

  const handleRevokeWaiver = async (id: string) => {
    if (!confirm('Revoke this waiver? The student will return to blocked status immediately.')) return;
    try {
      const res = await fetch('/api/v1/exams/waivers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'revoke' }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Revoke failed.');
      setMessage({ type: 'success', text: 'Waiver revoked.' });
      await fetchAll();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Revoke failed.' });
    }
  };

  const handleSaveVenue = async (scheduleId: string) => {
    const edit = venueEdits[scheduleId];
    if (!edit) return;
    setVenueSaving(scheduleId);
    try {
      const res = await fetch('/api/v1/exams/venue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: scheduleId, ...edit }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed.');
      setMessage({ type: 'success', text: 'Venue details saved.' });
      await fetchAll();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setVenueSaving(null);
    }
  };

  const handleScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch('/api/v1/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schedule_exam', ...newExam }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchAll();
        setActiveTab('timetable');
      } else { setMessage({ type: 'error', text: data.error || 'Scheduling failed.' }); }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred.' });
    }
  };

  const scopedWaivers = waivers.filter((w) => {
    const now = new Date();
    if (waiverScope === 'active') return !w.is_revoked && new Date(w.valid_until) >= now;
    if (waiverScope === 'expired') return !w.is_revoked && new Date(w.valid_until) < now;
    return w.is_revoked;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileCheck2 className="h-6 w-6 text-academic-navy-900" />
            Exam Clearance & Financial Verification Desk
          </h1>
          <p className="text-sm text-slate-500">
            Clearance ledger, conditional waivers, venue mapping, and bulk exam-pass printing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/exams/scanner"
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-academic-navy-900 text-white hover:bg-academic-navy-800 flex items-center gap-1.5"
          >
            <ScanLine className="h-4 w-4" /> Invigilator Scanner
          </a>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['ledger', 'waivers', 'timetable'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === t ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'ledger' && 'Clearance Master Ledger'}
                {t === 'waivers' && `Special Waivers & Exceptions (${waivers.filter((w) => !w.is_revoked && new Date(w.valid_until) >= new Date()).length})`}
                {t === 'timetable' && 'Exam Timetable'}
              </button>
            ))}
            {canSchedule && (
              <button
                onClick={() => setActiveTab('new_exam')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === 'new_exam' ? 'bg-academic-gold-500 text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Schedule Paper
              </button>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <CheckCircle2 className="h-5 w-5" />{message.text}
        </div>
      )}

      <p className="text-sm text-slate-600 border rounded-lg p-4 bg-slate-50">
        Exam clearance rule: {clearanceThreshold === null ? '100%' : clearanceThreshold + '%'} of billed fees must be paid.
        Students below 75% attendance are blocked independently of fees. Conditional waivers (finance officer, HOD, admin)
        override fee blocks only — never attendance blocks.
      </p>
      {loading && <p role="status">Loading examinations…</p>}

      {/* ============ LEDGER TAB ============ */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <label className="text-xs font-bold text-slate-700 uppercase">Faculty</label>
            <select value={schoolFilter} onChange={(e) => { setSchoolFilter(e.target.value); setDeptFilter('all'); }}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2">
              <option value="all">All Faculties</option>
              {schools.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="text-xs font-bold text-slate-700 uppercase">Department</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2">
              <option value="all">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <label className="text-xs font-bold text-slate-700 uppercase">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2">
              <option value="all">All</option>
              <option value="cleared">Cleared</option>
              <option value="blocked_fee">Blocked (fees)</option>
              <option value="blocked_attendance">Blocked (attendance)</option>
              <option value="waived">Waived</option>
            </select>
            <span className="ml-auto text-xs text-slate-500">
              {filteredCards.length} students {pendingCount > 0 && <span className="font-bold text-rose-600">• {pendingCount} blocked</span>}
            </span>
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={selectedIds.length === filteredCards.length && filteredCards.length > 0}
                onChange={toggleSelectAll} className="h-4 w-4" />
              Select All ({selectedIds.length} selected)
            </label>
            <button onClick={handleBulkExport} disabled={selectedIds.length === 0 || exporting}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-academic-navy-900 text-white hover:bg-academic-navy-800 disabled:opacity-50 flex items-center gap-2">
              <Download className="h-4 w-4" />
              {exporting ? 'Generating…' : `Export Selected Passes to PDF (ZIP)`}
            </button>
            <button onClick={handleAutoReconcile}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Run Auto-Reconciliation
            </button>
            {exportMsg && <span className="text-xs text-slate-600">{exportMsg}</span>}
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10"></th>
                    <th className="px-4 py-3">Student & Reg No.</th>
                    <th className="px-4 py-3">Program</th>
                    <th className="px-4 py-3 text-center">Paid %</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCards.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(c.student_id)}
                          onChange={() => toggleSelect(c.student_id)} className="h-4 w-4" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{c.student_name}</div>
                        <div className="font-mono text-xs text-slate-500">{c.admission_number}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px] truncate" title={c.program_name}>{c.program_name}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold">{c.fee_paid_percentage}%</td>
                      <td className="px-4 py-3 text-right font-mono">KES {c.fee_balance.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_STYLE[c.status]}`}>
                          {c.status === 'waived' ? `Waived until ${c.waiver?.valid_until}` : STATUS_LABEL[c.status]}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{statusReason(c)}</div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setPassCard(c)}
                          className="text-xs font-bold text-academic-navy-800 hover:underline mr-3">View Pass</button>
                        {(c.status === 'blocked_fee') && canWaive && (
                          <button onClick={() => { setWaiverCard(c); setWaiverError(''); }}
                            className="text-xs font-bold text-amber-700 hover:underline">Grant Waiver</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCards.length === 0 && (
                <p className="p-8 text-center text-xs text-slate-500">No students match these filters.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ WAIVERS TAB ============ */}
      {activeTab === 'waivers' && (
        <div className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
            {(['active', 'expired', 'revoked'] as const).map((s) => (
              <button key={s} onClick={() => setWaiverScope(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition ${
                  waiverScope === s ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}>{s}</button>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Granted By</th>
                  <th className="px-4 py-3">Valid Until</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedWaivers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{w.student_name}</div>
                      <div className="font-mono text-xs text-slate-500">{w.admission_number}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{WAIVER_TYPE_LABEL[w.waiver_type] || w.waiver_type}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[280px]" title={w.reason}>{w.reason}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{w.granted_by_email}</td>
                    <td className="px-4 py-3 text-xs font-mono">{w.valid_until}</td>
                    <td className="px-4 py-3 text-right">
                      {waiverScope === 'active' && canWaive && (
                        <button onClick={() => handleRevokeWaiver(w.id)}
                          className="text-xs font-bold text-rose-700 hover:underline">Revoke</button>
                      )}
                      {w.is_revoked && <span className="text-[10px] text-slate-400">Revoked by {w.revoked_by_email}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scopedWaivers.length === 0 && (
              <p className="p-8 text-center text-xs text-slate-500">No {waiverScope} waivers.</p>
            )}
          </div>
        </div>
      )}

      {/* ============ TIMETABLE TAB ============ */}
      {activeTab === 'timetable' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <p className="text-xs text-slate-500 p-4 border-b">
            Planned timetable for the catalogue. Candidate counts are live registration counts.
            {canSchedule ? ' Edit venue, building, and seat range per paper — saved venues print on exam passes.' : ''}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase">
                <tr>
                  <th className="p-3">Course</th>
                  <th className="p-3">Exam Date</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Venue / Hall</th>
                  <th className="p-3">Building</th>
                  <th className="p-3">Seat Range</th>
                  <th className="p-3">Chief Invigilator</th>
                  <th className="p-3">Candidates</th>
                  {canSchedule && <th className="p-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((s) => {
                  const edit = venueEdits[s.id] || { venue: s.venue || '', building: s.building || '', seat_range: s.seat_range || '' };
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-mono font-bold text-academic-navy-900">{s.course_code}</div>
                        <div className="text-slate-600">{s.course_title}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{new Date(s.exam_date).toLocaleDateString('en-KE', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                      <td className="p-3 font-mono text-slate-600">{s.start_time} - {s.end_time}</td>
                      {canSchedule ? (
                        <>
                          <td className="p-3"><input value={edit.venue} onChange={(e) => setVenueEdits({ ...venueEdits, [s.id]: { ...edit, venue: e.target.value } })}
                            placeholder="e.g. Multi-Purpose Hall A" className="w-full text-xs border border-slate-300 rounded px-2 py-1" /></td>
                          <td className="p-3"><input value={edit.building} onChange={(e) => setVenueEdits({ ...venueEdits, [s.id]: { ...edit, building: e.target.value } })}
                            placeholder="e.g. Block C" className="w-full text-xs border border-slate-300 rounded px-2 py-1" /></td>
                          <td className="p-3"><input value={edit.seat_range} onChange={(e) => setVenueEdits({ ...venueEdits, [s.id]: { ...edit, seat_range: e.target.value } })}
                            placeholder="e.g. A1–A60" className="w-full text-xs border border-slate-300 rounded px-2 py-1" /></td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 font-medium text-slate-800">{s.venue || 'Venue TBA'}</td>
                          <td className="p-3 text-slate-600">{s.building || '—'}</td>
                          <td className="p-3 font-mono text-slate-600">{s.seat_range || '—'}</td>
                        </>
                      )}
                      <td className="p-3 text-slate-600">{s.chief_invigilator}</td>
                      <td className="p-3 font-mono font-semibold">{s.total_candidates}</td>
                      {canSchedule && (
                        <td className="p-3">
                          <button onClick={() => handleSaveVenue(s.id)} disabled={venueSaving === s.id}
                            className="text-xs font-bold text-academic-navy-800 hover:underline disabled:opacity-50">
                            {venueSaving === s.id ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ SCHEDULE TAB (kept) ============ */}
      {activeTab === 'new_exam' && (
        <div className="max-w-xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-academic-navy-900" /> Schedule Examination Paper
          </h2>
          <form onSubmit={handleScheduleExam} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code</label>
                <input type="text" value={newExam.course_code} onChange={(e) => setNewExam({ ...newExam, course_code: e.target.value })}
                  required className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Title</label>
                <input type="text" value={newExam.course_title} onChange={(e) => setNewExam({ ...newExam, course_title: e.target.value })}
                  required className="w-full text-xs p-2.5 rounded-lg border border-slate-300" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Date</label>
                <input type="date" value={newExam.exam_date} onChange={(e) => setNewExam({ ...newExam, exam_date: e.target.value })}
                  required className="w-full text-xs p-2.5 rounded-lg border border-slate-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                <input type="text" value={newExam.start_time} onChange={(e) => setNewExam({ ...newExam, start_time: e.target.value })}
                  required className="w-full text-xs p-2.5 rounded-lg border border-slate-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                <input type="text" value={newExam.end_time} onChange={(e) => setNewExam({ ...newExam, end_time: e.target.value })}
                  required className="w-full text-xs p-2.5 rounded-lg border border-slate-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Venue</label>
                <input type="text" value={newExam.venue} onChange={(e) => setNewExam({ ...newExam, venue: e.target.value })}
                  required className="w-full text-xs p-2.5 rounded-lg border border-slate-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Invigilator</label>
                <input type="text" value={newExam.chief_invigilator} onChange={(e) => setNewExam({ ...newExam, chief_invigilator: e.target.value })}
                  required className="w-full text-xs p-2.5 rounded-lg border border-slate-300" />
              </div>
            </div>
            <button type="submit"
              className="w-full bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2.5 px-4 rounded-lg text-xs transition shadow">
              Publish Examination Paper
            </button>
          </form>
        </div>
      )}

      {/* ============ PASS PREVIEW MODAL ============ */}
      {passCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border-2 border-academic-navy-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-academic-navy-100 pb-4 mb-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-academic-navy-800">
                  University Institution • Office of the Registrar (Academic)
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">Official Examination Card</h3>
                <p className="text-xs text-slate-500">Academic Year 2026/2027 • {passCard.semester_name}</p>
              </div>
              <button onClick={() => setPassCard(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-4">
              <div className="md:col-span-2 space-y-2">
                <div><span className="text-slate-400 block text-[10px]">Candidate Name</span>
                  <span className="text-sm font-bold text-slate-900">{passCard.student_name}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-slate-400 block text-[10px]">Admission No</span>
                    <span className="font-mono font-bold text-academic-navy-900">{passCard.admission_number}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Card Serial</span>
                    <span className="font-mono font-bold">{passCard.card_serial_number}</span></div>
                </div>
                <div><span className="text-slate-400 block text-[10px]">Degree Programme</span>
                  <span className="font-medium text-slate-800">{passCard.program_name}</span></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center text-center border border-slate-200">
                <div className="bg-white p-2 rounded-lg border border-slate-300 shadow-inner">
                  <QrCode className="h-20 w-20 text-academic-navy-900" />
                </div>
                <span className="font-mono text-[9px] text-slate-500 mt-2 break-all">{passCard.security_qr_token}</span>
                <span className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Verified Signature
                </span>
              </div>
            </div>

            {/* Venue mapping */}
            <div className="border rounded-lg p-3 mb-4 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Examination Venues
              </h4>
              {schedules.length === 0 && <p className="text-xs text-slate-500">No papers scheduled yet.</p>}
              <div className="space-y-1.5">
                {schedules.slice(0, 8).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold">{s.course_code}</span>
                    <span className="text-slate-600">
                      {s.venue || 'Venue TBA'}
                      {s.building ? ` • ${s.building}` : ''}
                      {s.seat_range ? ` • Seats ${s.seat_range}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`border rounded-lg p-3 text-xs flex items-center justify-between mb-4 ${
              passCard.is_cleared ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <span className="font-medium">{statusReason(passCard)}</span>
              <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded ${passCard.is_cleared ? 'bg-emerald-200' : 'bg-rose-200'}`}>
                {passCard.is_cleared ? 'Eligible For Exams' : 'Exam Pass Disabled'}
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setPassCard(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">Close</button>
              <button onClick={() => window.print()} disabled={!passCard.is_cleared}
                title={passCard.is_cleared ? 'Print Examination Pass' : statusReason(passCard)}
                className="bg-academic-navy-900 hover:bg-academic-navy-950 text-academic-gold-400 font-bold py-2 px-4 rounded-lg text-xs shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Printer className="h-4 w-4" />
                {passCard.is_cleared ? 'Print Examination Pass' : 'Pass Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ WAIVER MODAL ============ */}
      {waiverCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Stamp className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">Grant Conditional Waiver</h3>
              </div>
              <button onClick={() => setWaiverCard(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-slate-600 mt-3 mb-4">
              Waiving <strong>{waiverCard.student_name}</strong> ({waiverCard.admission_number}) — balance KES {waiverCard.fee_balance.toLocaleString()}.
              Waivers override <strong>fee blocks only</strong>, never attendance blocks. Every waiver is audit-logged.
            </p>
            <form onSubmit={handleGrantWaiver} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Waiver Type</label>
                <select value={waiverForm.waiver_type} onChange={(e) => setWaiverForm({ ...waiverForm, waiver_type: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  <option value="gov_disbursement_delay">Government-sponsored disbursement delay</option>
                  <option value="payment_plan">Approved payment plan</option>
                  <option value="scholarship">Scholarship beneficiary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valid Until</label>
                <input type="date" required value={waiverForm.valid_until}
                  onChange={(e) => setWaiverForm({ ...waiverForm, valid_until: e.target.value })}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason <span className="text-rose-600">(required, min 20 characters)</span>
                </label>
                <textarea required rows={3} value={waiverForm.reason}
                  onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })}
                  placeholder="e.g. HELB disbursement for Semester 1 delayed; finance office confirmed batch arrives 15 Nov 2026."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              {waiverError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{waiverError}</p>}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setWaiverCard(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow">Grant Waiver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
