const DEMO_USERS = {
  super_admin: { email: 'super_admin@university.ac.ke', password: 'DemoPassword2026!' },
  admin: { email: 'admin@university.ac.ke', password: 'DemoPassword2026!' },
  registrar: { email: 'registrar@university.ac.ke', password: 'DemoPassword2026!' },
  hod: { email: 'hod@university.ac.ke', password: 'DemoPassword2026!' },
  lecturer: { email: 'lecturer@university.ac.ke', password: 'DemoPassword2026!' },
  finance_officer: { email: 'finance_officer@university.ac.ke', password: 'DemoPassword2026!' },
  student: { email: 'student@university.ac.ke', password: 'DemoPassword2026!' },
};

function normalizeRole(role = 'student') {
  const normalized = String(role).trim().toLowerCase().replace(/-/g, '_');
  return Object.prototype.hasOwnProperty.call(DEMO_USERS, normalized) ? normalized : 'student';
}

function buildDemoToken(role = 'student') {
  const normalizedRole = normalizeRole(role);
  return `uams_demo_${normalizedRole}_${Date.now()}`;
}

function verifyDemoToken(token, expectedRole) {
  if (typeof token !== 'string' || !token) {
    return null;
  }

  const match = token.match(/^uams_demo_([a-z_]+)_(\d+)$/);
  if (!match) {
    return null;
  }

  const [, role] = match;
  if (!Object.prototype.hasOwnProperty.call(DEMO_USERS, role)) {
    return null;
  }

  if (expectedRole && normalizeRole(expectedRole) !== role) {
    return null;
  }

  return {
    role,
    email: DEMO_USERS[role].email,
  };
}

function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles)
    ? allowedRoles.map((role) => normalizeRole(role))
    : [normalizeRole(allowedRoles)];

  return (req, res, next) => {
    const authorization = String(req?.headers?.authorization || '');
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : authorization.trim();

    const verifiedUser = verifyDemoToken(token);
    if (!verifiedUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!roles.includes(verifiedUser.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: insufficient role permissions.' });
    }

    req.user = {
      ...verifiedUser,
      id: `usr-demo-${verifiedUser.role}`,
      first_name: 'Authorized',
      last_name: 'User',
    };

    return next();
  };
}

function isValidDemoCredential(email, password, role) {
  const normalizedRole = normalizeRole(role);
  const expectedUser = DEMO_USERS[normalizedRole];
  if (!expectedUser) return false;
  return String(email).trim().toLowerCase() === expectedUser.email && String(password) === expectedUser.password;
}

module.exports = {
  DEMO_USERS,
  normalizeRole,
  buildDemoToken,
  verifyDemoToken,
  requireRole,
  isValidDemoCredential,
};
