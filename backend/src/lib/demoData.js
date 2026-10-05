export const DEMO_USERS = {
  super_admin: { email: 'super_admin@university.ac.ke', password: 'DemoPassword2026!' },
  admin: { email: 'admin@university.ac.ke', password: 'DemoPassword2026!' },
  registrar: { email: 'registrar@university.ac.ke', password: 'DemoPassword2026!' },
  hod: { email: 'hod@university.ac.ke', password: 'DemoPassword2026!' },
  lecturer: { email: 'lecturer@university.ac.ke', password: 'DemoPassword2026!' },
  finance_officer: { email: 'finance_officer@university.ac.ke', password: 'DemoPassword2026!' },
  student: { email: 'student@university.ac.ke', password: 'DemoPassword2026!' },
};

export function normalizeRole(role = 'student') {
  const normalized = String(role).trim().toLowerCase().replace(/-/g, '_');
  return Object.prototype.hasOwnProperty.call(DEMO_USERS, normalized) ? normalized : 'student';
}

export function isValidDemoCredential(email, password, role) {
  const normalizedRole = normalizeRole(role);
  const expectedUser = DEMO_USERS[normalizedRole];
  if (!expectedUser) {
    return false;
  }

  return String(email).trim().toLowerCase() === expectedUser.email && String(password) === expectedUser.password;
}
