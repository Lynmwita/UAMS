'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { roleHasPermission } from '@/lib/auth/rbac';
import {
  Users,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  ShieldAlert,
  Download,
  X,
  Award,
  FileText,
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { generateExamCardPDF, generateStudentIDCardPDF } from '@/lib/pdf/generator';

const FACULTY_DEPARTMENTS: Record<string, string[]> = {
  'School of Computing & Informatics': [
    'Information Technology',
    'Computer Science',
    'Software Engineering',
    'Data Science',
  ],
  'School of Business': [
    'Business Administration',
    'Accounting & Finance',
    'Marketing & Management',
  ],
  'School of Engineering': [
    'Electrical & Electronic Engineering',
    'Civil Engineering',
    'Mechanical Engineering',
  ],
  'School of Health Sciences': [
    'Nursing',
    'Clinical Medicine',
    'Public Health',
  ],
  'School of Humanities & Social Sciences': [
    'Development Studies',
    'Communication & Media',
  ],
};

const CAMPUSES = [
  { code: 'SMU-MAIN', name: 'Main Campus (SMU-MAIN)' },
  { code: 'SMU-TOWN', name: 'Town Campus (SMU-TOWN)' },
  { code: 'SMU-WEST', name: 'West Campus (SMU-WEST)' },
];

export default function StudentsPage() {
  const { role } = useAuth();
  const canWrite = roleHasPermission(role, 'students:write');

  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  type StudentRow = {
    id: string;
    admissionNo: string;
    name: string;
    email: string;
    program: string;
    faculty?: string;
    department?: string;
    year: number;
    semester: number;
    status: string;
    gpa: number;
    feeBalance: number;
    feeCleared: boolean;
  };

  const [students, setStudents] = useState<StudentRow[]>([]);

  const mapStudent = (s: any): StudentRow => ({
    id: s.id,
    admissionNo: s.admission_number || '',
    name: (s.first_name || '') + (s.last_name ? ' ' + s.last_name : ''),
    email: s.email || '',
    program: s.program_name || (s.department ? `BSc ${s.department}` : 'Academic Program'),
    faculty: s.faculty,
    department: s.department,
    year: s.current_year_of_study || 1,
    semester: s.current_semester_number || 1,
    status: s.status || 'active',
    gpa: s.cgpa || 0,
    feeBalance: s.fee_balance || 0,
    feeCleared: (s.fee_balance || 0) === 0,
  });

  const fetchStudents = async () => {
    try {
      const r = await fetch('/api/v1/students');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to load students');
      if (Array.isArray(d.data)) {
        setStudents(d.data.map(mapStudent));
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchStudents();

    // Auto-open modal if navigated with ?action=register
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'register' || params.get('register') === 'true') {
        setIsModalOpen(true);
      }
    }
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Success Banner State
  const [successBanner, setSuccessBanner] = useState<{
    fullName: string;
    regNo: string;
    email: string;
    password?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [faculty, setFaculty] = useState('School of Computing & Informatics');
  const [department, setDepartment] = useState('Information Technology');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [campusCode, setCampusCode] = useState('SMU-MAIN');
  const [password, setPassword] = useState('StudentPassword123!');

  const handleFacultyChange = (newFaculty: string) => {
    setFaculty(newFaculty);
    const deps = FACULTY_DEPARTMENTS[newFaculty] || [];
    if (deps.length > 0 && !deps.includes(department)) {
      setDepartment(deps[0]);
    }
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const gen = `Student${rand}2026!`;
    setPassword(gen);
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRegNo('');
    setFaculty('School of Computing & Informatics');
    setDepartment('Information Technology');
    setYearOfStudy(1);
    setCampusCode('SMU-MAIN');
    setPassword('StudentPassword123!');
    setModalError('');
    setShowPassword(false);
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setModalError('');

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedRegNo = regNo.trim().toUpperCase();
    const trimmedPassword = password.trim();

    // 1. Basic validation
    if (!trimmedName || !trimmedEmail || !trimmedRegNo) {
      setModalError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setModalError('Please enter a valid email address.');
      return;
    }

    if (trimmedPassword.length < 8) {
      setModalError('Initial password must be at least 8 characters.');
      return;
    }

    // 2. Client-side duplicate check before submit
    if (students.some((s) => s.email && s.email.toLowerCase() === trimmedEmail)) {
      setModalError('A student with this email already exists');
      return;
    }

    if (students.some((s) => s.admissionNo && s.admissionNo.toUpperCase() === trimmedRegNo)) {
      setModalError('A student with this registration number already exists');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/v1/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          registration_number: trimmedRegNo,
          faculty,
          department,
          year_of_study: yearOfStudy,
          campus_code: campusCode,
          initial_password: trimmedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Student registration failed.');
      }

      // Success
      const mapped = mapStudent(data.data);
      setStudents((prev) => [mapped, ...prev]);

      setSuccessBanner({
        fullName: trimmedName,
        regNo: trimmedRegNo,
        email: trimmedEmail,
        password: trimmedPassword,
      });

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setModalError(err.message || 'Student registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!successBanner) return;
    const creds = `Email: ${successBanner.email}\nInitial Password: ${successBanner.password || 'StudentPassword123!'}\nRegistration No: ${successBanner.regNo}\nStudent Hub Login: https://student-life-campus-hub.vercel.app/login`;
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadExamCard = (student: typeof students[0]) => {
    const doc = generateExamCardPDF({
      student: {
        name: student.name,
        admissionNumber: student.admissionNo,
        program: student.program,
        yearOfStudy: student.year,
        semesterNumber: student.semester,
      },
      semester: `Semester ${student.semester}`,
      academicYear: '2025/2026 Academic Year',
      feeCleared: student.feeCleared,
      clearanceCode: `EXAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      courses: [
        { code: 'BCS 311', title: 'Advanced Database Systems', attendancePercent: 92 },
        { code: 'BIT 312', title: 'Distributed Systems & Cloud Computing', attendancePercent: 88 },
        { code: 'BCS 314', title: 'Software Engineering Architecture', attendancePercent: 85 },
        { code: 'BCS 316', title: 'Network & System Security', attendancePercent: 95 },
      ],
    });

    doc.save(`Exam_Clearance_Card_${student.admissionNo.replace(/\//g, '_')}.pdf`);
  };

  const handleDownloadIDCard = (student: typeof students[0]) => {
    const doc = generateStudentIDCardPDF({
      student: {
        name: student.name,
        admissionNumber: student.admissionNo,
        program: student.program,
        yearOfStudy: student.year,
        semesterNumber: student.semester,
      },
      expiryDate: 'DECEMBER 2027',
    });

    doc.save(`Student_ID_${student.admissionNo.replace(/\//g, '_')}.pdf`);
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-academic-navy-950 tracking-tight">
            Student Management & Admissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enrolled student registry, bio-profiles, fee clearance verification, and exam pass generation.
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setModalError('');
              setIsModalOpen(true);
            }}
            className="bg-academic-navy-900 hover:bg-academic-navy-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition flex items-center space-x-2 shadow-sm"
          >
            <Plus className="h-4 w-4 text-academic-gold-400" />
            <span>Register Student</span>
          </button>
        )}
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div
          role="status"
          className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm animate-in fade-in duration-200"
        >
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Student registered: {successBanner.fullName} ({successBanner.regNo}).
              </p>
              <p className="text-xs text-emerald-800 mt-1">
                They can sign in at the Student Hub with their email (
                <span className="font-mono font-semibold">{successBanner.email}</span>) and the initial password.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              onClick={handleCopyCredentials}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy credentials'}</span>
            </button>
            <a
              href="https://student-life-campus-hub.vercel.app/login"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold transition"
            >
              <span>Student Hub</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name, email, or registration number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-10 pr-4 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-academic-navy-700"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-navy-700 font-medium"
        >
          <option value="all">All Academic Statuses</option>
          <option value="active">Active Enrolled</option>
          <option value="suspended">Suspended / Deferred</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Active Student Enrolment List</h2>
          <span className="text-xs font-semibold text-slate-500">{filtered.length} Students Listed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Admission No</th>
                <th className="px-5 py-3.5">Full Name</th>
                <th className="px-5 py-3.5">Email</th>
                {role !== 'finance_officer' && <th className="px-5 py-3.5">Degree Program</th>}
                {role !== 'finance_officer' && <th className="px-5 py-3.5">Level</th>}
                {role !== 'finance_officer' && <th className="px-5 py-3.5">CGPA</th>}
                <th className="px-5 py-3.5">Fee Balance</th>
                {role !== 'finance_officer' && <th className="px-5 py-3.5 text-center">Student Credentials</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono font-semibold text-academic-navy-800">{s.admissionNo}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{s.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{s.email}</td>
                  {role !== 'finance_officer' && <td className="px-5 py-3.5 text-slate-600">{s.program}</td>}
                  {role !== 'finance_officer' && (
                    <td className="px-5 py-3.5 text-slate-500">
                      Year {s.year}, Sem {s.semester}
                    </td>
                  )}
                  {role !== 'finance_officer' && (
                    <td className="px-5 py-3.5 font-bold text-academic-navy-950">
                      {s.gpa > 0 ? s.gpa.toFixed(2) : 'N/A'}
                    </td>
                  )}
                  <td className="px-5 py-3.5 font-medium">
                    {s.feeCleared ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        KES 0 (Cleared)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        KES {s.feeBalance.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        hidden={role === 'finance_officer'}
                        style={{ display: role === 'finance_officer' ? 'none' : undefined }}
                        onClick={() => handleDownloadIDCard(s)}
                        className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded bg-academic-navy-50 hover:bg-academic-navy-100 text-academic-navy-800 border border-academic-navy-200 transition"
                        title="Download PVC Student ID Card PDF"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-academic-gold-600" />
                        <span>ID Card</span>
                      </button>

                      {canWrite && (
                        <button
                          disabled={!s.feeCleared}
                          onClick={() => handleDownloadExamCard(s)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Download Exam Clearance Card PDF"
                        >
                          <Download className="h-3.5 w-3.5 text-academic-navy-700" />
                          <span>Exam Pass</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal - Role gated to staff/registrar only */}
      {isModalOpen && canWrite && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Register Student</h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setModalError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div
                role="alert"
                className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-800 text-xs font-medium"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterStudent} className="space-y-4 mt-4 text-sm">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brian Otieno"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                />
              </div>

              {/* Email & Registration Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. brian.otieno@summit.ac.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-900 outline-none lowercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Registration Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SMU/BIT/2026/1002"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 focus:ring-2 focus:ring-academic-navy-900 outline-none uppercase"
                  />
                </div>
              </div>

              {/* Faculty & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Faculty <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={faculty}
                    onChange={(e) => handleFacultyChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-900 outline-none text-xs"
                  >
                    {Object.keys(FACULTY_DEPARTMENTS).map((fac) => (
                      <option key={fac} value={fac}>
                        {fac}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-900 outline-none text-xs"
                  >
                    {(FACULTY_DEPARTMENTS[faculty] || []).map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year of study & Campus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Year of Study <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                    <option value={5}>Year 5</option>
                    <option value={6}>Year 6</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Campus <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={campusCode}
                    onChange={(e) => setCampusCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  >
                    {CAMPUSES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Initial Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs font-semibold text-academic-navy-700 hover:text-academic-navy-900 flex items-center space-x-1"
                  >
                    <Sparkles className="h-3 w-3 text-academic-gold-500" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg pl-3 pr-10 py-2 font-mono text-slate-900 focus:ring-2 focus:ring-academic-navy-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Must be at least 8 characters. The student will use this password to sign in at the Student Hub.
                </p>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError('');
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow flex items-center space-x-2"
                >
                  {submitting && (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>{submitting ? 'Registering & Syncing...' : 'Register Student'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
