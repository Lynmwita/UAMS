import type { UserRole } from '@/types';

export const USER_ROLES: UserRole[] = ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer', 'student', 'librarian'];
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}

export function resolveCanonicalRole(rawRole: unknown): UserRole {
  if (isUserRole(rawRole)) return rawRole;
  const norm = String(rawRole || '').toLowerCase().trim();
  if (['super_admin', 'superadmin'].includes(norm)) return 'super_admin';
  if (['admin', 'administrator', 'human_resources', 'hr_officer', 'legal_officer', 'procurement_officer', 'systems_admin', 'it_support', 'data_architect'].includes(norm)) return 'admin';
  if (['registrar', 'admissions_officer', 'examinations_officer'].includes(norm)) return 'registrar';
  if (['hod', 'dean', 'chair'].includes(norm)) return 'hod';
  if (['finance_officer', 'finance', 'accountant', 'bursar'].includes(norm)) return 'finance_officer';
  if (['librarian', 'library'].includes(norm)) return 'librarian';
  if (['student'].includes(norm)) return 'student';
  if (['lecturer', 'faculty', 'professor', 'tutorial_fellow', 'teaching_assistant', 'lab_technician'].includes(norm)) return 'lecturer';
  // General campus support & operational staff map to general institutional staff view:
  return 'librarian';
}

export const PAGE_ROLES: Record<string, UserRole[]> = {
  dashboard: USER_ROLES,
  structure: ['super_admin', 'admin', 'registrar'],
  students: ['super_admin', 'admin', 'registrar', 'hod', 'finance_officer'],
  courses: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'],
  attendance: ['super_admin', 'admin', 'hod', 'lecturer', 'student'],
  grades: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'],
  exams: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'],
  finance: ['super_admin', 'admin', 'finance_officer', 'student'],
  hostel: ['super_admin', 'admin', 'registrar', 'student'],
  library: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student', 'librarian'],
  timetable: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'],
  notifications: ['super_admin', 'admin', 'registrar', 'finance_officer'],
  audit: ['super_admin', 'admin'],
  ai: USER_ROLES,
  announcements: USER_ROLES,
  admissions: ['super_admin', 'admin', 'registrar', 'hod'],
  staff: ['super_admin', 'admin', 'registrar'],
  events: USER_ROLES,
  reports: ['super_admin', 'admin', 'registrar', 'finance_officer', 'hod'],
  support: ['super_admin','admin','registrar'],
};

export function canAccessPage(role: UserRole, module: string): boolean {
  return PAGE_ROLES[module]?.includes(role) ?? false;
}
