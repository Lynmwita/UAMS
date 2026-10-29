import type { UserRole } from '@/types';

export const USER_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'registrar',
  'hod',
  'lecturer',
  'finance_officer',
  'student',
  'librarian',
  'support_staff',
  'audit_officer',
];

/**
 * Login-form sentinel, NOT a role: "Support staff / Other" means "my role
 * isn't listed — resolve it from my record". It must never be treated as a
 * UserRole and never grants authorization; the login route resolves the
 * real role from the demo account or the institutional record instead.
 */
export const OTHER_ROLE_SELECTION = 'other';
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
  if (['audit_officer', 'compliance_officer', 'auditor', 'internal_auditor'].includes(norm)) return 'audit_officer';
  if (['student'].includes(norm)) return 'student';
  if (['lecturer', 'faculty', 'professor', 'tutorial_fellow', 'teaching_assistant', 'lab_technician'].includes(norm)) return 'lecturer';
  // General campus support & operational staff resolve to the scoped
  // support_staff role — never to a generic placeholder role, and never
  // to librarian (the old catch-all). Provisioning maps unmapped staff
  // titles to support_staff; this canonical fallback only covers legacy
  // login-side mappings.
  return 'support_staff';
}

export const PAGE_ROLES: Record<string, UserRole[]> = {
  dashboard: USER_ROLES,
  structure: ['super_admin', 'admin', 'registrar'],
  students: ['super_admin', 'admin', 'registrar', 'hod', 'finance_officer'],
  courses: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'],
  attendance: ['super_admin', 'admin', 'hod', 'lecturer', 'student'],
  grades: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student', 'audit_officer'],
  exams: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student', 'audit_officer'],
  finance: ['super_admin', 'admin', 'finance_officer', 'student', 'audit_officer'],
  hostel: ['super_admin', 'admin', 'registrar', 'student'],
  library: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student', 'librarian'],
  timetable: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'],
  notifications: ['super_admin', 'admin', 'registrar', 'finance_officer'],
  audit: ['super_admin', 'admin', 'audit_officer'],
  ai: USER_ROLES,
  announcements: USER_ROLES,
  admissions: ['super_admin', 'admin', 'registrar', 'hod'],
  staff: ['super_admin', 'admin', 'registrar'],
  events: USER_ROLES,
  reports: ['super_admin', 'admin', 'registrar', 'finance_officer', 'hod', 'audit_officer'],
  support: ['super_admin', 'admin', 'registrar'],
};

export function canAccessPage(role: UserRole, module: string): boolean {
  return PAGE_ROLES[module]?.includes(role) ?? false;
}
