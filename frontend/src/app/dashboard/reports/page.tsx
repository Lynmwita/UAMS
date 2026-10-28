'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Users, Landmark, Flame, RefreshCcw } from 'lucide-react';

type ReportData = {
  finance_only?:boolean;
  overview: {
    total_students: number;
    active_students: number;
    avg_cgpa: number;
    total_outstanding_students: number;
  };
  studentsByProgram: { program: string; total: number; active: number; years: number[] }[];
  registrationsByCourse: { course_code: string; course_title: string; total_registrations: number; pending: number; approved: number }[];
  financeTotals: { invoiced: number; collected: number; outstanding: number; invoices_issued: number; settled_invoices: number; partial_invoices: number };
  staffTotals?: { total: number; active: number };
  gradeDistribution: { letter: string; count: number }[];
  catalogTotals: { courses: number; active_courses: number; total_capacity: number; total_enrolled: number };
  admissionsTotals: { total_applications: number; submitted: number; under_review: number; shortlisted: number; admitted: number; rejected: number };
  generated_at: string;
};

const sh = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch('/api/v1/reports')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-6">Generating reports...</div>;
  if (error) return <div className="p-6 text-sm text-rose-600 bg-rose-50 rounded-md m-6">{error}</div>;
  if (!data) return null;
  if(data.finance_only)return <div className="p-6 space-y-5"><h1 className="text-xl font-bold">Finance reports</h1><p>{data.overview.total_students} students; {data.overview.total_outstanding_students} accounts with an outstanding balance.</p><div className="grid grid-cols-3 gap-4"><div className="border p-4 rounded">Invoiced<br/>{sh(data.financeTotals.invoiced)}</div><div className="border p-4 rounded">Collected<br/>{sh(data.financeTotals.collected)}</div><div className="border p-4 rounded">Outstanding<br/>{sh(data.financeTotals.outstanding)}</div></div><p>{data.financeTotals.invoices_issued} invoices issued; {data.financeTotals.settled_invoices} settled; {data.financeTotals.partial_invoices} partly paid.</p><button onClick={load} className="border rounded p-2">Refresh finance report</button></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Live institutional metrics. Generated {new Date(data.generated_at).toLocaleString('en-KE')}.</p>
          </div>
        </div>
        <button className="border text-sm px-4 py-2 rounded-md hover:bg-muted flex items-center gap-2" onClick={load}>
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border rounded-lg p-4">
          <Users className="w-5 h-5 text-sky-600 mb-2" />
          <div className="text-2xl font-bold">{data.overview.total_students}</div>
          <div className="text-xs text-muted-foreground">Students ({data.overview.active_students} active)</div>
          <div className="text-xs mt-1">Avg CGPA: <span className="font-medium">{data.overview.avg_cgpa}</span></div>
        </div>
        <div className="border rounded-lg p-4">
          <Landmark className="w-5 h-5 text-emerald-600 mb-2" />
          <div className="text-2xl font-bold">{sh(data.financeTotals.collected)}</div>
          <div className="text-xs text-muted-foreground">Fees collected</div>
          <div className="text-xs mt-1">Outstanding: <span className="font-medium text-rose-600">{sh(data.financeTotals.outstanding)}</span></div>
        </div>
        <div className="border rounded-lg p-4">
          <Flame className="w-5 h-5 text-amber-600 mb-2" />
          <div className="text-2xl font-bold">{data.admissionsTotals.total_applications}</div>
          <div className="text-xs text-muted-foreground">Admission applications</div>
          <div className="text-xs mt-1">Admitted: <span className="font-medium">{data.admissionsTotals.admitted}</span></div>
        </div>
        <div className="border rounded-lg p-4">
          <BarChart3 className="w-5 h-5 text-violet-600 mb-2" />
          <div className="text-2xl font-bold">{data.registrationsByCourse.reduce((s, c) => s + c.total_registrations, 0)}</div>
          <div className="text-xs text-muted-foreground">Course registrations</div>
          <div className="text-xs mt-1">Pending approval: <span className="font-medium text-amber-600">{data.registrationsByCourse.reduce((s, c) => s + c.pending, 0)}</span></div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Students by Program (chart)</h2>
        {data.studentsByProgram.length === 0 && <p className="text-sm text-muted-foreground">No student records yet.</p>}
        {data.studentsByProgram.map((p) => {
          const max = Math.max(1, ...data.studentsByProgram.map((x) => x.total));
          return (
            <div key={p.program} className="mb-3">
              <div className="flex justify-between text-sm"><span>{p.program}</span><span className="font-medium">{p.total} student{p.total === 1 ? '' : 's'}</span></div>
              <div className="h-3 bg-slate-100 rounded mt-1" role="img" aria-label={`${p.program}: ${p.total} students`}>
                <div className="h-3 bg-emerald-600 rounded" style={{ width: `${(p.total / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground mt-2">All dates on this page use the en-KE format (day/month/year, Africa/Nairobi). Generated {new Date(data.generated_at).toLocaleString('en-KE')}.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Students by Program</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1">Program</th>
                <th className="py-1">Total</th>
                <th className="py-1">Active</th>
              </tr>
            </thead>
            <tbody>
              {data.studentsByProgram.map((p) => (
                <tr key={p.program} className="border-t">
                  <td className="py-2">{p.program}</td>
                  <td className="py-2">{p.total}</td>
                  <td className="py-2">{p.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Grade Distribution (Approved)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1">Grade</th>
                <th className="py-1">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.gradeDistribution.map((g) => (
                <tr key={g.letter} className="border-t">
                  <td className="py-2 font-medium">{g.letter}</td>
                  <td className="py-2">{g.count}</td>
                </tr>
              ))}
              {data.gradeDistribution.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-2 text-muted-foreground">No approved grades yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border rounded-lg p-4 lg:col-span-2">
          <h2 className="font-semibold mb-3">Registrations by Course</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1">Course</th>
                <th className="py-1">Title</th>
                <th className="py-1">Registrations</th>
                <th className="py-1">Pending</th>
                <th className="py-1">Approved</th>
              </tr>
            </thead>
            <tbody>
              {data.registrationsByCourse.map((c) => (
                <tr key={c.course_code} className="border-t">
                  <td className="py-2 font-medium">{c.course_code}</td>
                  <td className="py-2">{c.course_title}</td>
                  <td className="py-2">{c.total_registrations}</td>
                  <td className="py-2 text-amber-600">{c.pending}</td>
                  <td className="py-2 text-emerald-600">{c.approved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
