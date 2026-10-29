'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ListChecks,
  Upload,
  Download,
  ExternalLink,
  Send,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import { parseKuccpsCsv, generateKuccpsTemplateCsv } from '@/lib/academic/kuccps-parser';

type Application = {
  id: string;
  reference_number: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  program_code: string;
  program_name: string;
  intake: string;
  intake_year: number;
  kcse_grade: string;
  kcse_points: number;
  kcse_index?: string;
  cluster_weight?: number;
  entry_type?: 'KUCCPS' | 'DIRECT';
  status: string;
  admission_number?: string;
  offer_letter_generated_at?: string;
  submitted_at: string;
  student_id?: string;
};

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  under_review: 'bg-blue-100 text-blue-700 border-blue-200',
  shortlisted: 'bg-amber-100 text-amber-700 border-amber-200',
  admitted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  converted: 'bg-teal-100 text-teal-800 border-teal-200 font-semibold',
  rejected: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function AdmissionsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'KUCCPS' | 'DIRECT'>('all');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // KUCCPS Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [notifyOnImport, setNotifyOnImport] = useState(true);
  const [autoAdmitOnImport, setAutoAdmitOnImport] = useState(true);

  // Live parsed preview
  const parsePreview = csvRawText.trim() ? parseKuccpsCsv(csvRawText) : null;

  const fetchApplications = () => {
    fetch('/api/v1/admissions')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setApplications(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filtered = applications.filter((a) => {
    const matchesStatus = !statusFilter || a.status === statusFilter;
    const matchesChannel =
      channelFilter === 'all' ||
      (channelFilter === 'KUCCPS' && a.entry_type === 'KUCCPS') ||
      (channelFilter === 'DIRECT' && a.entry_type !== 'KUCCPS');
    const matchesSearch =
      !search ||
      a.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
      a.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      (a.kcse_index && a.kcse_index.toLowerCase().includes(search.toLowerCase())) ||
      (a.admission_number && a.admission_number.toLowerCase().includes(search.toLowerCase()));

    return matchesStatus && matchesChannel && matchesSearch;
  });

  const updateStatus = async (application_id: string, status: string) => {
    setError('');
    setSuccessMsg('');
    const r = await fetch('/api/v1/admissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ application_id, status }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setApplications((prev) => prev.map((a) => (a.id === application_id ? d.data : a)));
    setSuccessMsg(d.message || `Application status updated to ${status}.`);
  };

  const handleConvertToStudent = async (applicationId: string) => {
    setError('');
    setSuccessMsg('');
    setConvertingId(applicationId);
    try {
      const res = await fetch(`/api/v1/admissions/${applicationId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to convert applicant to student.');
      setApplications((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: 'converted', student_id: d.data?.student?.id } : a))
      );
      setSuccessMsg(d.message || 'Applicant successfully converted into active student record.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sample = generateKuccpsTemplateCsv();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'kuccps_september_placement_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCsvRawText(evt.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = async () => {
    if (!csvRawText.trim()) return;
    setImporting(true);
    setError('');
    setImportResult(null);

    try {
      const res = await fetch('/api/v1/admissions/kuccps-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: csvRawText,
          notify_applicants: notifyOnImport,
          auto_admit: autoAdmitOnImport,
          intake_year: 2026,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import KUCCPS placements.');

      setImportResult(data);
      fetchApplications();
    } catch (err: any) {
      setError(err.message || 'Import error.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700">
            <UserPlus className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Admissions & Enrolment Registry
            </h1>
            <p className="text-sm text-slate-500">
              Manage KUCCPS placement imports, review direct applications, and issue official admission letters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/apply"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border rounded-lg hover:bg-slate-100 transition text-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Public Applicant Portal
          </Link>
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportResult(null);
            }}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import KUCCPS Placements
          </button>
        </div>
      </div>

      {/* Honest In-Memory Status Banner per Rule 2 */}
      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            <strong>Runtime Store Status:</strong> Admissions applications operate in-memory for this deployment. One-click conversion writes directly into the live student records store. The Supabase SQL persistence migration (<code className="font-mono text-[11px] bg-amber-100 px-1 py-0.5 rounded">20261025140000_admissions_persistence.sql</code>) is prepared for durable database deployment.
          </span>
        </div>
        <span className="font-mono text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold uppercase shrink-0 self-start sm:self-auto">
          In-Memory Mode
        </span>
      </div>

      <p className="text-xs text-slate-500">Sample demo records: applicant contacts shown in the table are fictional (demo.example addresses and 0700 000 00x numbers), and the KUCCPS applicant Dennis Kiprop is a different person from the enrolled student Brian Kiprono.</p>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block uppercase">Total Applications</span>
          <span className="text-2xl font-extrabold text-slate-900">{applications.length}</span>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <span className="text-xs text-indigo-600 font-semibold block uppercase">KUCCPS Placements</span>
          <span className="text-2xl font-extrabold text-indigo-700">
            {applications.filter((a) => a.entry_type === 'KUCCPS').length}
          </span>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <span className="text-xs text-emerald-600 font-semibold block uppercase">Admitted / Letters</span>
          <span className="text-2xl font-extrabold text-emerald-700">
            {applications.filter((a) => a.status === 'admitted').length}
          </span>
        </div>
        <div className="p-4 bg-white border rounded-xl shadow-sm">
          <span className="text-xs text-teal-600 font-semibold block uppercase">Converted to Students</span>
          <span className="text-2xl font-extrabold text-teal-700">
            {applications.filter((a) => a.status === 'converted').length}
          </span>
        </div>
      </div>

      {/* Search, Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setChannelFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              channelFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setChannelFilter('KUCCPS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              channelFilter === 'KUCCPS' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            KUCCPS Only ({applications.filter((a) => a.entry_type === 'KUCCPS').length})
          </button>
          <button
            onClick={() => setChannelFilter('DIRECT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              channelFilter === 'DIRECT' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Direct Entry ({applications.filter((a) => a.entry_type !== 'KUCCPS').length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Search name, ref, index, adm no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="admitted">Admitted</option>
            <option value="converted">Converted to Student</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading admissions records...</div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                <tr>
                  <th className="p-3">Reference / Index</th>
                  <th className="p-3">Applicant & Contacts</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Programme</th>
                  <th className="p-3">KCSE / Cluster</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions & Letter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-slate-900">{a.reference_number}</div>
                      {a.kcse_index && <div className="text-[11px] text-slate-500">KCSE: {a.kcse_index}</div>}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 text-sm">{a.applicant_name}</div>
                      <div className="text-slate-500">{a.applicant_email}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{a.applicant_phone}</div>
                    </td>
                    <td className="p-3">
                      {a.entry_type === 'KUCCPS' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-100 text-purple-800 border border-purple-200">
                          KUCCPS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                          DIRECT
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{a.program_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        {a.program_code} • {a.intake} {a.intake_year}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-800">Grade {a.kcse_grade}</div>
                      <div className="text-slate-500 text-[11px]">{a.kcse_points} pts {a.cluster_weight ? `• W: ${a.cluster_weight}` : ''}</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_STYLES[a.status] || 'bg-slate-100'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                      {a.admission_number && (
                        <div className="font-mono text-emerald-800 font-bold text-[11px] mt-1">
                          {a.admission_number}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {a.status === 'admitted' ? (
                          <>
                            <Link
                              href={`/apply/letter/${encodeURIComponent(a.reference_number)}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 px-2 py-1 rounded font-semibold transition"
                            >
                              <FileText className="w-3 h-3" /> Offer Letter
                            </Link>
                            <button
                              onClick={() => handleConvertToStudent(a.id)}
                              disabled={convertingId === a.id}
                              className="inline-flex items-center gap-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 px-2.5 py-1 rounded font-semibold shadow-xs transition disabled:opacity-50"
                              title="Convert this admitted applicant into an active student record without retyping"
                            >
                              <UserPlus className="w-3 h-3" />
                              {convertingId === a.id ? 'Converting...' : 'Convert to Student'}
                            </button>
                          </>
                        ) : a.status === 'converted' ? (
                          <>
                            <Link
                              href={`/apply/letter/${encodeURIComponent(a.reference_number)}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 px-2 py-1 rounded font-semibold transition"
                            >
                              <FileText className="w-3 h-3" /> Offer Letter
                            </Link>
                            <Link
                              href={`/dashboard/students?search=${encodeURIComponent(a.admission_number || a.applicant_name)}`}
                              className="inline-flex items-center gap-1 text-[11px] bg-teal-50 text-teal-700 border border-teal-300 hover:bg-teal-100 px-2.5 py-1 rounded font-semibold transition"
                              title="View registered student record in student registry"
                            >
                              <CheckCircle2 className="w-3 h-3 text-teal-600" /> View Student
                            </Link>
                          </>
                        ) : (
                          <button
                            className="text-[11px] border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded font-semibold transition flex items-center gap-1"
                            onClick={() => updateStatus(a.id, 'admitted')}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Admit & Number
                          </button>
                        )}

                        {a.status !== 'converted' && (
                          <>
                            <button
                              className="text-[11px] border rounded px-1.5 py-1 text-slate-600 hover:bg-slate-100"
                              title="Set under review"
                              onClick={() => updateStatus(a.id, 'under_review')}
                            >
                              Review
                            </button>
                            <button
                              className="text-[11px] border rounded px-1.5 py-1 text-slate-600 hover:bg-slate-100"
                              title="Shortlist candidate"
                              onClick={() => updateStatus(a.id, 'shortlisted')}
                            >
                              Shortlist
                            </button>
                            <button
                              className="text-[11px] border border-rose-200 rounded px-1.5 py-1 text-rose-600 hover:bg-rose-50"
                              title="Reject candidate"
                              onClick={() => updateStatus(a.id, 'rejected')}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No applications match the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KUCCPS IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Import KUCCPS Placement List</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {importResult ? (
                <div className="space-y-4 text-center py-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">KUCCPS Import Complete</h4>
                  <p className="text-sm text-slate-600">{importResult.message}</p>

                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-xs pt-2">
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                      <span className="text-slate-500 block">Imported & Admitted</span>
                      <strong className="text-emerald-700 text-lg">{importResult.data.importedCount}</strong>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                      <span className="text-slate-500 block">Skipped (Duplicates)</span>
                      <strong className="text-amber-700 text-lg">{importResult.data.skippedDuplicates}</strong>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                      <span className="text-slate-500 block">SMS Alerts Sent</span>
                      <strong className="text-indigo-700 text-lg">{importResult.data.notificationsDispatched}</strong>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setCsvRawText('');
                        setImportResult(null);
                      }}
                      className="bg-indigo-600 text-white font-semibold text-xs px-6 py-2.5 rounded-lg hover:bg-indigo-700 shadow transition"
                    >
                      Close & View Applications
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                    <span>
                      Upload official KUCCPS placement CSV with columns: <strong>KCSE Index, Name, Gender, Phone, Email, Programme Code, Cluster Weight</strong>.
                    </span>
                    <button
                      onClick={handleDownloadSampleCsv}
                      className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-3 py-1.5 rounded shadow-xs whitespace-nowrap ml-3"
                    >
                      <Download className="w-3.5 h-3.5" /> Sample CSV
                    </button>
                  </div>

                  {/* File Dropzone / Select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Choose CSV File from Computer:
                    </label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>

                  {/* Raw CSV Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Or Paste Raw CSV Data:
                    </label>
                    <textarea
                      rows={5}
                      placeholder="KCSE Index,Full Name,Gender,Phone Number,Email Address,Programme Code,Cluster Weight,Mean Grade..."
                      value={csvRawText}
                      onChange={(e) => setCsvRawText(e.target.value)}
                      className="w-full p-2.5 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Live Validation Feedback */}
                  {parsePreview && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Parsing Preview:</span>
                        <div className="flex gap-2">
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ {parsePreview.validRecords.length} Valid Records
                          </span>
                          {parsePreview.errors.length > 0 && (
                            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              ⚠ {parsePreview.errors.length} Issues / Errors
                            </span>
                          )}
                        </div>
                      </div>

                      {parsePreview.validRecords.length > 0 && (
                        <div className="max-h-36 overflow-y-auto border rounded-lg text-[11px]">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b">
                              <tr>
                                <th className="p-2">KCSE Index</th>
                                <th className="p-2">Applicant Name</th>
                                <th className="p-2">Phone (E.164)</th>
                                <th className="p-2">Program</th>
                                <th className="p-2">Grade</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parsePreview.validRecords.slice(0, 5).map((r, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 font-mono">{r.kcse_index}</td>
                                  <td className="p-2 font-medium">{r.applicant_name}</td>
                                  <td className="p-2 font-mono">{r.applicant_phone}</td>
                                  <td className="p-2 font-bold">{r.program_code}</td>
                                  <td className="p-2">{r.kcse_grade} ({r.kcse_points})</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {parsePreview.validRecords.length > 5 && (
                            <div className="p-1.5 text-center text-[10px] text-slate-500 bg-slate-50">
                              ...and {parsePreview.validRecords.length - 5} more valid records
                            </div>
                          )}
                        </div>
                      )}

                      {parsePreview.errors.length > 0 && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1 text-rose-800 max-h-24 overflow-y-auto">
                          {parsePreview.errors.slice(0, 3).map((err, idx) => (
                            <div key={idx}>• Row {err.row}: {err.error}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Options */}
                  <div className="pt-2 border-t space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAdmitOnImport}
                        onChange={(e) => setAutoAdmitOnImport(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-medium">
                        Automatically assign official Admission Numbers & grant provisional admission (Recommended for KUCCPS)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyOnImport}
                        onChange={(e) => setNotifyOnImport(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span className="font-medium">
                        Dispatch automated SMS/Email placement alerts with link to download offer letters
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>

            {!importResult && (
              <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importing || !parsePreview || parsePreview.validRecords.length === 0}
                  onClick={handleExecuteImport}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing Batch...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Import {parsePreview?.validRecords.length || 0} Placements
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
