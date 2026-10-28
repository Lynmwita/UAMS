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
  Edit,
  Camera,
  Trash2,
  UserX,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { generateExamCardPDF, generateStudentIDCardPDF } from '@/lib/pdf/generator';
import { StudentAvatar, StudentIdCard, StudentIdCardBack } from '@/components/StudentIdCard';
import { fileToStudentPhotoDataUrl } from '@/lib/students/photo';

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

const DEPARTMENT_PROGRAMS: Record<string, string[]> = {
  'Information Technology': [
    'Bachelor of Science in Information Technology',
    'Bachelor of Business Information Technology',
    'Diploma in Information Technology',
  ],
  'Computer Science': [
    'Bachelor of Science in Computer Science',
    'Master of Science in Computer Science',
    'Diploma in Computer Science',
  ],
  'Software Engineering': [
    'Bachelor of Science in Software Engineering',
    'Diploma in Software Engineering',
  ],
  'Data Science': [
    'Bachelor of Science in Data Science',
    'Master of Science in Data Analytics',
  ],
  'Business Administration': [
    'Bachelor of Business Administration',
    'Master of Business Administration',
    'Diploma in Business Management',
  ],
  'Accounting & Finance': [
    'Bachelor of Commerce (Accounting & Finance)',
    'Diploma in Accounting & Finance',
  ],
  'Marketing & Management': [
    'Bachelor of Science in Marketing & Management',
    'Diploma in Marketing Management',
  ],
  'Electrical & Electronic Engineering': [
    'Bachelor of Science in Electrical & Electronic Engineering',
    'Diploma in Electrical & Electronic Engineering',
  ],
  'Civil Engineering': [
    'Bachelor of Science in Civil Engineering',
    'Diploma in Civil Engineering',
  ],
  'Mechanical Engineering': [
    'Bachelor of Science in Mechanical Engineering',
    'Diploma in Mechanical Engineering',
  ],
  'Nursing': [
    'Bachelor of Science in Nursing',
    'Diploma in Community Health Nursing',
  ],
  'Clinical Medicine': [
    'Bachelor of Science in Clinical Medicine',
    'Diploma in Clinical Medicine and Surgery',
  ],
  'Public Health': [
    'Bachelor of Science in Public Health',
    'Diploma in Public Health',
  ],
  'Development Studies': [
    'Bachelor of Arts in Development Studies',
    'Diploma in Community Development',
  ],
  'Communication & Media': [
    'Bachelor of Arts in Communication & Media Studies',
    'Diploma in Journalism & Media Studies',
  ],
};

const CAMPUSES = [
  { code: 'SMU-MAIN', name: 'Main Campus (SMU-MAIN)' },
  { code: 'SMU-CITY', name: 'City Campus (SMU-CITY)' },
  { code: 'ZU-TECH', name: 'Technology Park Campus (ZU-TECH)' },
  { code: 'ZU-RUIRU', name: 'Ruiru Campus (ZU-RUIRU)' },
  { code: 'ZU-PIONEER', name: 'Pioneer Campus (ZU-PIONEER)' },
];

export default function StudentsPage() {
  const { role,id:actorId } = useAuth();
  const institutional=!actorId.startsWith('usr-');
  const [programs,setPrograms]=useState<{id:string;name:string}[]>([]);
  const [programId,setProgramId]=useState('');
  const [birthDate,setBirthDate]=useState('');
  const [gender,setGender]=useState('other');
  useEffect(()=>{if(institutional)fetch('/api/v1/programs').then(r=>r.json()).then(d=>{if(d.success)setPrograms(d.data);});},[institutional]);
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
    campusCode?: string;
    year: number;
    semester: number;
    status: string;
    gpa: number;
    feeBalance: number;
    feeCleared: boolean;
    /** The one profile photo - also the photo on the ID card. */
    photoUrl?: string;
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
    campusCode: s.campus_code,
    year: s.current_year_of_study || 1,
    semester: s.current_semester_number || 1,
    status: s.status || 'active',
    gpa: s.cgpa || 0,
    feeBalance: s.fee_balance || 0,
    feeCleared: (s.fee_balance || 0) === 0,
    photoUrl: s.photo_url || s.avatar_url || s.profile_photo_url || undefined,
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

  // Global Escape key listener to dismiss any active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditModalOpen(false);
        setEditingStudent(null);
        setEditModalError('');
        setEditFieldErrors({});
        setIsStatusModalOpen(false);
        setStatusTargetStudent(null);
        setStatusModalError('');
        setIsModalOpen(false);
        setModalError('');
        setFieldErrors({});
        setIdCardStudent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    regNo?: string;
    password?: string;
    program?: string;
  }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
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
  const [program, setProgram] = useState('Bachelor of Science in Information Technology');
  const [yearOfStudy, setYearOfStudy] = useState(1);
  const [campusCode, setCampusCode] = useState('SMU-MAIN');
  const [password, setPassword] = useState('StudentPassword123!');
  // Profile photo: one photo for the profile AND the ID card (live preview below).
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoError, setPhotoError] = useState('');

  const handlePhotoFile = async (file: File | undefined, apply: (url: string) => void, setErr: (m: string) => void) => {
    if (!file) return;
    setErr('');
    try {
      apply(await fileToStudentPhotoDataUrl(file));
    } catch (err: any) {
      setErr(err.message || 'That photo could not be used.');
    }
  };

  const validateField = (
    field: 'fullName' | 'email' | 'regNo' | 'password' | 'program',
    overrideVal?: string
  ): string | undefined => {
    const raw =
      overrideVal !== undefined
        ? overrideVal
        : field === 'fullName'
        ? fullName
        : field === 'email'
        ? email
        : field === 'regNo'
        ? regNo
        : field === 'password'
        ? password
        : program;
    const val = (raw || '').trim();

    if (field === 'fullName') {
      if (!val) return 'This field is required';
    } else if (field === 'email') {
      if (!val) return 'This field is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val.toLowerCase())) {
        return 'Enter a valid email address, e.g. brian.otieno@university.ac.ke';
      }
    } else if (field === 'regNo') {
      if (!val) return 'This field is required';
    } else if (field === 'password') {
      if (!val) return 'This field is required';
      if (val.length < 8) return 'Password must be at least 8 characters';
    } else if (field === 'program') {
      if (!val) return 'This field is required';
    }
    return undefined;
  };

  const handleBlur = (field: 'fullName' | 'email' | 'regNo' | 'password' | 'program') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field);
    setFieldErrors((prev) => ({
      ...prev,
      [field]: errorMsg,
    }));
  };

  const handleFacultyChange = (newFaculty: string) => {
    setFaculty(newFaculty);
    const deps = FACULTY_DEPARTMENTS[newFaculty] || [];
    const nextDept = deps[0] || '';
    setDepartment(nextDept);
    const progs = DEPARTMENT_PROGRAMS[nextDept] || [];
    const nextProg = progs[0] || (nextDept ? `Bachelor of Science in ${nextDept}` : '');
    setProgram(nextProg);
    if (touched.program || fieldErrors.program) {
      setFieldErrors((prev) => ({
        ...prev,
        program: validateField('program', nextProg),
      }));
    }
  };

  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    const progs = DEPARTMENT_PROGRAMS[newDept] || [];
    const nextProg = progs[0] || (newDept ? `Bachelor of Science in ${newDept}` : '');
    setProgram(nextProg);
    if (touched.program || fieldErrors.program) {
      setFieldErrors((prev) => ({
        ...prev,
        program: validateField('program', nextProg),
      }));
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
    setFieldErrors((prev) => ({ ...prev, password: undefined }));
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setRegNo('');
    setFaculty('School of Computing & Informatics');
    setDepartment('Information Technology');
    setProgram('Bachelor of Science in Information Technology');
    setYearOfStudy(1);
    setCampusCode('SMU-MAIN');
    setPassword('StudentPassword123!');
    setPhotoUrl('');
    setPhotoError('');
    setModalError('');
    setFieldErrors({});
    setTouched({});
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

    // 1. Mark all fields touched and validate
    setTouched({
      fullName: true,
      email: true,
      regNo: true,
      password: true,
      program: true,
    });

    const errors: {
      fullName?: string;
      email?: string;
      regNo?: string;
      password?: string;
      program?: string;
    } = {
      fullName: validateField('fullName', trimmedName),
      email: validateField('email', trimmedEmail),
      regNo: validateField('regNo', trimmedRegNo),
      password: validateField('password', trimmedPassword),
      program: validateField('program', program),
    };

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }

    // 2. Client-side duplicate checks before submit
    if (students.some((s) => s.email && s.email.toLowerCase() === trimmedEmail)) {
      setFieldErrors((prev) => ({ ...prev, email: 'A student with this email already exists' }));
      setModalError('A student with this email already exists');
      return;
    }

    if (students.some((s) => s.admissionNo && s.admissionNo.toUpperCase() === trimmedRegNo)) {
      setFieldErrors((prev) => ({ ...prev, regNo: 'A student with this registration number already exists' }));
      setModalError('A student with this registration number already exists');
      return;
    }

    setFieldErrors({});
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
          program_name: program,
          year_of_study: yearOfStudy,
          campus_code: campusCode,
          initial_password: trimmedPassword,
          ...(photoUrl ? { photo_url: photoUrl } : {}),
          ...(institutional?{program_id:programId,date_of_birth:birthDate,gender}:{}),
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
        password: institutional?undefined:trimmedPassword,
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

  // ==========================================
  // EDIT STUDENT MODAL STATE & HANDLERS
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editFaculty, setEditFaculty] = useState('School of Computing & Informatics');
  const [editDepartment, setEditDepartment] = useState('Information Technology');
  const [editProgram, setEditProgram] = useState('Bachelor of Science in Information Technology');
  const [editYearOfStudy, setEditYearOfStudy] = useState(1);
  const [editCampusCode, setEditCampusCode] = useState('ZU-TECH');
  const [editFeeBalance, setEditFeeBalance] = useState(0);
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editPhotoError, setEditPhotoError] = useState('');
  const [editModalError, setEditModalError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    regNo?: string;
    program?: string;
  }>({});
  const [editTouched, setEditTouched] = useState<{ [key: string]: boolean }>({});

  const handleOpenEditModal = (student: StudentRow) => {
    setEditingStudent(student);
    setEditFullName(student.name);
    setEditEmail(student.email);
    setEditRegNo(student.admissionNo);

    // Derive faculty or fallback
    const matchedFac = Object.keys(FACULTY_DEPARTMENTS).find((f) =>
      FACULTY_DEPARTMENTS[f].includes(student.department || '')
    ) || student.faculty || 'School of Computing & Informatics';
    setEditFaculty(matchedFac);

    const deps = FACULTY_DEPARTMENTS[matchedFac] || [];
    const matchedDept = student.department && deps.includes(student.department)
      ? student.department
      : (deps[0] || 'Information Technology');
    setEditDepartment(matchedDept);

    const progs = DEPARTMENT_PROGRAMS[matchedDept] || [];
    const matchedProg = student.program && progs.includes(student.program)
      ? student.program
      : (progs[0] || student.program || 'Bachelor of Science in Information Technology');
    setEditProgram(matchedProg);

    setEditYearOfStudy(student.year || 1);
    setEditPhotoUrl(student.photoUrl || '');
    setEditPhotoError('');
    setEditCampusCode(student.campusCode || 'ZU-TECH');
    setEditFeeBalance(student.feeBalance || 0);

    setEditModalError('');
    setEditFieldErrors({});
    setEditTouched({});
    setIsEditModalOpen(true);
  };

  const handleEditFacultyChange = (newFaculty: string) => {
    setEditFaculty(newFaculty);
    const deps = FACULTY_DEPARTMENTS[newFaculty] || [];
    const nextDept = deps[0] || '';
    setEditDepartment(nextDept);
    const progs = DEPARTMENT_PROGRAMS[nextDept] || [];
    const nextProg = progs[0] || (nextDept ? `Bachelor of Science in ${nextDept}` : '');
    setEditProgram(nextProg);
  };

  const handleEditDepartmentChange = (newDept: string) => {
    setEditDepartment(newDept);
    const progs = DEPARTMENT_PROGRAMS[newDept] || [];
    const nextProg = progs[0] || (newDept ? `Bachelor of Science in ${newDept}` : '');
    setEditProgram(nextProg);
  };

  const validateEditField = (
    field: 'fullName' | 'email' | 'regNo' | 'program',
    overrideVal?: string
  ): string | undefined => {
    const raw =
      overrideVal !== undefined
        ? overrideVal
        : field === 'fullName'
        ? editFullName
        : field === 'email'
        ? editEmail
        : field === 'regNo'
        ? editRegNo
        : editProgram;
    const val = (raw || '').trim();

    if (field === 'fullName') {
      if (!val) return 'This field is required';
    } else if (field === 'email') {
      if (!val) return 'This field is required';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val.toLowerCase())) {
        return 'Enter a valid email address, e.g. brian.otieno@university.ac.ke';
      }
    } else if (field === 'regNo') {
      if (!val) return 'This field is required';
    } else if (field === 'program') {
      if (!val) return 'This field is required';
    }
    return undefined;
  };

  const handleEditBlur = (field: 'fullName' | 'email' | 'regNo' | 'program') => {
    setEditTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateEditField(field);
    setEditFieldErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !editingStudent) return;
    setEditModalError('');

    const trimmedName = editFullName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    const trimmedRegNo = editRegNo.trim().toUpperCase();

    setEditTouched({ fullName: true, email: true, regNo: true, program: true });
    const errors = {
      fullName: validateEditField('fullName', trimmedName),
      email: validateEditField('email', trimmedEmail),
      regNo: validateEditField('regNo', trimmedRegNo),
      program: validateEditField('program', editProgram),
    };

    if (Object.values(errors).some(Boolean)) {
      setEditFieldErrors(errors);
      return;
    }

    // Duplicate check against other students
    if (students.some((s) => s.id !== editingStudent.id && s.email && s.email.toLowerCase() === trimmedEmail)) {
      setEditFieldErrors((prev) => ({ ...prev, email: 'A student with this email already exists' }));
      setEditModalError('A student with this email already exists');
      return;
    }

    if (students.some((s) => s.id !== editingStudent.id && s.admissionNo && s.admissionNo.toUpperCase() === trimmedRegNo)) {
      setEditFieldErrors((prev) => ({ ...prev, regNo: 'A student with this registration number already exists' }));
      setEditModalError('A student with this registration number already exists');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch('/api/v1/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudent.id,
          admission_number: trimmedRegNo,
          full_name: trimmedName,
          email: trimmedEmail,
          faculty: editFaculty,
          department: editDepartment,
          program_name: editProgram,
          year_of_study: editYearOfStudy,
          campus_code: editCampusCode,
          fee_balance: editFeeBalance,
          // Send the photo only when it changed ('' on purpose = remove it).
          ...(editPhotoUrl !== (editingStudent.photoUrl || '') ? { photo_url: editPhotoUrl } : {}),
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update student record.');

      const updatedRow = mapStudent(d.data);
      setStudents((prev) => prev.map((s) => (s.id === updatedRow.id ? updatedRow : s)));

      setSuccessBanner({
        fullName: trimmedName,
        regNo: trimmedRegNo,
        email: trimmedEmail,
      });

      setIsEditModalOpen(false);
      setEditingStudent(null);
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to update student record.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ==========================================
  // DEACTIVATE / SUSPEND CONFIRMATION MODAL
  // ==========================================
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetStudent, setStatusTargetStudent] = useState<StudentRow | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusModalError, setStatusModalError] = useState('');

  const handleOpenStatusModal = (student: StudentRow) => {
    setStatusTargetStudent(student);
    setStatusReason('');
    setStatusModalError('');
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!canWrite || !statusTargetStudent) return;
    setStatusModalError('');
    setStatusSubmitting(true);

    const nextStatus = statusTargetStudent.status === 'active' ? 'suspended' : 'active';

    try {
      const res = await fetch('/api/v1/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: statusTargetStudent.id,
          admission_number: statusTargetStudent.admissionNo,
          status: nextStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to change student status.');

      const updatedRow = mapStudent(d.data);
      setStudents((prev) => prev.map((s) => (s.id === updatedRow.id ? updatedRow : s)));

      setSuccessBanner({
        fullName: statusTargetStudent.name,
        regNo: statusTargetStudent.admissionNo,
        email: statusTargetStudent.email,
      });

      setIsStatusModalOpen(false);
      setStatusTargetStudent(null);
    } catch (err: any) {
      setStatusModalError(err.message || 'Failed to change student status.');
    } finally {
      setStatusSubmitting(false);
    }
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

  const [idCardStudent, setIdCardStudent] = useState<StudentRow | null>(null);

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
      // Same profile photo, printed on the card (data URLs only - jsPDF cannot fetch remote URLs reliably).
      photoDataUrl: student.photoUrl?.startsWith('data:image/') ? student.photoUrl : undefined,
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
            Student Registry
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
              {institutional?<p className="text-xs text-emerald-800 mt-1">Academic record saved. Invite the student to link their institutional login. Student Hub enrolment synchronization runs separately.</p>:<p className="text-xs text-emerald-800 mt-1">
                They can sign in at the Student Hub with their email (
                <span className="font-mono font-semibold">{successBanner.email}</span>) and the initial password.
              </p>}
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              hidden={institutional}
              onClick={handleCopyCredentials}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy credentials'}</span>
            </button>
            {institutional&&<button className="border rounded px-3 py-2" onClick={async()=>{try{const r=await fetch('/api/v1/staff/invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:successBanner.email})});const d=await r.json();if(!r.ok)throw new Error(d.error);setModalError('');alert(d.message);}catch(e:any){setModalError(e.message);}}}>Invite institutional account</button>}
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
          <span className="text-xs font-semibold text-slate-500">{filtered.length} Students Listed · Scroll sideways to see the Actions column →</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="text-xs font-bold uppercase bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Admission No</th>
                <th className="px-5 py-3.5">Full Name</th>
                <th className="px-5 py-3.5">Email</th>
                {role !== 'finance_officer' && <th className="px-5 py-3.5">Degree Program</th>}
                {role !== 'finance_officer' && <th className="px-5 py-3.5">Level</th>}
                {role !== 'finance_officer' && <th className="px-5 py-3.5">CGPA</th>}
                <th className="px-5 py-3.5">Fee Balance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3.5 font-mono font-semibold text-academic-navy-800">{s.admissionNo}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <StudentAvatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                      <span>{s.name}</span>
                    </div>
                  </td>
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
                  <td className="px-5 py-3.5">
                    {s.status === 'suspended' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5" />
                        Suspended
                      </span>
                    ) : s.status === 'inactive' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-1.5" />
                        Inactive
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      {role !== 'finance_officer' && (
                        <button
                          onClick={() => setIdCardStudent(s)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded bg-academic-navy-50 hover:bg-academic-navy-100 text-academic-navy-800 border border-academic-navy-200 transition"
                          title="View Student ID Card"
                        >
                          <CreditCard className="h-3.5 w-3.5 text-academic-gold-600" />
                          <span className="hidden xl:inline">ID Card</span>
                        </button>
                      )}

                      {canWrite && (
                        <button
                          disabled={!s.feeCleared || s.status === 'suspended'}
                          onClick={() => handleDownloadExamCard(s)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition"
                          title={s.status === 'suspended' ? 'Suspended students cannot download exam card' : 'Download Exam Clearance Card PDF'}
                        >
                          <Download className="h-3.5 w-3.5 text-academic-navy-700" />
                          <span className="hidden xl:inline">Exam Pass</span>
                        </button>
                      )}

                      {canWrite && (
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                          title="Edit Student Record"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      {canWrite && (
                        <button
                          onClick={() => handleOpenStatusModal(s)}
                          className={`inline-flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded transition border ${
                            s.status === 'suspended'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                          }`}
                          title={s.status === 'suspended' ? 'Reactivate Student Record' : 'Suspend Student Record'}
                        >
                          {s.status === 'suspended' ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              <span>Reactivate</span>
                            </>
                          ) : (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              <span>Suspend</span>
                            </>
                          )}
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
              setModalError('');
              setFieldErrors({});
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Register Student</h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setIsModalOpen(false);
                  setModalError('');
                  setFieldErrors({});
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

            <form noValidate onSubmit={handleRegisterStudent} className="space-y-4 mt-4 text-sm">
              {/* Profile photo + live ID card preview: ONE photo for both */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Profile Photo
                  </label>
                  <p className="text-[11px] text-slate-500 mb-3">
                    This one photo becomes the student&apos;s profile photo <strong>and</strong> the photo on their Student ID Card.
                  </p>
                  <div className="flex items-center gap-3">
                    <StudentAvatar name={fullName || 'New Student'} photoUrl={photoUrl || undefined} size="lg" />
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="student-photo-input" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition">
                        <Camera className="h-3.5 w-3.5 text-academic-gold-400" />
                        <span>{photoUrl ? 'Change photo' : 'Upload photo'}</span>
                      </label>
                      <input
                        id="student-photo-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { handlePhotoFile(e.target.files?.[0], setPhotoUrl, setPhotoError); e.target.value = ''; }}
                      />
                      {photoUrl && (
                        <button type="button" onClick={() => setPhotoUrl('')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition">
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {photoError && <p className="mt-2 text-xs text-rose-600 font-medium">{photoError}</p>}
                  <p className="mt-2 text-[11px] text-slate-500">JPG or PNG. It is cropped square and resized automatically. You can also add it later from Edit.</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase mb-2">Student ID Card - Live Preview</p>
                  <StudentIdCard
                    compact
                    student={{
                      name: fullName || 'Student Name',
                      admissionNo: regNo || 'REG/2026/0000',
                      program: program,
                      faculty,
                      department,
                      campusCode,
                      year: yearOfStudy,
                      photoUrl: photoUrl || undefined,
                    }}
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Brian Otieno"
                  value={fullName}
                  onBlur={() => handleBlur('fullName')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFullName(val);
                    if (touched.fullName || fieldErrors.fullName) {
                      setFieldErrors((prev) => ({ ...prev, fullName: validateField('fullName', val) }));
                    }
                  }}
                  className={`w-full border ${
                    fieldErrors.fullName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-academic-navy-900'
                  } rounded-lg px-3 py-2 text-slate-900 focus:ring-2 outline-none`}
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email & Registration Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. brian.otieno@university.ac.ke"
                    value={email}
                    onBlur={() => handleBlur('email')}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase();
                      setEmail(val);
                      if (touched.email || fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: validateField('email', val) }));
                      }
                    }}
                    className={`w-full border ${
                      fieldErrors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-academic-navy-900'
                    } rounded-lg px-3 py-2 text-slate-900 focus:ring-2 outline-none lowercase`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Registration Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BIT/2026/1002"
                    value={regNo}
                    onBlur={() => handleBlur('regNo')}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setRegNo(val);
                      if (touched.regNo || fieldErrors.regNo) {
                        setFieldErrors((prev) => ({ ...prev, regNo: validateField('regNo', val) }));
                      }
                    }}
                    className={`w-full border ${
                      fieldErrors.regNo ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-academic-navy-900'
                    } rounded-lg px-3 py-2 font-mono text-slate-900 focus:ring-2 outline-none uppercase`}
                  />
                  {fieldErrors.regNo && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.regNo}</p>
                  )}
                </div>
              </div>

              {/* Faculty & Department */}
              {institutional&&<div className="grid grid-cols-2 gap-4"><label>Program<select required aria-label="Program" value={programId} onChange={e=>setProgramId(e.target.value)} className="w-full border rounded p-2"><option value="">Choose program</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Date of birth<input required type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} className="w-full border rounded p-2"/></label><label>Gender<select value={gender} onChange={e=>setGender(e.target.value)} className="w-full border rounded p-2"><option value="other">Other</option><option value="female">Female</option><option value="male">Male</option></select></label></div>}
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
                    onChange={(e) => handleDepartmentChange(e.target.value)}
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

              {/* Degree Programme */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Degree Programme <span className="text-rose-500">*</span>
                </label>
                <select
                  value={program}
                  onBlur={() => handleBlur('program')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProgram(val);
                    if (touched.program || fieldErrors.program) {
                      setFieldErrors((prev) => ({ ...prev, program: validateField('program', val) }));
                    }
                  }}
                  className={`w-full border ${
                    fieldErrors.program ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-academic-navy-900'
                  } rounded-lg px-3 py-2 text-slate-900 focus:ring-2 outline-none text-xs`}
                >
                  {(DEPARTMENT_PROGRAMS[department] || [`Bachelor of Science in ${department}`]).map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                </select>
                {fieldErrors.program && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.program}</p>
                )}
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
                    onClick={() => {
                      handleGeneratePassword();
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    className="text-xs font-semibold text-academic-navy-700 hover:text-academic-navy-900 flex items-center space-x-1"
                  >
                    <Sparkles className="h-3 w-3 text-academic-gold-500" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onBlur={() => handleBlur('password')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPassword(val);
                      if (touched.password || fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: validateField('password', val) }));
                      }
                    }}
                    className={`w-full border ${
                      fieldErrors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-academic-navy-900'
                    } rounded-lg pl-3 pr-10 py-2 font-mono text-slate-900 focus:ring-2 outline-none`}
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
                {fieldErrors.password ? (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{fieldErrors.password}</p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must be at least 8 characters. The student will use this password to sign in at the Student Hub.
                  </p>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError('');
                    setFieldErrors({});
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

      {/* Edit Student Modal - Fix typos / corrections */}
      {isEditModalOpen && canWrite && editingStudent && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditModalOpen(false);
              setEditingStudent(null);
              setEditModalError('');
              setEditFieldErrors({});
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit className="h-5 w-5 text-academic-navy-700" />
                <div>
                  <h3 className="text-lg font-bold text-academic-navy-950">Edit Student Record</h3>
                  <p className="text-xs text-slate-500">
                    Fix typos or correct student details for {editingStudent.admissionNo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingStudent(null);
                  setEditModalError('');
                  setEditFieldErrors({});
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editModalError && (
              <div
                role="alert"
                className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-800 text-xs font-medium"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{editModalError}</span>
              </div>
            )}

            <form noValidate onSubmit={handleSaveEdit} className="space-y-4 mt-4 text-sm">
              {/* Profile photo - the same photo appears on the ID card */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <StudentAvatar name={editFullName || editingStudent.name} photoUrl={editPhotoUrl || undefined} size="lg" />
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase">Profile Photo</p>
                  <p className="text-[11px] text-slate-500 mb-1.5">Same photo on the profile and the Student ID Card.</p>
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="edit-student-photo-input" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition">
                      <Camera className="h-3.5 w-3.5 text-academic-gold-400" />
                      <span>{editPhotoUrl ? 'Change photo' : 'Upload photo'}</span>
                    </label>
                    <input
                      id="edit-student-photo-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => { handlePhotoFile(e.target.files?.[0], setEditPhotoUrl, setEditPhotoError); e.target.value = ''; }}
                    />
                    {editPhotoUrl && (
                      <button type="button" onClick={() => setEditPhotoUrl('')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                  {editPhotoError && <p className="mt-1.5 text-xs text-rose-600 font-medium">{editPhotoError}</p>}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditFullName(val);
                    if (editTouched.fullName) {
                      setEditFieldErrors((prev) => ({
                        ...prev,
                        fullName: validateEditField('fullName', val),
                      }));
                    }
                  }}
                  onBlur={() => handleEditBlur('fullName')}
                  aria-invalid={!!editFieldErrors.fullName}
                  className={`w-full border ${
                    editFieldErrors.fullName
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-academic-navy-500'
                  } rounded-lg px-3 py-2 text-slate-900 focus:ring-2 outline-none`}
                />
                {editFieldErrors.fullName && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{editFieldErrors.fullName}</p>
                )}
              </div>

              {/* Email & Registration Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Institutional Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditEmail(val);
                      if (editTouched.email) {
                        setEditFieldErrors((prev) => ({
                          ...prev,
                          email: validateEditField('email', val),
                        }));
                      }
                    }}
                    onBlur={() => handleEditBlur('email')}
                    aria-invalid={!!editFieldErrors.email}
                    className={`w-full border ${
                      editFieldErrors.email
                        ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-academic-navy-500'
                    } rounded-lg px-3 py-2 font-mono text-slate-900 focus:ring-2 outline-none`}
                  />
                  {editFieldErrors.email && (
                    <p className="mt-1 text-xs text-rose-600 font-medium">{editFieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Registration No
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                      Record Key (Read-only)
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={editRegNo}
                    className="w-full border border-slate-200 bg-slate-100 text-slate-500 font-mono rounded-lg px-3 py-2 outline-none cursor-not-allowed select-all"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">
                    Permanent record key — immutable to preserve cross-system student sync identity.
                  </p>
                </div>
              </div>

              {/* Faculty & Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Faculty <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editFaculty}
                    onChange={(e) => handleEditFacultyChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-500 outline-none bg-white"
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
                    value={editDepartment}
                    onChange={(e) => handleEditDepartmentChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-500 outline-none bg-white"
                  >
                    {(FACULTY_DEPARTMENTS[editFaculty] || []).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Degree Programme Cascading Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Degree Programme <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editProgram}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditProgram(val);
                    if (editTouched.program) {
                      setEditFieldErrors((prev) => ({
                        ...prev,
                        program: validateEditField('program', val),
                      }));
                    }
                  }}
                  onBlur={() => handleEditBlur('program')}
                  aria-invalid={!!editFieldErrors.program}
                  className={`w-full border ${
                    editFieldErrors.program
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-academic-navy-500'
                  } rounded-lg px-3 py-2 text-slate-900 focus:ring-2 outline-none bg-white`}
                >
                  {(DEPARTMENT_PROGRAMS[editDepartment] || []).map((prog) => (
                    <option key={prog} value={prog}>
                      {prog}
                    </option>
                  ))}
                  {/* Fallback if student has a custom/legacy program */}
                  {editProgram &&
                    !(DEPARTMENT_PROGRAMS[editDepartment] || []).includes(editProgram) && (
                      <option value={editProgram}>{editProgram}</option>
                    )}
                </select>
                {editFieldErrors.program && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{editFieldErrors.program}</p>
                )}
              </div>

              {/* Year, Campus & Fee Balance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Year of Study <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editYearOfStudy}
                    onChange={(e) => setEditYearOfStudy(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-500 outline-none bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Campus <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editCampusCode}
                    onChange={(e) => setEditCampusCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-500 outline-none bg-white font-mono"
                  >
                    <option value="ZU-TECH">ZU-TECH (Technology Park / Main)</option>
                    <option value="ZU-RUIRU">ZU-RUIRU (Ruiru Campus)</option>
                    <option value="ZU-PIONEER">ZU-PIONEER (Pioneer Campus)</option>
                    <option value="ZU-CBD">ZU-CBD (Nairobi CBD Campus)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Fee Balance (KES) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editFeeBalance}
                    onChange={(e) => setEditFeeBalance(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-academic-navy-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">0 = Cleared for Exam Pass</p>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={editSubmitting}
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingStudent(null);
                    setEditModalError('');
                    setEditFieldErrors({});
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow flex items-center space-x-2"
                >
                  {editSubmitting && (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  <span>{editSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student ID Card Viewer - the student's profile photo IS the card photo */}
      {idCardStudent && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIdCardStudent(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-academic-gold-500" />
                <h3 className="text-lg font-bold text-academic-navy-950">Student ID Card</h3>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIdCardStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <StudentAvatar name={idCardStudent.name} photoUrl={idCardStudent.photoUrl} size="lg" />
                <div>
                  <p className="font-bold text-slate-900">{idCardStudent.name}</p>
                  <p className="text-xs text-slate-500">Profile photo and ID card photo are the same photo.</p>
                  {!idCardStudent.photoUrl && <p className="text-xs text-amber-700 font-medium mt-0.5">No photo yet - add one from Edit and it will appear here.</p>}
                </div>
              </div>
              <StudentIdCard student={{ name: idCardStudent.name, admissionNo: idCardStudent.admissionNo, program: idCardStudent.program, faculty: idCardStudent.faculty, department: idCardStudent.department, campusCode: idCardStudent.campusCode, year: idCardStudent.year, semester: idCardStudent.semester, status: idCardStudent.status, photoUrl: idCardStudent.photoUrl }} />
              <StudentIdCardBack admissionNo={idCardStudent.admissionNo} />
              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIdCardStudent(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
                <button type="button" onClick={() => handleDownloadIDCard(idCardStudent)} className="px-5 py-2 bg-academic-navy-900 hover:bg-academic-navy-800 text-white rounded-lg text-sm font-bold shadow flex items-center space-x-2">
                  <Download className="h-4 w-4 text-academic-gold-400" />
                  <span>Download PDF Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Dialog: one verb for this action */}
      {isStatusModalOpen && canWrite && statusTargetStudent && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsStatusModalOpen(false);
              setStatusTargetStudent(null);
              setStatusModalError('');
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                {statusTargetStudent.status === 'active' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : (
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                )}
                <h3 className="text-lg font-bold text-academic-navy-950">
                  {statusTargetStudent.status === 'active'
                    ? 'Suspend Student'
                    : 'Reactivate Student Record'}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setIsStatusModalOpen(false);
                  setStatusTargetStudent(null);
                  setStatusModalError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {statusModalError && (
              <div
                role="alert"
                className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start space-x-2 text-rose-800 text-xs font-medium"
              >
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{statusModalError}</span>
              </div>
            )}

            <div className="mt-4 space-y-4">
              {statusTargetStudent.status === 'active' ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-950">
                    <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>Audit-Trail Protection Guarantee</span>
                  </div>
                  <p className="leading-relaxed">
                    Student records are <strong>never permanently deleted</strong>. Suspending this student will deactivate their portal access and exam clearance privileges while preserving complete historical grades, financial ledgers, and registrar audit trails.
                  </p>
                  <p className="leading-relaxed">
                    One verb is used for this action: <strong>Suspend</strong> (temporary, reversible with Reactivate). Nothing is deleted from this page.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-950">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Restore Student Status</span>
                  </div>
                  <p className="leading-relaxed">
                    Reactivating this student will restore their active status in the university database, re-enabling portal login and exam clearance pass eligibility.
                  </p>
                </div>
              )}

              {/* Student Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Student Name:</span>
                  <span className="font-bold text-slate-900">{statusTargetStudent.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Admission Number:</span>
                  <span className="font-mono font-bold text-academic-navy-800">
                    {statusTargetStudent.admissionNo}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <span
                    className={`font-bold capitalize ${
                      statusTargetStudent.status === 'active' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {statusTargetStudent.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Target Status:</span>
                  <span
                    className={`font-bold capitalize ${
                      statusTargetStudent.status === 'active' ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {statusTargetStudent.status === 'active' ? 'Suspended' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {statusTargetStudent.status === 'active'
                    ? 'Reason for Suspension (Recorded in Audit Log)'
                    : 'Reactivation Note (Recorded in Audit Log)'}
                </label>
                <textarea
                  rows={2}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder={
                    statusTargetStudent.status === 'active'
                      ? 'e.g. Administrative correction, disciplinary deferral, fee non-compliance...'
                      : 'e.g. Reinstated by Registrar Office...'
                  }
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-academic-navy-500 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={statusSubmitting}
                  onClick={() => {
                    setIsStatusModalOpen(false);
                    setStatusTargetStudent(null);
                    setStatusModalError('');
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={statusSubmitting}
                  onClick={handleConfirmStatusChange}
                  className={`px-5 py-2 rounded-lg text-sm font-bold shadow flex items-center space-x-2 text-white ${
                    statusTargetStudent.status === 'active'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {statusSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : statusTargetStudent.status === 'active' ? (
                    <UserX className="h-4 w-4" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  <span>
                    {statusSubmitting
                      ? 'Updating...'
                      : statusTargetStudent.status === 'active'
                      ? 'Confirm Suspension'
                      : 'Confirm Reactivation'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
