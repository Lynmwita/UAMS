'use client';

import { useEffect, useState } from 'react';
import { UserPlus, FileText, Search, CheckCircle2, XCircle, Clock, ListChecks } from 'lucide-react';

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
  status: string;
  admission_number?: string;
  submitted_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700',
  under_review: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-amber-100 text-amber-700',
  admitted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function AdmissionsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admissions')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setApplications(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = applications.filter(
    (a) =>
      (!statusFilter || a.status === statusFilter) &&
      (!search ||
        a.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
        a.reference_number.toLowerCase().includes(search.toLowerCase()))
  );

  const updateStatus = async (application_id: string, status: string) => {
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
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <UserPlus className="w-7 h-7 text-amber-600" />
        <div>
          <h1 className="text-xl font-bold">Admissions & Enrollment</h1>
          <p className="text-sm text-muted-foreground">Review intake applications, shortlist, and admit new students.</p>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600 bg-rose-50 p-3 rounded-md">{error}</p>}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-md border bg-background"
            placeholder="Search applicant or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="border rounded-md px-3 py-2 bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="admitted">Admitted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p>Loading applications...</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Reference</th>
                <th className="text-left p-3">Applicant</th>
                <th className="text-left p-3">Program</th>
                <th className="text-left p-3">KCSE</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{a.reference_number}</td>
                  <td className="p-3">
                    <div className="font-medium">{a.applicant_name}</div>
                    <div className="text-xs text-muted-foreground">{a.applicant_email}</div>
                  </td>
                  <td className="p-3">
                    <div>{a.program_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Sept {a.intake_year} intake
                    </div>
                  </td>
                  <td className="p-3">
                    {a.kcse_grade} <span className="text-xs text-muted-foreground">({a.kcse_points} pts)</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_STYLES[a.status] || 'bg-slate-100'}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                    {a.admission_number && <div className="text-xs text-emerald-700 mt-1">ADM: {a.admission_number}</div>}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button className="text-xs border rounded px-2 py-1 flex items-center gap-1 hover:bg-muted" onClick={() => updateStatus(a.id, 'under_review')}>
                        <Clock className="w-3 h-3" /> Review
                      </button>
                      <button className="text-xs border rounded px-2 py-1 flex items-center gap-1 hover:bg-muted" onClick={() => updateStatus(a.id, 'shortlisted')}>
                        <ListChecks className="w-3 h-3" /> Shortlist
                      </button>
                      <button className="text-xs border rounded px-2 py-1 flex items-center gap-1 text-emerald-700 hover:bg-emerald-50" onClick={() => updateStatus(a.id, 'admitted')}>
                        <CheckCircle2 className="w-3 h-3" /> Admit
                      </button>
                      <button className="text-xs border rounded px-2 py-1 flex items-center gap-1 text-rose-700 hover:bg-rose-50" onClick={() => updateStatus(a.id, 'rejected')}>
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    No applications match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
