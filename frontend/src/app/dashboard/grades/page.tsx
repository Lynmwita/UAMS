'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { roleHasPermission } from '@/lib/auth/rbac';
import {
  Award, CheckCircle2, FileSpreadsheet, Download, Plus, X, Printer,
  Upload, FileDown, ChevronDown, AlertTriangle, Scale, Inbox, ClipboardCheck,
} from 'lucide-react';

import { calculateGradePoint, classifyStanding } from '@/lib/academic/gpa';

type ModerationStatus = 'draft' | 'pending_hod' | 'senate_approved';
type GradeRow = {
  id: string; studentId: string; student: string; adm: string;
  course: string; courseTitle: string; credits: number;
  cat: number; exam: number; total: number; grade: string; gpa: number;
  status: ModerationStatus;
};
type Appeal = {
  id: string; grade_id: string; student_name: string; admission_number: string;
  course_code: string; course_title: string; old_total: number; old_letter: string;
  new_total: number; new_letter: string; reason: string; status: string;
  submitted_by: string; submitted_at: string;
};

const STATUS_META: Record<ModerationStatus, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-slate-100 text-slate-700 border-slate-300' },
  pending_hod: { label: 'Pending HOD Review', classes: 'bg-amber-50 text-amber-800 border-amber-300' },
  senate_approved: { label: 'Senate Approved', classes: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

const STANDING_TONE: Record<string, string> = {
  gold: 'bg-amber-100 text-amber-900 border-amber-300',
  silver: 'bg-slate-100 text-slate-700 border-slate-300',
  bronze: 'bg-orange-100 text-orange-900 border-orange-300',
  blue: 'bg-blue-50 text-blue-800 border-blue-200',
  red: 'bg-rose-50 text-rose-800 border-rose-300',
  gray: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function GradesPage() {
  const { role } = useAuth();
  const canWrite = roleHasPermission(role, 'grades:write');
  const canModerate = ['hod', 'registrar', 'admin', 'super_admin'].includes(role);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'roll' | 'transcript'>('roll');

  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [gradesLoaded, setGradesLoaded] = useState(false);
  const [appeals, setAppeals] = useState<Appeal[]>([]);

  const mapGrade = (g: any): GradeRow => ({
    id: g.id, studentId: g.student_id, student: g.student_name, adm: g.admission_number,
    course: g.course_code, courseTitle: g.course_title, credits: g.credit_hours,
    cat: g.cat_score, exam: g.exam_score, total: g.total_score,
    grade: g.letter_grade, gpa: g.grade_point,
    status: (g.moderation_status as ModerationStatus) || (g.is_approved ? 'senate_approved' : 'draft'),
  });

  const loadGrades = async () => {
    const r = await fetch('/api/v1/grades/enter');
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setGrades(d.data.map(mapGrade));
  };
  const loadAppeals = async () => {
    try {
      const r = await fetch('/api/v1/grades/appeals');
      if (!r.ok) return;
      const d = await r.json();
      setAppeals(d.data);
    } catch { /* appeals unavailable for this role */ }
  };
  useEffect(() => {
    loadGrades().catch((e) => setError(e.message)).finally(() => setGradesLoaded(true));
    loadAppeals();
  }, []);

  const moderate = async (gradeId: string, action: 'submit' | 'approve' | 'request_correction', note?: string) => {
    setError(''); setNotice('');
    try {
      const r = await fetch('/api/v1/grades/enter', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade_id: gradeId, action, note }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setGrades((prev) => prev.map((g) => (g.id === gradeId ? mapGrade(d.data) : g)));
      setNotice(action === 'approve' ? 'Grade forwarded to Senate — official transcript record.' : action === 'submit' ? 'Submitted for HOD review.' : 'Sent back to lecturer for correction.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Moderation failed.'); }
  };

  // ---- Moderation queue: group non-approved grades by course ----
  const queueGroups = useMemo(() => {
    const groups = new Map<string, GradeRow[]>();
    for (const g of grades) {
      if (g.status === 'senate_approved') continue;
      const key = `${g.course}|||${g.courseTitle}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    }
    return [...groups.entries()].map(([key, rows]) => {
      const [course, courseTitle] = key.split('|||');
      return { course, courseTitle, rows };
    });
  }, [grades]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const moderateCourse = async (course: string, action: 'approve' | 'request_correction') => {
    const rows = queueGroups.find((q) => q.course === course)?.rows || [];
    for (const row of rows) {
      if (action === 'approve' && row.status !== 'pending_hod') continue;
      if (action === 'request_correction' && row.status !== 'pending_hod') continue;
      await moderate(row.id, action);
    }
  };

  // ---- Single grade entry (existing modal, now creates drafts) ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGrade, setNewGrade] = useState({
    student: 'Faith Wanjiku', adm: 'BIT/2023/8849',
    course: 'BCS 316', courseTitle: 'Network & System Security',
    credits: 3, cat: 25, exam: 55,
  });
  const catVal = Number(newGrade.cat) || 0;
  const examVal = Number(newGrade.exam) || 0;
  const totalVal = Math.min(100, Math.max(0, catVal + examVal));
  const { letter, points } = calculateGradePoint(totalVal);
  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault(); if (!canWrite) return;
    try {
      const r = await fetch('/api/v1/grades/enter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: newGrade.student, admission_number: newGrade.adm,
          course_code: newGrade.course, course_title: newGrade.courseTitle,
          credit_hours: newGrade.credits, cat_score: catVal, exam_score: examVal,
        }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setGrades((prev) => [mapGrade(d.data), ...prev]);
      setIsModalOpen(false); setError('');
      setNotice('Draft grade created. Submit it for HOD review from the Moderation Queue.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Grade entry failed.'); }
  };

  // ---- Bulk upload ----
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCourse, setBulkCourse] = useState('BCS 311');
  const [bulkRows, setBulkRows] = useState<Array<{ adm: string; cat: string; exam: string; error?: string }>>([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  const downloadTemplate = () => {
    const csv = 'admission_number,cat_score,exam_score\nBIT/2023/8849,25,55\nBCS/2023/1204,22,48\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `grade-sheet-${bulkCourse.replace(/\s+/g, '')}-template.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const parseBulkFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const rows: typeof bulkRows = [];
      const seen = new Set<string>();
      const startIdx = /^admission/i.test(lines[0] || '') ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const [adm = '', cat = '', exam = ''] = lines[i].split(',').map((c) => c.trim());
        let error: string | undefined;
        const catN = Number(cat), examN = Number(exam);
        if (!adm) error = 'Missing admission number.';
        else if (seen.has(adm)) error = 'Duplicate row in file.';
        else if (!Number.isFinite(catN) || catN < 0 || catN > 30) error = `CAT ${cat} out of range (0-30).`;
        else if (!Number.isFinite(examN) || examN < 0 || examN > 70) error = `Exam ${exam} out of range (0-70).`;
        seen.add(adm);
        rows.push({ adm, cat, exam, error });
      }
      setBulkRows(rows);
    };
    reader.readAsText(file);
  };

  const confirmBulkUpload = async () => {
    const valid = bulkRows.filter((r) => !r.error);
    if (valid.length === 0) { setError('No valid rows to upload.'); return; }
    setBulkUploading(true); setError('');
    try {
      const r = await fetch('/api/v1/grades/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_code: bulkCourse,
          grades: valid.map((v) => ({ admission_number: v.adm, cat_score: Number(v.cat), exam_score: Number(v.exam) })),
        }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      await loadGrades();
      setBulkOpen(false); setBulkRows([]);
      const failed = d.data.results.filter((x: any) => !x.ok).length;
      setNotice(`Bulk upload complete: ${d.data.created} drafts created${failed ? `, ${failed} rejected by server` : ''}.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Bulk upload failed.'); }
    finally { setBulkUploading(false); }
  };

  // ---- Appeals ----
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealForm, setAppealForm] = useState({ grade_id: '', new_cat: '', new_exam: '', reason: '' });
  const submitAppeal = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const r = await fetch('/api/v1/grades/appeals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade_id: appealForm.grade_id,
          new_cat_score: Number(appealForm.new_cat),
          new_exam_score: Number(appealForm.new_exam),
          reason: appealForm.reason,
        }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setAppeals((prev) => [d.data, ...prev]);
      setAppealOpen(false); setAppealForm({ grade_id: '', new_cat: '', new_exam: '', reason: '' });
      setNotice('Grade change request submitted for HOD sign-off.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Appeal submission failed.'); }
  };
  const decideAppeal = async (appealId: string, decision: 'approved' | 'rejected') => {
    setError('');
    try {
      const r = await fetch('/api/v1/grades/appeals', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appeal_id: appealId, decision }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setAppeals((prev) => prev.map((a) => (a.id === appealId ? d.data : a)));
      if (decision === 'approved') await loadGrades();
      setNotice(decision === 'approved' ? 'Correction approved — grade returned to draft for re-moderation.' : 'Appeal rejected.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Decision failed.'); }
  };

  // ---- Transcript desk ----
  const [transcriptStudent, setTranscriptStudent] = useState('');
  const [downloading, setDownloading] = useState(false);
  const approvedGrades = grades.filter((g) => g.status === 'senate_approved');
  const transcriptOptions = [...new Map(approvedGrades.map((g) => [g.adm, { id: g.studentId || g.adm, name: g.student, admission: g.adm }])).values()];
  const studentStanding = useMemo(() => {
    if (!transcriptStudent && role !== 'student') return null;
    const target = role === 'student' ? 'me' : transcriptStudent;
    const rows = approvedGrades.filter((g) => (role === 'student' ? true : (g.studentId === target || g.adm === target)));
    if (rows.length === 0) return null;
    const credits = rows.reduce((s, g) => s + g.credits, 0);
    const cgpa = credits ? rows.reduce((s, g) => s + g.credits * g.gpa, 0) / credits : 0;
    return { cgpa, units: rows.length, standing: classifyStanding(cgpa, rows.length) };
  }, [transcriptStudent, approvedGrades, role]);
  const handleDownloadTranscript = async () => {
    const target = role === 'student' ? 'me' : transcriptStudent;
    if (!target || downloading) return;
    setDownloading(true); setError('');
    try {
      const response = await fetch(`/api/v1/results/transcript/${encodeURIComponent(target)}`, { cache: 'no-store' });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Transcript download failed.'); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'Academic_Transcript.pdf';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Transcript download failed.'); }
    finally { setDownloading(false); }
  };

  const pendingAppeals = appeals.filter((a) => a.status === 'pending');

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-700 text-sm">{error}</p>}
      {notice && <p className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">{notice}</p>}
      {role === 'audit_officer' && (
        <div className="bg-academic-navy-900 border border-academic-navy-800 rounded-xl p-3.5 text-white flex items-center justify-between shadow-sm">
          <div className="text-xs text-slate-200">
            <span className="font-bold text-academic-gold-400">🛡️ Audit & Compliance Inspector:</span> Read-only grade inspection mode active. Grade modifications and approval gates are restricted.
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-academic-navy-800 text-academic-gold-400 rounded border border-academic-gold-500/30">Read-Only</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">Examinations & Academic Grades</h1>
          <p className="text-sm text-slate-500 mt-1">CAT 30% + Exam 70%. Draft → HOD review → Senate approval. Only Senate-approved grades reach transcripts.</p>
        </div>
        <div className="flex items-center space-x-3">
          {canWrite && (
            <button onClick={() => setBulkOpen(true)} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm">
              <Upload className="h-4 w-4 text-academic-navy-700" />
              <span>Upload Grade Sheet</span>
            </button>
          )}
          <button disabled={!canWrite} hidden={!canWrite} style={{ display: canWrite ? undefined : 'none' }} onClick={() => setIsModalOpen(true)}
            className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm">
            <FileSpreadsheet className="h-4 w-4 text-academic-gold-400" />
            <span>Enter Marks</span>
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Grading Scale</p>
          <p className="text-lg font-bold text-academic-navy-950 mt-1">4.0 Scale Standard</p>
          <p className="text-xs text-slate-400 mt-1">A: 70-100 (4.0) | B: 60-69 (3.0) | C: 50-59 (2.0) | D: 40-49 (1.0) | E: 0-39 (0.0, fail)</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Assessment Weight</p>
          <p className="text-lg font-bold text-academic-gold-600 mt-1">30% CAT + 70% Exam</p>
          <p className="text-xs text-slate-400 mt-1">Senate validated assessment criteria</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Senate Verification</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{gradesLoaded ? `${approvedGrades.length} Approved Results` : 'Loading…'}</p>
          <p className="text-xs text-slate-400 mt-1">
            {gradesLoaded && `${grades.filter((g) => g.status === 'draft').length} drafts · ${grades.filter((g) => g.status === 'pending_hod').length} pending HOD review`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {canModerate && (
          <button onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${activeTab === 'queue' ? 'bg-academic-navy-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Inbox className="h-4 w-4" />
            <span>Grade Moderation Queue ({queueGroups.reduce((s, q) => s + q.rows.length, 0) + pendingAppeals.length})</span>
          </button>
        )}
        <button onClick={() => setActiveTab('roll')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${activeTab === 'roll' ? 'bg-academic-navy-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          <ClipboardCheck className="h-4 w-4" />
          <span>Master Grade Roll ({grades.length})</span>
        </button>
        <button onClick={() => setActiveTab('transcript')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${activeTab === 'transcript' ? 'bg-academic-navy-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Award className="h-4 w-4" />
          <span>Transcript Desk</span>
        </button>
      </div>

      {/* TAB 1: Moderation Queue */}
      {activeTab === 'queue' && canModerate && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-sm">Pending Submissions by Course Unit</h2>
              <p className="text-xs text-slate-500 mt-0.5">Review lecturer submissions before they become official transcript records.</p>
            </div>
            {queueGroups.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500 text-center">No grades awaiting moderation. 🎉</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {queueGroups.map(({ course, courseTitle, rows }) => {
                  const pending = rows.filter((r) => r.status === 'pending_hod').length;
                  const drafts = rows.filter((r) => r.status === 'draft').length;
                  const expanded = expandedCourse === course;
                  return (
                    <div key={course}>
                      <div className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/60">
                        <button onClick={() => setExpandedCourse(expanded ? null : course)} className="flex items-center space-x-3 text-left">
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
                          <div>
                            <p className="font-mono font-bold text-academic-navy-800 text-sm">{course}</p>
                            <p className="text-xs text-slate-500">{courseTitle}</p>
                          </div>
                        </button>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">{drafts} drafts</span>
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">{pending} pending HOD</span>
                          {pending > 0 && (
                            <>
                              <button onClick={() => moderateCourse(course, 'request_correction')} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50">Request Correction</button>
                              <button onClick={() => moderateCourse(course, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Forward to Senate</button>
                            </>
                          )}
                        </div>
                      </div>
                      {expanded && (
                        <div className="px-5 pb-4 bg-slate-50/50">
                          <table className="w-full text-left text-xs mt-2">
                            <thead className="text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                              <tr><th className="py-2">Student</th><th className="py-2 text-center">CAT/30</th><th className="py-2 text-center">Exam/70</th><th className="py-2 text-center">Total</th><th className="py-2 text-center">Grade</th><th className="py-2">Status</th><th className="py-2 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {rows.map((r) => (
                                <tr key={r.id}>
                                  <td className="py-2 font-medium text-slate-800">{r.student} <span className="text-slate-400 font-mono">{r.adm}</span></td>
                                  <td className="py-2 text-center">{r.cat}</td>
                                  <td className="py-2 text-center">{r.exam}</td>
                                  <td className="py-2 text-center font-bold">{r.total}</td>
                                  <td className="py-2 text-center font-mono font-bold">{r.grade}</td>
                                  <td className="py-2"><StatusBadge status={r.status} /></td>
                                  <td className="py-2 text-right space-x-2">
                                    {r.status === 'draft' && <button onClick={() => moderate(r.id, 'submit')} className="text-blue-700 underline font-semibold">Submit for review</button>}
                                    {r.status === 'pending_hod' && (
                                      <>
                                        <button onClick={() => moderate(r.id, 'request_correction')} className="text-slate-600 underline font-semibold">Request correction</button>
                                        <button onClick={() => moderate(r.id, 'approve')} className="text-emerald-700 underline font-bold">Forward to Senate</button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grade Change Requests */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Grade Change Requests</h2>
                <p className="text-xs text-slate-500 mt-0.5">Lecturer amendments requiring HOD sign-off. Every decision is audit-logged with the reason.</p>
              </div>
              {canWrite && (
                <button onClick={() => setAppealOpen(true)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center space-x-1.5">
                  <Plus className="h-3.5 w-3.5" /><span>Request Grade Change</span>
                </button>
              )}
            </div>
            {appeals.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500 text-center">No grade change requests.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {appeals.map((a) => (
                  <div key={a.id} className="px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">{a.student_name} <span className="font-mono text-xs text-slate-500">{a.admission_number}</span></p>
                        <p className="text-xs text-slate-600 mt-0.5">{a.course_code} — {a.old_total}/100 ({a.old_letter}) → <strong>{a.new_total}/100 ({a.new_letter})</strong></p>
                        <p className="text-xs text-slate-500 mt-1 italic">“{a.reason}”</p>
                        <p className="text-[11px] text-slate-400 mt-1">Submitted by {a.submitted_by} · {new Date(a.submitted_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${a.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : a.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                          {a.status === 'pending' ? 'Awaiting sign-off' : a.status}
                        </span>
                        {a.status === 'pending' && canModerate && (
                          <>
                            <button onClick={() => decideAppeal(a.id, 'approved')} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">Approve</button>
                            <button onClick={() => decideAppeal(a.id, 'rejected')} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50">Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Master Grade Roll */}
      {activeTab === 'roll' && (
        <div className="space-y-4">
          {(() => {
            const faith = approvedGrades.filter((g) => g.adm === 'BIT/2023/8849');
            if (!gradesLoaded || faith.length === 0) return null;
            const credits = faith.reduce((sum, g) => sum + g.credits, 0);
            const semesterGpa = credits ? (faith.reduce((sum, g) => sum + g.credits * g.gpa, 0) / credits).toFixed(2) : '0.00';
            return (
              <p className="text-sm text-slate-600 border rounded-lg p-4 bg-slate-50">
                About the CGPA: Faith Wanjiku&apos;s registry CGPA is 3.82, cumulative across all semesters. The Senate-approved grades shown here cover one semester
                only ({faith.length} units, semester GPA {semesterGpa}), so they are not expected to recompute to 3.82.
              </p>
            );
          })()}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm">Course Assessment Master Roll</h2>
              <span className="text-xs font-medium text-slate-500">{gradesLoaded ? `${grades.length} Grades Recorded` : 'Loading grades…'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Student & Adm</th>
                    <th className="px-5 py-3.5">Course Unit</th>
                    <th className="px-5 py-3.5 text-center">CAT (30)</th>
                    <th className="px-5 py-3.5 text-center">Exam (70)</th>
                    <th className="px-5 py-3.5 text-center">Total (100)</th>
                    <th className="px-5 py-3.5 text-center">Grade</th>
                    <th className="px-5 py-3.5 text-center">Points</th>
                    <th className="px-5 py-3.5">Moderation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{g.student}</p>
                        <p className="text-xs text-slate-500 font-mono">{g.adm}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-academic-navy-800">{g.course}</span>
                        <p className="text-xs text-slate-500">{g.courseTitle}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center font-medium text-slate-700">{g.cat}/30</td>
                      <td className="px-5 py-3.5 text-center font-medium text-slate-700">{g.exam}/70</td>
                      <td className="px-5 py-3.5 text-center font-bold text-academic-navy-950">{g.total}/100</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-amber-50 text-academic-gold-700 border border-amber-200">{g.grade}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-semibold text-slate-600">{g.gpa.toFixed(1)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={g.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Transcript Desk */}
      {activeTab === 'transcript' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="font-bold text-slate-800 text-sm">Transcript Desk</h2>
            <p className="text-xs text-slate-500 mt-0.5">Only Senate-approved grades appear on transcripts. Standing is computed from approved grades only.</p>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-4">
              {['super_admin', 'admin', 'registrar'].includes(role) && (
                <label className="text-xs text-slate-600">
                  Transcript student
                  <select className="block max-w-64 rounded border border-slate-300 px-2 py-2 text-sm mt-1" value={transcriptStudent} onChange={(e) => setTranscriptStudent(e.target.value)}>
                    <option value="">Select student</option>
                    {transcriptOptions.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.admission})</option>)}
                  </select>
                </label>
              )}
              {['super_admin', 'admin', 'registrar', 'student'].includes(role) && (
                <button onClick={handleDownloadTranscript} disabled={downloading || (role !== 'student' && !transcriptStudent)}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm disabled:opacity-50">
                  <Download className="h-4 w-4 text-academic-navy-700" />
                  <span>{downloading ? 'Preparing transcript…' : 'Download Transcript'}</span>
                </button>
              )}
            </div>
            {studentStanding ? (
              <div className="mt-4 flex items-center space-x-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <Scale className="h-8 w-8 text-academic-navy-800" />
                <div>
                  <p className="text-sm font-bold text-academic-navy-950">CGPA {studentStanding.cgpa.toFixed(2)} <span className="font-normal text-slate-500">· {studentStanding.units} approved units</span></p>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-xs font-bold border ${STANDING_TONE[studentStanding.standing.tone]}`}>
                    {studentStanding.standing.band} — {studentStanding.standing.detail}
                  </span>
                </div>
              </div>
            ) : (
              (transcriptStudent || role === 'student') && (
                <p className="mt-4 text-sm text-slate-500">No Senate-approved grades on record for this student yet.</p>
              )
            )}
          </div>

          {/* All-student standings */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800 text-sm">Academic Standing — All Students</h2>
              <p className="text-xs text-slate-500 mt-0.5">Computed from Senate-approved grades only. “Insufficient data” means fewer than 3 graded units.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {transcriptOptions.length === 0 && <p className="px-5 py-8 text-sm text-slate-500 text-center">No students with approved grades yet.</p>}
              {transcriptOptions.map((s) => {
                const rows = approvedGrades.filter((g) => g.adm === s.admission);
                const credits = rows.reduce((x, g) => x + g.credits, 0);
                const cgpa = credits ? rows.reduce((x, g) => x + g.credits * g.gpa, 0) / credits : 0;
                const standing = classifyStanding(cgpa, rows.length);
                return (
                  <div key={s.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{s.name} <span className="font-mono text-xs text-slate-500">{s.admission}</span></p>
                      <p className="text-xs text-slate-500">CGPA {cgpa.toFixed(2)} · {rows.length} approved units</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${STANDING_TONE[standing.tone]}`}>
                      {standing.band}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Marks Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Lecturer Grade Entry Sheet</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddGrade} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Student</label>
                <select value={newGrade.adm}
                  onChange={(e) => {
                    const selectedAdm = e.target.value;
                    const name = selectedAdm === 'BIT/2023/8849' ? 'Faith Wanjiku' : selectedAdm === 'BCS/2023/1204' ? 'Kevin Otieno' : 'Brian Kiprono';
                    setNewGrade({ ...newGrade, adm: selectedAdm, student: name });
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none">
                  <option value="BIT/2023/8849">Faith Wanjiku (BIT/2023/8849)</option>
                  <option value="BCS/2023/1204">Kevin Otieno (BCS/2023/1204)</option>
                  <option value="BBA/2022/4412">Brian Kiprono (BBA/2022/4412)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Unit</label>
                <select value={newGrade.course}
                  onChange={(e) => {
                    const code = e.target.value;
                    const titles: Record<string, string> = {
                      'BCS 311': 'Advanced Database Systems', 'BIT 312': 'Distributed Systems & Cloud Computing',
                      'BCS 314': 'Software Engineering Architecture', 'BCS 316': 'Network & System Security',
                      'BBA 201': 'Principles of Financial Accounting',
                    };
                    setNewGrade({ ...newGrade, course: code, courseTitle: titles[code] || code });
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none">
                  <option value="BCS 316">BCS 316 - Network & System Security (3 Cr)</option>
                  <option value="BCS 311">BCS 311 - Advanced Database Systems (3 Cr)</option>
                  <option value="BIT 312">BIT 312 - Distributed Systems (3 Cr)</option>
                  <option value="BCS 314">BCS 314 - Software Engineering (4 Cr)</option>
                  <option value="BBA 201">BBA 201 - Principles of Financial Accounting (3 Cr)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CAT Score (Max 30)</label>
                  <input type="number" min="0" max="30" value={newGrade.cat} onChange={(e) => setNewGrade({ ...newGrade, cat: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none font-semibold" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Exam Score (Max 70)</label>
                  <input type="number" min="0" max="70" value={newGrade.exam} onChange={(e) => setNewGrade({ ...newGrade, exam: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-academic-navy-900 outline-none font-semibold" required />
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Computed Result</p>
                  <p className="text-base font-bold text-academic-navy-950 mt-0.5">{totalVal} / 100 Marks</p>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-100 text-academic-gold-800">Grade {letter} ({points.toFixed(1)} Points)</span>
              </div>
              <p className="text-xs text-slate-500">New entries are created as <strong>Drafts</strong> — submit them for HOD review from the Moderation Queue.</p>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow">Save as Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Upload className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Upload Grade Sheet</h3>
              </div>
              <button onClick={() => { setBulkOpen(false); setBulkRows([]); }} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 mt-4 text-sm">
              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-slate-700 uppercase">Course</label>
                <select value={bulkCourse} onChange={(e) => setBulkCourse(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                  {['BCS 311', 'BIT 312', 'BCS 314', 'BCS 316', 'BBA 201'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={downloadTemplate} className="ml-auto flex items-center space-x-1.5 text-xs font-semibold text-academic-navy-800 hover:underline">
                  <FileDown className="h-4 w-4" /><span>Download CSV template</span>
                </button>
              </div>
              <label className="block border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-academic-navy-400 transition">
                <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseBulkFile(f); }} />
                <Upload className="h-6 w-6 mx-auto text-slate-400" />
                <p className="mt-2 font-semibold text-slate-700">Drop your CSV here or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">Columns: admission_number, cat_score, exam_score</p>
              </label>
              {bulkRows.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase mb-2">
                    Preview — {bulkRows.filter((r) => !r.error).length} valid, {bulkRows.filter((r) => r.error).length} with errors
                  </p>
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0">
                        <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Admission</th><th className="px-3 py-2 text-center">CAT</th><th className="px-3 py-2 text-center">Exam</th><th className="px-3 py-2">Result</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkRows.map((r, i) => (
                          <tr key={i} className={r.error ? 'bg-rose-50/60' : 'bg-emerald-50/40'}>
                            <td className="px-3 py-1.5 text-slate-500">{i + 1}</td>
                            <td className="px-3 py-1.5 font-mono">{r.adm}</td>
                            <td className="px-3 py-1.5 text-center">{r.cat}</td>
                            <td className="px-3 py-1.5 text-center">{r.exam}</td>
                            <td className="px-3 py-1.5">{r.error ? <span className="text-rose-700 font-semibold">✗ {r.error}</span> : <span className="text-emerald-700 font-semibold">✓ Valid</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button onClick={() => { setBulkOpen(false); setBulkRows([]); }} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={confirmBulkUpload} disabled={bulkUploading || bulkRows.filter((r) => !r.error).length === 0}
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50">
                  {bulkUploading ? 'Uploading…' : `Confirm Upload (${bulkRows.filter((r) => !r.error).length} drafts)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade Change Request Modal */}
      {appealOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Request Grade Change</h3>
              </div>
              <button onClick={() => setAppealOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitAppeal} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Grade entry</label>
                <select value={appealForm.grade_id} onChange={(e) => setAppealForm({ ...appealForm, grade_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" required>
                  <option value="">Select a grade…</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.student} — {g.course} ({g.total}/100, {g.grade})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Corrected CAT (0–30)</label>
                  <input type="number" min="0" max="30" value={appealForm.new_cat} onChange={(e) => setAppealForm({ ...appealForm, new_cat: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Corrected Exam (0–70)</label>
                  <input type="number" min="0" max="70" value={appealForm.new_exam} onChange={(e) => setAppealForm({ ...appealForm, new_exam: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason (min 20 characters, kept permanently in the audit log)</label>
                <textarea value={appealForm.reason} onChange={(e) => setAppealForm({ ...appealForm, reason: e.target.value })}
                  placeholder='e.g. "Missing script found during re-marking"' rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2" required minLength={20} />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setAppealOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow">Submit for HOD Sign-off</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${meta.classes}`}>
      {meta.label}
    </span>
  );
}
