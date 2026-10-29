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
  librarian: 50,
  student: 10,
  support_staff: 5,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Administrator',
  admin: 'University Administrator',
  registrar: 'Registrar',
  hod: 'Head of Department',
  lecturer: 'Lecturer / Faculty',
  finance_officer: 'Finance Officer',
  librarian: 'University Librarian',
  student: 'Student',
  support_staff: 'Support Staff',
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  "super_admin": [
    "students:read",
    "students:write",
    "grades:read",
    "grades:write",
    "grades:approve",
    "courses:read",
    "courses:write",
    "finance:read",
    "finance:reconcile",
    "finance:write",
    "hostels:read",
    "hostels:allocate",
    "library:read",
    "library:loan",
    "exams:read",
    "exams:schedule",
    "audit:read"
  ],
  "admin": [
    "students:read",
    "students:write",
    "grades:read",
    "grades:approve",
    "courses:read",
    "courses:write",
    "finance:read",
    "hostels:read",
    "hostels:allocate",
    "library:read",
    "library:loan",
    "exams:read",
    "exams:schedule",
    "audit:read"
  ],
  "registrar": [
    "students:read",
    "students:write",
    "grades:read",
    "grades:approve",
    "courses:read",
    "courses:write",
    "exams:read",
    "exams:schedule",
    "hostels:read",
    "hostels:allocate",
    "library:read",
    "library:loan"
  ],
  "hod": [
    "students:read",
    "grades:read",
    "grades:approve",
    "courses:read",
    "exams:read",
    "library:read"
  ],
  "lecturer": [
    "grades:read",
    "grades:write",
    "courses:read",
    "exams:read",
    "library:read"
  ],
  "finance_officer": [
    "finance:read",
    "finance:reconcile",
    "finance:write",
    "students:read"
  ],
  "student": [
    "courses:read",
    "hostels:read",
    "library:read",
    "exams:read"
  ],
  "librarian": [
    "library:read",
    "library:loan"
  ],
  // Support staff hold no data permissions: their dashboard is their own
  // roster, general announcements and events, and their own profile.
  "support_staff": []
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
  return role === 'finance_officer' ? '/dashboard/finance' : '/dashboard';
}
