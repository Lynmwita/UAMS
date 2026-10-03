import { UserRole } from '@/types';

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
