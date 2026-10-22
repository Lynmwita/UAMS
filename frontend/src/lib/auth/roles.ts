import type { UserRole } from '@/types';

export const USER_ROLES: UserRole[] = ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer', 'student'];
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
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
  library: ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student'],
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
