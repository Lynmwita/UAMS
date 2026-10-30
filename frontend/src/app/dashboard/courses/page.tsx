'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/context';
import { roleHasPermission } from '@/lib/auth/rbac';
import { BookOpen, Plus, Search, X, ChevronDown, ChevronLeft, ChevronRight, Pencil, GraduationCap } from 'lucide-react';
import { staffStore, findStaffByDisplayName } from '@/lib/hr/staff';

const PAGE_SIZE = 20;

type CourseRow = {
  id: string; code: string; title: string; credits: number; level: number;
  dept: string; prereq: string; prereqList: string[]; lecturer: string;
  unit_type: 'core' | 'elective'; semester: 1 | 2; description: string;
  is_active: boolean; enrolled: number; capacity: number;
};
type SchoolOpt = { id: string; code: string; name: string };
type DeptOpt = { id: string; code: string; name: string; school_id: string };

export default function CoursesPage() {
  const { role } = useAuth();
  const canWrite = roleHasPermission(role, 'courses:write');
  const canApprove = ['super_admin', 'admin', 'registrar', 'hod'].includes(role);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // ---- main tab: catalogue vs approvals ----
  const [mainTab, setMainTab] = useState<'catalogue' | 'approvals'>('catalogue');

  // ---- catalogue data ----
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [coursesLoaded, setCoursesLoaded] = useState(false);
  const mapCourse = (c: any): CourseRow => ({
    id: c.id, code: c.code, title: c.title, credits: c.credit_hours, level: c.level,
    dept: c.department, prereq: (c.prerequisites || []).join(', ') || 'None',
    prereqList: c.prerequisites || [], lecturer: c.lecturer,
    unit_type: c.unit_type === 'elective' ? 'elective' : 'core',
    semester: c.semester === 2 ? 2 : 1,
    description: c.description || '', is_active: c.is_active !== false,
    enrolled: c.enrolled || 0, capacity: c.capacity || 0,
  });
  useEffect(() => {
    fetch('/api/v1/courses')
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setCourses(d.data.map(mapCourse)); })
      .catch(e => setError(e.message))
      .finally(() => setCoursesLoaded(true));
  }, []);

  // ---- cascading filter data ----
  const [schools, setSchools] = useState<SchoolOpt[]>([]);
  const [departments, setDepartments] = useState<DeptOpt[]>([]);
  useEffect(() => {
    // Schools may 403 for non-admin roles; degrade gracefully to "All Schools".
    fetch('/api/v1/schools')
      .then(async r => { if (!r.ok) throw new Error('unavailable'); const d = await r.json(); setSchools((d.data || []).map((s: any) => ({ id: s.id, code: s.code, name: s.name }))); })
      .catch(() => setSchools([]));
    fetch('/api/v1/departments')
      .then(async r => { if (!r.ok) throw new Error('unavailable'); const d = await r.json(); setDepartments((d.data || []).map((x: any) => ({ id: x.id, code: x.code, name: x.name, school_id: x.school_id }))); })
      .catch(() => setDepartments([]));
  }, []);

  // ---- filters ----
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [unitTab, setUnitTab] = useState<'all' | 'core' | 'elective'>('all');
  const [page, setPage] = useState(1);

  // Department names belonging to the selected school (for the cascading dropdown)
  const deptNamesInSchool = useMemo(() => {
    if (schoolFilter === 'all') return null; // null = no school restriction
    return new Set(departments.filter(d => d.school_id === schoolFilter).map(d => d.name));
  }, [schoolFilter, departments]);

  // Departments shown in the department dropdown (narrowed by school)
  const deptOptions = useMemo(
    () => schoolFilter === 'all' ? departments : departments.filter(d => d.school_id === schoolFilter),
    [schoolFilter, departments]
  );

  const filtered = useMemo(() => courses.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.dept.toLowerCase().includes(q);
    const matchesLevel = levelFilter === 'all' || c.level.toString() === levelFilter;
    const matchesSchool = deptNamesInSchool === null || deptNamesInSchool.has(c.dept);
    const matchesDept = deptFilter === 'all' || c.dept === deptFilter;
    const matchesYear = yearFilter === 'all' || Math.floor(c.level / 100).toString() === yearFilter;
    const matchesSemester = semesterFilter === 'all' || c.semester.toString() === semesterFilter;
    const matchesUnit = unitTab === 'all' || c.unit_type === unitTab;
    return matchesSearch && matchesLevel && matchesSchool && matchesDept && matchesYear && matchesSemester && matchesUnit;
  }), [courses, search, levelFilter, deptNamesInSchool, deptFilter, yearFilter, semesterFilter, unitTab]);

  // Reset page + dependent filters when upstream filters change
  useEffect(() => { setPage(1); }, [search, levelFilter, schoolFilter, deptFilter, yearFilter, semesterFilter, unitTab]);
  useEffect(() => { setDeptFilter('all'); }, [schoolFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const coreCount = courses.filter(c => c.unit_type === 'core').length;
  const electiveCount = courses.filter(c => c.unit_type === 'elective').length;

  // ---- drawer ----
  const [drawerCourse, setDrawerCourse] = useState<CourseRow | null>(null);

  // ---- staff matching for lecturer "Sample" labels ----
  const [staffForMatching, setStaffForMatching] = useState<{ first_name: string; last_name: string }[] | null>(null);
  useEffect(() => {
    fetch('/api/v1/staff')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !Array.isArray(d.data)) throw new Error('staff list unavailable');
        setStaffForMatching(d.data);
      })
      .catch(() => setStaffForMatching([...staffStore]));
  }, []);
  const staffNames = staffForMatching ?? [...staffStore];

  // ---- add modal ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '', title: '', dept: 'Computer Science', credits: 3, level: 100,
    prereq: 'None', lecturer: 'Staff Assigned', unit_type: 'core' as 'core' | 'elective',
    semester: 1 as 1 | 2, description: '',
  });
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault(); if (!canWrite) return;
    try {
      const r = await fetch('/api/v1/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCourse.code, title: newCourse.title, credit_hours: newCourse.credits,
          level: newCourse.level, department: newCourse.dept,
          prerequisites: newCourse.prereq === 'None' ? [] : newCourse.prereq.split(',').map(p => p.trim()),
          lecturer: newCourse.lecturer, unit_type: newCourse.unit_type,
          semester: newCourse.semester, description: newCourse.description,
        }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setCourses(prev => [mapCourse(d.data), ...prev]);
      setIsModalOpen(false); setError('');
      setNewCourse({ code: '', title: '', dept: 'Computer Science', credits: 3, level: 100, prereq: 'None', lecturer: 'Staff Assigned', unit_type: 'core', semester: 1, description: '' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Course creation failed.'); }
  };

  // ---- edit modal ----
  const [editCourse, setEditCourse] = useState<CourseRow | null>(null);
  const [editForm, setEditForm] = useState({ title: '', dept: '', credits: 3, level: 300, prereq: '', lecturer: '', unit_type: 'core' as 'core' | 'elective', semester: 1 as 1 | 2, description: '', is_active: true });
  const openEdit = (c: CourseRow) => {
    setEditCourse(c);
    setEditForm({ title: c.title, dept: c.dept, credits: c.credits, level: c.level, prereq: c.prereqList.join(', '), lecturer: c.lecturer, unit_type: c.unit_type, semester: c.semester, description: c.description, is_active: c.is_active });
  };
  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault(); if (!canWrite || !editCourse) return;
    try {
      const r = await fetch('/api/v1/courses', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editCourse.id, title: editForm.title, department: editForm.dept,
          credit_hours: editForm.credits, level: editForm.level,
          prerequisites: editForm.prereq.trim() ? editForm.prereq.split(',').map(p => p.trim()) : [],
          lecturer: editForm.lecturer, unit_type: editForm.unit_type,
          semester: editForm.semester, description: editForm.description, is_active: editForm.is_active,
        }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setCourses(prev => prev.map(c => c.id === editCourse.id ? mapCourse(d.data) : c));
      setEditCourse(null); setError(''); setNotice(`${editCourse.code} updated.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Course update failed.'); }
  };

  // ---- registrations (approvals tab) ----
  const [registrations, setRegistrations] = useState<{ id: string; course_code: string; admission_number: string; status: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);
  const loadRegistrations = async () => {
    const response = await fetch('/api/v1/courses/register');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load registrations.');
    setRegistrations(data.data);
    setSelectedIds(previous => previous.filter(id => data.data.some((r: { id: string; status: string }) => r.id === id && r.status === 'pending')));
  };
  useEffect(() => { void loadRegistrations().catch(e => setError(e.message)); }, []);
  const approveRegistrations = async (ids: string[]) => {
    if (!canApprove || approving || ids.length === 0) return;
    setApproving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/v1/courses/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_ids: ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Approval failed.');
      setSelectedIds([]); setNotice(data.message); await loadRegistrations();
    } catch (e) { setError(e instanceof Error ? e.message : 'Approval failed.'); }
    finally { setApproving(false); }
  };
  const pendingIds = registrations.filter(r => r.status === 'pending').map(r => r.id);

  const registerCourse = async (course: CourseRow) => {
    setError(''); setNotice('');
    try {
      const response = await fetch('/api/v1/courses/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_code: course.code, course_title: course.title }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed.');
      setNotice(`Registration request submitted for ${course.code}.`);
      await loadRegistrations();
    } catch (e) { setError(e instanceof Error ? e.message : 'Registration failed.'); }
  };

  const selectClass = "bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700 font-medium";

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-emerald-700">{notice}</p>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Course Catalogue & Units
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Curriculum management, credit hours, prerequisites, and departmental course unit allocations.
          </p>
        </div>
        {mainTab === 'catalogue' && (
          <button
            disabled={!canWrite}
            hidden={!canWrite} style={{ display: canWrite ? undefined : 'none' }}
            onClick={() => setIsModalOpen(true)}
            className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
          >
            <Plus className="h-4 w-4 text-academic-gold-400" />
            <span>Add New Course Unit</span>
          </button>
        )}
      </div>

      {/* Main tabs: catalogue vs registration approvals */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setMainTab('catalogue')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${mainTab === 'catalogue' ? 'bg-academic-navy-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Course Catalogue</span>
        </button>
        <button
          onClick={() => setMainTab('approvals')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${mainTab === 'approvals' ? 'bg-academic-navy-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Registration Approvals</span>
          {pendingIds.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white">
              {pendingIds.length}
            </span>
          )}
        </button>
      </div>

      {mainTab === 'catalogue' && (
        <>
          {/* Scoped filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search course code, title, or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-10 pr-4 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
                />
              </div>
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className={selectClass} aria-label="Academic level filter">
                <option value="all">All Academic Levels</option>
                <option value="100">100 Level (Year 1)</option>
                <option value="200">200 Level (Year 2)</option>
                <option value="300">300 Level (Year 3)</option>
                <option value="400">400 Level (Year 4)</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} className={selectClass} aria-label="School filter">
                <option value="all">All Schools / Faculties</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectClass} aria-label="Department filter">
                <option value="all">All Departments{schoolFilter !== 'all' ? ' (in school)' : ''}</option>
                {deptOptions.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className={selectClass} aria-label="Academic year filter">
                <option value="all">All Years</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
              <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className={selectClass} aria-label="Semester filter">
                <option value="all">All Semesters</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
          </div>

          {/* Unit type tabs */}
          <div className="flex items-center space-x-2">
            {(['all', 'core', 'elective'] as const).map(t => (
              <button
                key={t}
                onClick={() => setUnitTab(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${unitTab === t ? 'bg-academic-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t === 'all' ? `All Units (${courses.length})` : t === 'core' ? `Core Units (${coreCount})` : `Electives (${electiveCount})`}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-sm">Course Inventory</h2>
              <span className="text-xs font-semibold text-slate-500">
                {coursesLoaded ? `Showing ${filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} units` : 'Loading units…'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Code & Title</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Level</th>
                    <th className="px-5 py-3.5">Credits</th>
                    <th className="px-5 py-3.5">Lecturer</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!coursesLoaded && (
                    <tr><td colSpan={7} className="px-5 py-6 text-center text-sm text-slate-500">Loading units…</td></tr>
                  )}
                  {coursesLoaded && pageItems.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-6 text-center text-sm text-slate-500">No course units match the current filters.</td></tr>
                  )}
                  {pageItems.map((c) => (
                    <tr key={c.id || c.code} onClick={() => setDrawerCourse(c)} className="hover:bg-slate-50/60 transition cursor-pointer">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-academic-navy-800">{c.code}</span>
                        <span className="text-slate-400"> — </span>
                        <span className="font-semibold text-slate-900">{c.title}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${c.unit_type === 'core' ? 'bg-academic-navy-50 text-academic-navy-800 border border-academic-navy-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                          {c.unit_type === 'core' ? 'Core' : 'Elective'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs">{c.dept}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">{c.level} Level</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-academic-navy-950">{c.credits} Cr</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {c.lecturer}
                        {c.lecturer !== 'Staff Assigned' && c.lecturer !== 'Unassigned' && !findStaffByDisplayName(c.lecturer, staffNames) && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="No matching staff record; sample name">Sample</span>
                        )}
                        {role === 'student' && (
                          <button onClick={(e) => { e.stopPropagation(); registerCourse(c); }} className="ml-3 underline text-academic-navy-800">Register</button>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${c.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          {c.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {canWrite && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-academic-navy-800 hover:text-academic-navy-600"
                            aria-label={`Edit ${c.code}`}
                          >
                            <Pencil className="h-3.5 w-3.5" /><span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-academic-navy-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /><span>Previous</span>
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold ${n === page ? 'bg-academic-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-slate-600 hover:text-academic-navy-800 disabled:opacity-40"
                >
                  <span>Next</span><ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Registration approvals tab */}
      {mainTab === 'approvals' && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" aria-busy={approving}>
          <h2 className="font-bold mb-1 text-slate-800">Course Registration Approvals</h2>
          <p className="text-xs text-slate-500 mb-4">Student requests to register for course units. The catalogue tab stays focused on curriculum management.</p>
          {canApprove && pendingIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 pb-3 mb-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled={approving} checked={pendingIds.slice(0, 200).every(id => selectedIds.includes(id))}
                  onChange={e => setSelectedIds(e.target.checked ? pendingIds.slice(0, 200) : [])} />
                Select pending registrations ({pendingIds.length} pending{pendingIds.length > 200 ? ', sent in batches of 200' : ''})
              </label>
              <button disabled={approving || selectedIds.length === 0}
                onClick={() => void approveRegistrations(selectedIds)}
                className="rounded bg-academic-navy-900 px-3 py-2 text-sm text-white disabled:opacity-50">
                {approving ? 'Approving…' : `Approve selected (${selectedIds.length})`}
              </button>
            </div>
          )}
          {registrations.length === 0 && <p className="text-sm text-slate-500">No course registrations to show.</p>}
          {registrations.map(r => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              {canApprove && r.status === 'pending' && (
                <input type="checkbox" aria-label={`Select ${r.admission_number} for ${r.course_code}`}
                  disabled={approving || (!selectedIds.includes(r.id) && selectedIds.length >= 200)}
                  checked={selectedIds.includes(r.id)}
                  onChange={e => setSelectedIds(previous => e.target.checked ? [...previous, r.id] : previous.filter(id => id !== r.id))} />
              )}
              <span className="text-sm">{r.admission_number}: <strong className="font-mono">{r.course_code}</strong> — {r.status}</span>
              {canApprove && r.status === 'pending' && (
                <button disabled={approving} onClick={() => void approveRegistrations([r.id])}
                  className="underline text-sm disabled:opacity-50">Approve registration</button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Row detail drawer */}
      {drawerCourse && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawerCourse(null)} />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <p className="font-mono text-xs font-bold text-academic-navy-800">{drawerCourse.code}</p>
                  <h3 className="text-lg font-bold text-academic-navy-950 mt-1">{drawerCourse.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${drawerCourse.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {drawerCourse.is_active ? 'Active' : 'Archived'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${drawerCourse.unit_type === 'core' ? 'bg-academic-navy-50 text-academic-navy-800 border border-academic-navy-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                      {drawerCourse.unit_type === 'core' ? 'Core unit' : 'Elective unit'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDrawerCourse(null)} className="text-slate-400 hover:text-slate-600" aria-label="Close details">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500 mb-1">Description / Syllabus outline</dt>
                  <dd className="text-slate-700">{drawerCourse.description || <span className="text-slate-400 italic">No description recorded yet.</span>}</dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500 mb-1">Department</dt>
                    <dd className="text-slate-700">{drawerCourse.dept}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500 mb-1">Level</dt>
                    <dd className="text-slate-700">{drawerCourse.level} Level (Year {Math.floor(drawerCourse.level / 100)}, Semester {drawerCourse.semester})</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500 mb-1">Credit weighting</dt>
                    <dd className="font-mono font-bold text-academic-navy-950">{drawerCourse.credits} credit hours</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-500 mb-1">Enrollment</dt>
                    <dd className="text-slate-700">{drawerCourse.enrolled} / {drawerCourse.capacity} seats</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500 mb-1">Prerequisite chain</dt>
                  <dd className="text-slate-700">
                    {drawerCourse.prereqList.length > 0 ? (
                      <ul className="list-disc list-inside font-mono text-xs space-y-1">
                        {drawerCourse.prereqList.map(p => <li key={p}>{p}</li>)}
                      </ul>
                    ) : <span className="text-slate-400 italic">None — open to all eligible students.</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500 mb-1">Assigned lecturer</dt>
                  <dd className="text-slate-700">
                    {drawerCourse.lecturer}
                    {drawerCourse.lecturer !== 'Staff Assigned' && drawerCourse.lecturer !== 'Unassigned' && !findStaffByDisplayName(drawerCourse.lecturer, staffNames) && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="No matching staff record; sample name">Sample</span>
                    )}
                  </dd>
                </div>
              </dl>

              {canWrite && (
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => { const c = drawerCourse; setDrawerCourse(null); openEdit(c); }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold"
                  >
                    <Pencil className="h-4 w-4" /><span>Edit course unit</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Add Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Add New Course Unit</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Code</label>
                  <input type="text" required placeholder="e.g. BCS 402" value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-academic-navy-900 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Title</label>
                  <input type="text" required placeholder="e.g. Artificial Intelligence & Robotics" value={newCourse.title}
                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description / Syllabus outline</label>
                <textarea rows={2} placeholder="Brief outline of topics covered…" value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select value={newCourse.dept} onChange={(e) => setNewCourse({ ...newCourse, dept: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    {(departments.length > 0 ? departments.map(d => d.name) : ['Computer Science', 'Information Technology', 'Business Administration', 'Electrical Engineering']).map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Academic Level</label>
                  <select value={newCourse.level} onChange={(e) => setNewCourse({ ...newCourse, level: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    <option value={100}>100 Level (Year 1)</option>
                    <option value={200}>200 Level (Year 2)</option>
                    <option value={300}>300 Level (Year 3)</option>
                    <option value={400}>400 Level (Year 4)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Type</label>
                  <select value={newCourse.unit_type} onChange={(e) => setNewCourse({ ...newCourse, unit_type: e.target.value as 'core' | 'elective' })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    <option value="core">Core</option>
                    <option value="elective">Elective</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Semester</label>
                  <select value={newCourse.semester} onChange={(e) => setNewCourse({ ...newCourse, semester: Number(e.target.value) as 1 | 2 })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Credit Hours</label>
                  <input type="number" min="1" max="24" required value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-2 focus:ring-academic-navy-900 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prerequisite Code</label>
                  <input type="text" placeholder="e.g. BCS 211 or None" value={newCourse.prereq}
                    onChange={(e) => setNewCourse({ ...newCourse, prereq: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-academic-navy-900 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Lecturer</label>
                  <input type="text" placeholder="e.g. Dr. Jane Mwangi" value={newCourse.lecturer}
                    onChange={(e) => setNewCourse({ ...newCourse, lecturer: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none" />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow">Add Course Unit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editCourse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Pencil className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Edit {editCourse.code}</h3>
              </div>
              <button onClick={() => setEditCourse(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditCourse} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Title</label>
                <input type="text" required value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none font-medium" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description / Syllabus outline</label>
                <textarea rows={2} value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                  <input type="text" value={editForm.dept}
                    onChange={(e) => setEditForm({ ...editForm, dept: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Lecturer</label>
                  <input type="text" value={editForm.lecturer}
                    onChange={(e) => setEditForm({ ...editForm, lecturer: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Type</label>
                  <select value={editForm.unit_type} onChange={(e) => setEditForm({ ...editForm, unit_type: e.target.value as 'core' | 'elective' })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    <option value="core">Core</option>
                    <option value="elective">Elective</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Semester</label>
                  <select value={editForm.semester} onChange={(e) => setEditForm({ ...editForm, semester: Number(e.target.value) as 1 | 2 })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Credit Hours</label>
                  <input type="number" min="1" max="24" required value={editForm.credits}
                    onChange={(e) => setEditForm({ ...editForm, credits: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-2 focus:ring-academic-navy-900 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Academic Level</label>
                  <select value={editForm.level} onChange={(e) => setEditForm({ ...editForm, level: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academic-navy-900 outline-none">
                    <option value={100}>100 Level (Year 1)</option>
                    <option value={200}>200 Level (Year 2)</option>
                    <option value={300}>300 Level (Year 3)</option>
                    <option value={400}>400 Level (Year 4)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prerequisites (comma-separated)</label>
                  <input type="text" placeholder="e.g. BCS 211, BCS 214" value={editForm.prereq}
                    onChange={(e) => setEditForm({ ...editForm, prereq: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-academic-navy-900 outline-none" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                Active (uncheck to archive this unit; archived units stay in records but hide from new selections)
              </label>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditCourse(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
