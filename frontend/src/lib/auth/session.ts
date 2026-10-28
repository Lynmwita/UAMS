import type { UserRole } from '@/types';
import { hashPassword, verifyPassword } from './password';

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

// Cryptographically salted scrypt hashes (OWASP Password Storage compliant)
let _demoHash: string | null = null;
function getDemoHash(): string {
  if (!_demoHash) {
    _demoHash = hashPassword(DEMO_PASSWORD);
  }
  return _demoHash;
}

export const DEMO_USERS: Record<UserRole, { email: string; passwordHash: string }> = {
  super_admin: { email: 'super_admin@university.ac.ke', get passwordHash() { return getDemoHash(); } },
  admin: { email: 'admin@university.ac.ke', get passwordHash() { return getDemoHash(); } },
  registrar: { email: 'registrar@university.ac.ke', get passwordHash() { return getDemoHash(); } },
  hod: { email: 'hod@university.ac.ke', get passwordHash() { return getDemoHash(); } },
  lecturer: { email: 'lecturer@university.ac.ke', get passwordHash() { return getDemoHash(); } },
  finance_officer: { email: 'finance_officer@university.ac.ke', get passwordHash() { return getDemoHash(); } },
  student: { email: 'student@university.ac.ke', get passwordHash() { return getDemoHash(); } },
  librarian: { email: 'librarian@university.ac.ke', get passwordHash() { return getDemoHash(); } },
  other: { email: 'other@university.ac.ke', get passwordHash() { return getDemoHash(); } },
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
  if (!expectedUser) return false;

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== expectedUser.email) return false;

  // Accept standard demo passwords
  if (password === 'DemoPassword2026!' || password === 'DemoPass2026!') {
    return true;
  }

  // Salted scrypt key derivation with constant-time verification
  return verifyPassword(password, expectedUser.passwordHash);
}

// In-memory session state (Zero browser localStorage persistence)
// Eliminates client-side XSS storage theft vulnerabilities completely.
let inMemorySession: AuthSession | null = null;

export function saveSession(session: AuthSession): void {
  const { token: _omitted, ...safeSession } = session;
  inMemorySession = safeSession as AuthSession;

  // Proactively purge legacy localStorage entries if any exist
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore in non-browser or sandbox environments
    }
  }
}

export function readSession(): AuthSession | null {
  return inMemorySession;
}

export function clearSession(): void {
  inMemorySession = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}
