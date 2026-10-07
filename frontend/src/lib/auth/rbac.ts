import { UserRole } from '@/types';

export type Permission =
  | 'students:read'
  | 'students:write'
  | 'grades:read'
  | 'grades:write'
  | 'grades:approve'
  | 'courses:read'
  | 'courses:write'
  | 'finance:read'
  | 'finance:reconcile'
  | 'finance:write'
  | 'hostels:read'
  | 'hostels:allocate'
  | 'library:read'
  | 'library:loan'
  | 'exams:read'
  | 'exams:schedule'
  | 'audit:read';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 90,
  registrar: 80,
  hod: 70,
  lecturer: 60,
  finance_officer: 60,
  student: 10,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrator',
  admin: 'University Administrator',
  registrar: 'Registrar',
  hod: 'Head of Department',
  lecturer: 'Lecturer / Faculty',
  finance_officer: 'Finance Officer',
  student: 'Student',
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'students:read',
    'students:write',
    'grades:read',
    'grades:write',
    'grades:approve',
    'courses:read',
    'courses:write',
    'finance:read',
    'finance:reconcile',
    'finance:write',
    'hostels:read',
    'hostels:allocate',
    'library:read',
    'library:loan',
    'exams:read',
    'exams:schedule',
    'audit:read',
  ],
  admin: [
    'students:read',
    'students:write',
    'grades:read',
    'grades:write',
    'grades:approve',
    'courses:read',
    'courses:write',
    'finance:read',
    'finance:reconcile',
    'finance:write',
    'hostels:read',
    'hostels:allocate',
    'library:read',
    'library:loan',
    'exams:read',
    'exams:schedule',
    'audit:read',
  ],
  registrar: [
    'students:read',
    'students:write',
    'grades:read',
    'grades:approve',
    'courses:read',
    'courses:write',
    'exams:read',
    'exams:schedule',
    'hostels:read',
    'hostels:allocate',
    'audit:read',
  ],
  hod: [
    'students:read',
    'grades:read',
    'grades:write',
    'grades:approve',
    'courses:read',
    'courses:write',
    'exams:read',
    'exams:schedule',
  ],
  lecturer: [
    'grades:read',
    'grades:write',
    'courses:read',
    'exams:read',
  ],
  finance_officer: [
    'finance:read',
    'finance:reconcile',
    'finance:write',
    'students:read',
    'audit:read',
  ],
  student: [
    'courses:read',
    'courses:write',
    'hostels:read',
    'hostels:allocate',
    'library:read',
    'library:loan',
    'exams:read',
  ],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  if (role === 'super_admin') return true;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  if (userRole === 'super_admin') return true;
  return requiredRoles.includes(userRole);
}

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/dashboard/admin';
    case 'registrar':
      return '/dashboard/registrar';
    case 'hod':
      return '/dashboard/hod';
    case 'lecturer':
      return '/dashboard/lecturer';
    case 'finance_officer':
      return '/dashboard/finance';
    case 'student':
      return '/dashboard/student';
    default:
      return '/dashboard';
  }
}
