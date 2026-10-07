import type { UserRole } from '@/types';

export const SESSION_STORAGE_KEY = 'uams_session';
export const DEMO_PASSWORD = 'DemoPassword2026!';

export type AuthSession = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  token?: string;
  authenticatedAt: string;
};


export const DEMO_USERS: Record<UserRole, { email: string; password: string }> = {
  super_admin: { email: 'super_admin@university.ac.ke', password: DEMO_PASSWORD },
  admin: { email: 'admin@university.ac.ke', password: DEMO_PASSWORD },
  registrar: { email: 'registrar@university.ac.ke', password: DEMO_PASSWORD },
  hod: { email: 'hod@university.ac.ke', password: DEMO_PASSWORD },
  lecturer: { email: 'lecturer@university.ac.ke', password: DEMO_PASSWORD },
  finance_officer: { email: 'finance_officer@university.ac.ke', password: DEMO_PASSWORD },
  student: { email: 'student@university.ac.ke', password: DEMO_PASSWORD },
};

export function normalizeRole(role?: string): UserRole {
  const value = (role ?? 'student').trim().toLowerCase().replace(/-/g, '_');
  return Object.prototype.hasOwnProperty.call(DEMO_USERS, value)
    ? (value as UserRole)
    : 'student';
}

export function isValidDemoCredentials(email: string, password: string, role?: string): boolean {
  const normalizedRole = normalizeRole(role);
  const expectedUser = DEMO_USERS[normalizedRole];
  const normalizedEmail = email.trim().toLowerCase();

  return Boolean(expectedUser) && normalizedEmail === expectedUser.email && password === expectedUser.password;
}

export function saveSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  // Security hardening: Do not persist sensitive JWTs in localStorage (OWASP XSS defense).
  // The cryptographically signed token is stored exclusively in the secure httpOnly cookie.
  const { token: _omitted, ...safeSession } = session;
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(safeSession));
}

export function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) return null;

    const parsedSession = JSON.parse(rawSession) as Partial<AuthSession>;
    if (!parsedSession.email || !parsedSession.role || !parsedSession.authenticatedAt) {
      return null;
    }

    return parsedSession as AuthSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
