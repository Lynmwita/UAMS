'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, School, BookOpen, Layers, X, Check, ChevronDown, Pencil, AlertTriangle } from 'lucide-react';
import { staffStore, countStaffByDepartment, findStaffByDisplayName } from '@/lib/hr/staff';

type AccreditationStatus = 'unknown' | 'pending' | 'accredited' | 'probation' | 'suspended' | 'withdrawn';

const ACCREDITATION_BADGE: Record<AccreditationStatus, { label: string; classes: string }> = {
  unknown: { label: 'Unknown', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  accredited: { label: 'Accredited', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  probation: { label: 'Probation', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
  suspended: { label: 'Suspended', classes: 'bg-red-50 text-red-700 border-red-200' },
  withdrawn: { label: 'Withdrawn', classes: 'bg-slate-200 text-slate-700 border-slate-300' },
};

function SuspendedBadge() {
  return (
    <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
      Suspended
    </span>
  );
}

export default function StructurePage() {
  const [createKind, setCreateKind] = useState<'departments' | 'programs'>('departments');
  const [deptCategory, setDeptCategory] = useState<'academic' | 'non_academic'>('academic');
  const [entry, setEntry] = useState({
    code: '',
    name: '',
    school_id: '',
    department_id: '',
    duration_years: '4',
    credit_limit: '48',
  });

  const createEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...entry,
        category: createKind === 'departments' ? deptCategory : undefined,
        school_id:
          createKind === 'departments' && deptCategory === 'non_academic'
            ? 'central'
            : entry.school_id,
        duration_years: Number(entry.duration_years),
        credit_limit: Number(entry.credit_limit),
      };
      const r = await fetch('/api/v1/' + createKind, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const [activeTab, setActiveTab] = useState<'schools' | 'departments' | 'programs'>('schools');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [error, setError] = useState('');
  const [schools, setSchools] = useState<
    { id: string; code: string; name: string; dean: string; deanEmail: string; depts: number; programs: number; isActive: boolean }[]
  >([]);
  const mapSchool = (s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    dean: s.dean,
    deanEmail: s.dean_email,
    depts: s.departments_count,
    programs: s.programs_count,
    isActive: s.is_active !== false,
  });

  useEffect(() => {
    fetch('/api/v1/schools')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setSchools(d.data.map(mapSchool));
      })
      .catch((e) => setError(e.message));
  }, []);

  const [departments, setDepartments] = useState<
    {
      id: string;
      code: string;
      name: string;
      school: string | null;
      hod: string;
      hodEmail: string;
      lecturers: number;
      programs: number;
      category: 'academic' | 'non_academic';
      isActive: boolean;
    }[]
  >([]);
  const [programs, setPrograms] = useState<
    {
      id: string;
      code: string;
      name: string;
      level: string;
      duration: string;
      department: string;
      credits: number;
      isActive: boolean;
      accreditationStatus: AccreditationStatus;
      regulatoryBody: string;
      lastReviewDate: string;
      nextInspectionDate: string;
      maxCapacity: number | null;
    }[]
  >([]);

  // Member counts come from real staff records only. When the staff list
  // cannot be loaded for this role, counts stay null and the column shows
  // a dash instead of a fabricated number (audit Part 2A).
  const [memberCounts, setMemberCounts] = useState<Record<string, number> | null>(null);
  const [staffForMatching, setStaffForMatching] = useState<{ first_name: string; last_name: string }[] | null>(null);
  useEffect(() => {
    fetch('/api/v1/staff')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !Array.isArray(d.data)) throw new Error('staff list unavailable');
        setMemberCounts(countStaffByDepartment(d.data));
        setStaffForMatching(d.data);
      })
      .catch(() => {
        // Staff API is role-gated; fall back to the demo seed for name
        // matching only, and leave member counts hidden (null).
        setStaffForMatching([...staffStore]);
      });
  }, []);
  const staffNames = staffForMatching ?? [...staffStore];

  useEffect(() => {
    fetch('/api/v1/departments')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setDepartments(
          d.data.map((dep: any) => ({
            id: dep.id,
            code: dep.code,
            name: dep.name,
            school: dep.school_id,
            hod: dep.hod,
            hodEmail: dep.hod_email || '',
            lecturers: 0,
            programs: dep.programs_count,
            isActive: dep.is_active !== false,
            category:
              dep.category ||
              (dep.school_id === 'central' || dep.school_id === 'sch-central' || !dep.school_id
                ? 'non_academic'
                : 'academic'),
          }))
        );
      })
      .catch((e) => setError(e.message));

    fetch('/api/v1/programs')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setPrograms(
          d.data.map((p: any) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            level: p.level,
            duration: `${p.duration_years} Years`,
            department: p.department_id,
            credits: p.credit_limit,
            isActive: p.is_active !== false,
            accreditationStatus: (['unknown','pending','accredited','probation','suspended','withdrawn'].includes(p.accreditation_status)
              ? p.accreditation_status
              : 'unknown') as AccreditationStatus,
            regulatoryBody: p.regulatory_body || '',
            lastReviewDate: p.last_review_date || '',
            nextInspectionDate: p.next_inspection_date || '',
            maxCapacity: typeof p.max_capacity === 'number' ? p.max_capacity : null,
          }))
        );
      })
      .catch((e) => setError(e.message));
  }, []);

  const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s.name]));
  const isServiceUnit = (d: { category: string; school: string | null }) =>
    d.category === 'non_academic' || d.school === 'central' || !d.school;
  const academicDepartments = departments.filter((d) => !isServiceUnit(d));
  const serviceUnits = departments.filter((d) => isServiceUnit(d));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({
    code: '',
    name: '',
    dean: '',
    deanEmail: '',
  });

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await fetch('/api/v1/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newSchool.code,
          name: newSchool.name,
          dean: newSchool.dean,
          dean_email: newSchool.deanEmail,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSchools((prev) => [...prev, mapSchool(d.data)]);
      setIsModalOpen(false);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'School creation failed.');
    }
  };

// --- Drill-down: which school card is expanded ---
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);

  // --- Edit modals ---
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const [schoolForm, setSchoolForm] = useState({ name: '', dean: '', deanEmail: '', isActive: true });
  const [deptForm, setDeptForm] = useState({ name: '', hod: '', hodEmail: '', isActive: true });
  const [programForm, setProgramForm] = useState({
    name: '',
    isActive: true,
    accreditationStatus: 'unknown' as AccreditationStatus,
    regulatoryBody: '',
    lastReviewDate: '',
    nextInspectionDate: '',
    maxCapacity: '',
  });

  const openSchoolEditor = (s: (typeof schools)[number]) => {
    setSchoolForm({ name: s.name, dean: s.dean, deanEmail: s.deanEmail, isActive: s.isActive });
    setEditingSchoolId(s.id);
    setEditError('');
    setConfirmSuspend(false);
  };
  const openDeptEditor = (d: (typeof departments)[number]) => {
    setDeptForm({ name: d.name, hod: d.hod, hodEmail: d.hodEmail, isActive: d.isActive });
    setEditingDeptId(d.id);
    setEditError('');
    setConfirmSuspend(false);
  };
  const openProgramEditor = (p: (typeof programs)[number]) => {
    setProgramForm({
      name: p.name,
      isActive: p.isActive,
      accreditationStatus: p.accreditationStatus,
      regulatoryBody: p.regulatoryBody,
      lastReviewDate: p.lastReviewDate,
      nextInspectionDate: p.nextInspectionDate,
      maxCapacity: p.maxCapacity === null ? '' : String(p.maxCapacity),
    });
    setEditingProgramId(p.id);
    setEditError('');
    setConfirmSuspend(false);
  };
  const closeEditors = () => {
    setEditingSchoolId(null);
    setEditingDeptId(null);
    setEditingProgramId(null);
    setEditError('');
    setConfirmSuspend(false);
    setEditSaving(false);
  };

  async function patchEntity(url: string, payload: Record<string, unknown>) {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Update failed.');
    return d.data;
  }

  const saveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchoolId) return;
    setEditSaving(true);
    setEditError('');
    try {
      const data = await patchEntity('/api/v1/schools', {
        id: editingSchoolId,
        name: schoolForm.name,
        dean: schoolForm.dean,
        dean_email: schoolForm.deanEmail,
        is_active: schoolForm.isActive,
      });
      setSchools((prev) => prev.map((s) => (s.id === editingSchoolId ? mapSchool(data) : s)));
      closeEditors();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'School update failed.');
      setEditSaving(false);
    }
  };

  const saveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeptId) return;
    setEditSaving(true);
    setEditError('');
    try {
      const data = await patchEntity('/api/v1/departments', {
        id: editingDeptId,
        name: deptForm.name,
        hod: deptForm.hod,
        hod_email: deptForm.hodEmail,
        is_active: deptForm.isActive,
      });
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === editingDeptId
            ? { ...d, name: data.name, hod: data.hod, hodEmail: data.hod_email || '', isActive: data.is_active !== false }
            : d
        )
      );
      closeEditors();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Department update failed.');
      setEditSaving(false);
    }
  };

  const saveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgramId) return;
    setEditSaving(true);
    setEditError('');
    try {
      const maxCap = programForm.maxCapacity.trim() === '' ? null : Number(programForm.maxCapacity);
      if (maxCap !== null && (!Number.isInteger(maxCap) || maxCap < 0)) {
        throw new Error('Max capacity must be a whole number, 0 or more.');
      }
      const data = await patchEntity('/api/v1/programs', {
        id: editingProgramId,
        name: programForm.name,
        is_active: programForm.isActive,
        accreditation_status: programForm.accreditationStatus,
        regulatory_body: programForm.regulatoryBody,
        last_review_date: programForm.lastReviewDate,
        next_inspection_date: programForm.nextInspectionDate,
        max_capacity: maxCap,
      });
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === editingProgramId
            ? {
                ...p,
                name: data.name,
                isActive: data.is_active !== false,
                accreditationStatus: (['unknown','pending','accredited','probation','suspended','withdrawn'].includes(data.accreditation_status)
                  ? data.accreditation_status
                  : 'unknown') as AccreditationStatus,
                regulatoryBody: data.regulatory_body || '',
                lastReviewDate: data.last_review_date || '',
                nextInspectionDate: data.next_inspection_date || '',
                maxCapacity: typeof data.max_capacity === 'number' ? data.max_capacity : null,
              }
            : p
        )
      );
      closeEditors();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Program update failed.');
      setEditSaving(false);
    }
  };

  // Suspend confirm helper: returns true if the toggle may proceed now.
  // When switching active -> suspended, first click arms the confirm box.
  const requestSuspendToggle = (currentlyActive: boolean, setActive: (v: boolean) => void) => {
    if (currentlyActive && !confirmSuspend) {
      setConfirmSuspend(true);
      return;
    }
    setActive(!currentlyActive);
    setConfirmSuspend(false);
  };

  const editingSchool = schools.find((s) => s.id === editingSchoolId) || null;
  const editingDept = departments.find((d) => d.id === editingDeptId) || null;
  const editingProgram = programs.find((p) => p.id === editingProgramId) || null;

  const deptNameById = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-700 font-semibold">{error}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Academic Hierarchy & Structure
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Institutional organization: faculties, academic departments, central non-academic services, and degree programs.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
        >
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>Add School / Faculty</span>
        </button>
      </div>

      {/* Creation Bar (collapsed until requested) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
        >
          <Plus className="h-4 w-4 text-academic-gold-400" />
          <span>{showCreateForm ? 'Hide Create Form' : 'Add Department'}</span>
        </button>
        <p className="text-xs text-slate-500">Add an academic department, a central service unit, or a degree program.</p>
      </div>
      {showCreateForm && (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <form onSubmit={createEntry} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Create:</span>
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCreateKind('departments')}
                  className={`px-3 py-1.5 rounded-md transition ${createKind === 'departments' ? 'bg-white shadow-xs text-academic-navy-950 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Department / Service Unit
                </button>
                <button
                  type="button"
                  onClick={() => setCreateKind('programs')}
                  className={`px-3 py-1.5 rounded-md transition ${createKind === 'programs' ? 'bg-white shadow-xs text-academic-navy-950 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Degree Program
                </button>
              </div>
            </div>

            {createKind === 'departments' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Scope:</span>
                <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setDeptCategory('academic');
                      setEntry((prev) => ({ ...prev, school_id: '' }));
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${deptCategory === 'academic' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Academic (Faculty-Specific)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeptCategory('non_academic');
                      setEntry((prev) => ({ ...prev, school_id: 'central' }));
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${deptCategory === 'non_academic' ? 'bg-purple-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Non-Academic (Whole University)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
              <input
                required
                placeholder={createKind === 'departments' ? (deptCategory === 'non_academic' ? 'e.g. CATERING' : 'e.g. CS') : 'e.g. BCS'}
                className="w-full border rounded-lg px-3 py-2 text-xs uppercase bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                value={entry.code}
                onChange={(e) => setEntry({ ...entry, code: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
              <input
                required
                placeholder={createKind === 'departments' ? (deptCategory === 'non_academic' ? 'e.g. Catering & Dining Services' : 'e.g. Computer Science') : 'e.g. Bachelor of Science in CS'}
                className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                value={entry.name}
                onChange={(e) => setEntry({ ...entry, name: e.target.value })}
              />
            </div>

            {createKind === 'departments' ? (
              deptCategory === 'academic' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">School / Faculty</label>
                  <select
                    required
                    className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    value={entry.school_id}
                    onChange={(e) => setEntry({ ...entry, school_id: e.target.value })}
                  >
                    <option value="">Choose school / faculty</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-purple-900 mb-1">Service Scope</label>
                  <div className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold flex items-center gap-1.5">
                    <span>🌐 Whole University (Serves All Schools)</span>
                  </div>
                </div>
              )
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  required
                  className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  value={entry.department_id}
                  onChange={(e) => setEntry({ ...entry, department_id: e.target.value })}
                >
                  <option value="">Choose department</option>
                  {departments
                    .filter((d) => d.category !== 'non_academic' && d.school !== 'central')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="w-full bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold py-2 px-4 rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save {createKind === 'departments' ? (deptCategory === 'non_academic' ? 'Central Service' : 'Department') : 'Program'}</span>
              </button>
            </div>
          </div>

          {createKind === 'programs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (years)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="8"
                  className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  value={entry.duration_years}
                  onChange={(e) => setEntry({ ...entry, duration_years: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Credit Limit</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full border rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  value={entry.credit_limit}
                  onChange={(e) => setEntry({ ...entry, credit_limit: e.target.value })}
                />
              </div>
            </div>
          )}
        </form>
      </div>
      )}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('schools')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'schools'
              ? 'bg-academic-navy-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Schools & Faculties ({schools.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'departments'
              ? 'bg-academic-navy-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'programs'
              ? 'bg-academic-navy-900 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Degree Programs ({programs.length})</span>
        </button>
      </div>

      {/* View 1: Schools */}
      {activeTab === 'schools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schools.map((s) => {
            const isOpen = expandedSchool === s.id;
            const schoolDepts = departments.filter((d) => d.school === s.id);
            return (
            <div key={s.id} className={`bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition ${!s.isActive ? 'opacity-90' : ''}`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-academic-navy-800 bg-academic-navy-50 border border-academic-navy-200 px-2.5 py-1 rounded">
                    {s.code}
                  </span>
                  <div className="flex items-center gap-2">
                    {s.isActive ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active Faculty
                      </span>
                    ) : (
                      <SuspendedBadge />
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openSchoolEditor(s); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-academic-navy-800 hover:bg-slate-100 transition"
                      title="Edit school"
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h2 className="text-lg font-bold text-academic-navy-950">{s.name}</h2>
                <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                  <p>Dean: <strong className="text-slate-800">{s.dean}</strong>{!findStaffByDisplayName(s.dean, staffNames) && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="No matching staff record; sample name">
                      Sample
                    </span>
                  )}</p>
                  {s.deanEmail && <p className="text-slate-400 font-mono">{s.deanEmail}</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedSchool(isOpen ? null : s.id)}
                className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium w-full text-left hover:text-academic-navy-900 transition"
                aria-expanded={isOpen}
              >
                <span>{s.depts} Academic Departments</span>
                <span className="flex items-center gap-2">
                  <span className="text-academic-gold-700 font-bold">{s.programs} Programs</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {/* Drill-down: departments and their programs */}
              <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="pt-3 space-y-3">
                    {schoolDepts.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No departments linked to this school yet.</p>
                    )}
                    {schoolDepts.map((d) => {
                      const deptPrograms = programs.filter((p) => p.department === d.id);
                      return (
                        <div key={d.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-800">
                              {d.name} <span className="font-mono font-normal text-slate-400">({d.code})</span>
                            </p>
                            {!d.isActive && <SuspendedBadge />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">HOD: {d.hod || 'Not assigned'}</p>
                          {deptPrograms.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {deptPrograms.map((p) => {
                                const badge = ACCREDITATION_BADGE[p.accreditationStatus];
                                return (
                                  <li key={p.id} className="flex items-center justify-between text-[11px] bg-white border border-slate-100 rounded px-2 py-1">
                                    <span className="font-medium text-slate-700">
                                      <span className="font-mono text-slate-400 mr-1.5">{p.code}</span>
                                      {p.name}
                                      {!p.isActive && <span className="ml-1.5 text-red-600 font-semibold">(Suspended)</span>}
                                    </span>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.classes}`}>
                                      {badge.label}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic mt-1.5">No programs under this department yet.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* View 2: Departments - academic departments and service units shown separately */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <h2 className="text-sm font-bold text-slate-800">Academic departments ({academicDepartments.length})</h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Department Name</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Faculty / Service Scope</th>
                <th className="px-5 py-3.5">Head of Department (HOD)</th>
                <th className="px-5 py-3.5 text-center">Faculty / Staff</th>
                <th className="px-5 py-3.5 text-center">Programs</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {academicDepartments.map((d) => {
                const isNonAcademic =
                  d.category === 'non_academic' || d.school === 'central' || !d.school;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-academic-navy-800">{d.code}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {d.name}
                      {!d.isActive && <span className="ml-2"><SuspendedBadge /></span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {isNonAcademic ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Non-Academic
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Academic
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold">
                      {isNonAcademic ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          🌐 Whole University (All Faculties)
                        </span>
                      ) : (
                        <span className="text-slate-800 font-medium">
                          {schoolMap[d.school || ''] || d.school}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{d.hod}{!isNonAcademic && !findStaffByDisplayName(d.hod, staffNames) && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="No matching staff record; sample name">
                        Sample
                      </span>
                    )}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-600" title={memberCounts === null ? 'Member count unavailable for this role' : 'Staff records linked to this department'}>
                      {memberCounts === null ? '—' : `${memberCounts[d.id] ?? 0} Members`}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {isNonAcademic ? (
                        <span className="text-xs text-slate-400 italic">Central Service (N/A)</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-academic-navy-50 text-academic-navy-900">
                          {d.programs} Programs
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => openDeptEditor(d)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-academic-navy-800 hover:bg-slate-100 transition"
                        title="Edit department"
                        aria-label={`Edit ${d.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {serviceUnits.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800">Service units - central, non-academic ({serviceUnits.length})</h2>
            <p className="text-xs text-slate-500">Whole-university services (for example catering, transport, maintenance). These are not academic departments and run no degree programs.</p>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Service Unit Name</th>
                    <th className="px-5 py-3.5">Service Scope</th>
                    <th className="px-5 py-3.5">Unit Head</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceUnits.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-academic-navy-800">{d.code}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        {d.name}
                        {!d.isActive && <span className="ml-2"><SuspendedBadge /></span>}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">🌐 Whole University (All Faculties)</span></td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">{d.hod}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openDeptEditor(d)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-academic-navy-800 hover:bg-slate-100 transition"
                          title="Edit service unit"
                          aria-label={`Edit ${d.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      )}

      {/* View 3: Programs */}
      {activeTab === 'programs' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Program Code</th>
                <th className="px-5 py-3.5">Degree Title</th>
                <th className="px-5 py-3.5">Level</th>
                <th className="px-5 py-3.5">Duration</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Accreditation</th>
                <th className="px-5 py-3.5 text-center">Credit Requirement</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programs.map((p) => {
                const badge = ACCREDITATION_BADGE[p.accreditationStatus];
                return (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono font-bold text-academic-navy-800">{p.code}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {p.name}
                    {!p.isActive && <span className="ml-2"><SuspendedBadge /></span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {p.level}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 text-xs">{p.duration}</td>
                  <td className="px-5 py-3.5 text-slate-700">{deptNameById[p.department] || p.department}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${badge.classes}`} title={p.regulatoryBody ? `Regulatory body: ${p.regulatoryBody}` : 'Regulatory body not set'}>
                      {badge.label}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.regulatoryBody || 'Regulatory body not set'}</p>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-bold text-academic-navy-950">
                    {p.credits} Credits
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => openProgramEditor(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-academic-navy-800 hover:bg-slate-100 transition"
                      title="Edit program"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add School Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Add School / Faculty</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSchool} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Faculty Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOHS"
                    value={newSchool.code}
                    onChange={(e) => setNewSchool({ ...newSchool, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full School Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. School of Health Sciences"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dean of Faculty</label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Catherine Muthoni"
                  value={newSchool.dean}
                  onChange={(e) => setNewSchool({ ...newSchool, dean: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dean Official Email</label>
                <input
                  type="email"
                  placeholder="dean.sohs@university.ac.ke"
                  value={newSchool.deanEmail}
                  onChange={(e) => setNewSchool({ ...newSchool, deanEmail: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
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
                  Create School
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Edit School / Faculty</h3>
              </div>
              <button onClick={closeEditors} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveSchool} className="space-y-4 mt-4 text-sm">
              {editError && <p role="alert" className="text-rose-700 font-semibold text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{editError}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">School Name</label>
                <input
                  type="text"
                  required
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dean of Faculty</label>
                <input
                  type="text"
                  value={schoolForm.dean}
                  onChange={(e) => setSchoolForm({ ...schoolForm, dean: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dean Official Email</label>
                <input
                  type="email"
                  value={schoolForm.deanEmail}
                  onChange={(e) => setSchoolForm({ ...schoolForm, deanEmail: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase">Status</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {schoolForm.isActive ? 'Active — visible in selections.' : 'Suspended — hidden from new selections.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestSuspendToggle(schoolForm.isActive, (v) => setSchoolForm({ ...schoolForm, isActive: v }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${schoolForm.isActive ? 'bg-emerald-600' : 'bg-slate-300'}`}
                    aria-label={schoolForm.isActive ? 'Suspend school' : 'Reactivate school'}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${schoolForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {confirmSuspend && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-amber-800">
                      <p className="font-semibold">Suspending hides this from new selections but preserves historical records. Continue?</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setSchoolForm({ ...schoolForm, isActive: false }); setConfirmSuspend(false); }}
                          className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold"
                        >
                          Yes, suspend
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmSuspend(false)}
                          className="px-3 py-1 rounded-lg border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditors}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {editSaving && <Check className="h-4 w-4 animate-pulse" />}
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Edit Department</h3>
              </div>
              <button onClick={closeEditors} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveDept} className="space-y-4 mt-4 text-sm">
              {editError && <p role="alert" className="text-rose-700 font-semibold text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{editError}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Head of Department</label>
                <input
                  type="text"
                  value={deptForm.hod}
                  onChange={(e) => setDeptForm({ ...deptForm, hod: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">HOD Official Email</label>
                <input
                  type="email"
                  value={deptForm.hodEmail}
                  onChange={(e) => setDeptForm({ ...deptForm, hodEmail: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase">Status</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {deptForm.isActive ? 'Active — visible in selections.' : 'Suspended — hidden from new selections.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestSuspendToggle(deptForm.isActive, (v) => setDeptForm({ ...deptForm, isActive: v }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${deptForm.isActive ? 'bg-emerald-600' : 'bg-slate-300'}`}
                    aria-label={deptForm.isActive ? 'Suspend department' : 'Reactivate department'}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${deptForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {confirmSuspend && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-amber-800">
                      <p className="font-semibold">Suspending hides this from new selections but preserves historical records. Continue?</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setDeptForm({ ...deptForm, isActive: false }); setConfirmSuspend(false); }}
                          className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold"
                        >
                          Yes, suspend
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmSuspend(false)}
                          className="px-3 py-1 rounded-lg border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditors}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {editSaving && <Check className="h-4 w-4 animate-pulse" />}
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Program Modal (with CUE accreditation fields) */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Edit Program</h3>
              </div>
              <button onClick={closeEditors} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveProgram} className="space-y-4 mt-4 text-sm">
              {editError && <p role="alert" className="text-rose-700 font-semibold text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{editError}</p>}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Program Name</label>
                <input
                  type="text"
                  required
                  value={programForm.name}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-4">
                <p className="text-xs font-bold text-slate-700 uppercase">Accreditation & Compliance</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Accreditation Status</label>
                    <select
                      value={programForm.accreditationStatus}
                      onChange={(e) => setProgramForm({ ...programForm, accreditationStatus: e.target.value as AccreditationStatus })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-academic-navy-900 outline-none"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="pending">Pending</option>
                      <option value="accredited">Accredited</option>
                      <option value="probation">Probation</option>
                      <option value="suspended">Suspended</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Regulatory Body</label>
                    <input
                      type="text"
                      placeholder="e.g. CUE"
                      value={programForm.regulatoryBody}
                      onChange={(e) => setProgramForm({ ...programForm, regulatoryBody: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-academic-navy-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Last Review Date</label>
                    <input
                      type="date"
                      value={programForm.lastReviewDate}
                      onChange={(e) => setProgramForm({ ...programForm, lastReviewDate: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-academic-navy-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Next Inspection Date</label>
                    <input
                      type="date"
                      value={programForm.nextInspectionDate}
                      onChange={(e) => setProgramForm({ ...programForm, nextInspectionDate: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-academic-navy-900 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max Student Capacity</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Not set"
                      value={programForm.maxCapacity}
                      onChange={(e) => setProgramForm({ ...programForm, maxCapacity: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-academic-navy-900 outline-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">Leave blank where unknown — the page shows "Unknown" / "Not set" honestly rather than claiming accreditation without data.</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase">Status</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {programForm.isActive ? 'Active — visible in selections.' : 'Suspended — hidden from new selections.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestSuspendToggle(programForm.isActive, (v) => setProgramForm({ ...programForm, isActive: v }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${programForm.isActive ? 'bg-emerald-600' : 'bg-slate-300'}`}
                    aria-label={programForm.isActive ? 'Suspend program' : 'Reactivate program'}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${programForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {confirmSuspend && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-[11px] text-amber-800">
                      <p className="font-semibold">Suspending hides this from new selections but preserves historical records. Continue?</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setProgramForm({ ...programForm, isActive: false }); setConfirmSuspend(false); }}
                          className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold"
                        >
                          Yes, suspend
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmSuspend(false)}
                          className="px-3 py-1 rounded-lg border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditors}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50 flex items-center gap-2"
                >
                  {editSaving && <Check className="h-4 w-4 animate-pulse" />}
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
