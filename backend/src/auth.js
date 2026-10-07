const crypto = require('crypto');

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};
const KEY_LENGTH = 64;

function hashPassword(plainText, saltHex) {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainText, salt, KEY_LENGTH, SCRYPT_PARAMS);
  return `${salt}$${derivedKey.toString('hex')}`;
}

function verifyPassword(plainText, storedHash) {
  if (!plainText || !storedHash || typeof storedHash !== 'string' || !storedHash.includes('$')) {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 2) return false;
  const [salt, expectedHashHex] = parts;
  try {
    const derivedKey = crypto.scryptSync(plainText, salt, KEY_LENGTH, SCRYPT_PARAMS);
    const expectedBuf = Buffer.from(expectedHashHex, 'hex');
    if (derivedKey.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derivedKey, expectedBuf);
  } catch {
    return false;
  }
}

const INITIAL_DEMO_HASH = hashPassword('DemoPassword2026!');

const DEMO_USERS = {
  super_admin: { email: 'super_admin@university.ac.ke', passwordHash: INITIAL_DEMO_HASH },
  admin: { email: 'admin@university.ac.ke', passwordHash: INITIAL_DEMO_HASH },
  registrar: { email: 'registrar@university.ac.ke', passwordHash: INITIAL_DEMO_HASH },
  hod: { email: 'hod@university.ac.ke', passwordHash: INITIAL_DEMO_HASH },
  lecturer: { email: 'lecturer@university.ac.ke', passwordHash: INITIAL_DEMO_HASH },
  finance_officer: { email: 'finance_officer@university.ac.ke', passwordHash: INITIAL_DEMO_HASH },
  student: { email: 'student@university.ac.ke', passwordHash: INITIAL_DEMO_HASH },
};

function normalizeRole(role = 'student') {
  const normalized = String(role).trim().toLowerCase().replace(/-/g, '_');
  return Object.prototype.hasOwnProperty.call(DEMO_USERS, normalized) ? normalized : 'student';
}

let ephemeralDevSecret = null;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL SECURITY VIOLATION: JWT_SECRET environment variable must be configured in production. Refusing to start.'
      );
    }
    // Dynamic runtime secret: zero static fallback secrets in source code
    if (!ephemeralDevSecret) {
      ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
    }
    return ephemeralDevSecret;
  }
  if (secret.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY VIOLATION: JWT_SECRET must be at least 32 characters in production.');
  }
  return secret;
}

function signPayload(payload) {
  return crypto.createHmac('sha256', getJwtSecret()).update(payload).digest('hex');
}

function buildDemoToken(role = 'student') {
  const normalizedRole = normalizeRole(role);
  const ts = Date.now();
  const raw = `uams_demo_${normalizedRole}_${ts}`;
  const sig = signPayload(raw);
  return `${raw}.${sig}`;
}

function verifyDemoToken(token, expectedRole) {
  if (typeof token !== 'string' || !token) {
    return null;
  }

  // Format: uams_demo_${role}_${timestamp}.${sig}
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [raw, sig] = parts;
  const match = raw.match(/^uams_demo_([a-z_]+)_(\d+)$/);
  if (!match) {
    return null;
  }

  const expectedSig = signPayload(raw);
  if (sig.length !== expectedSig.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null; // Tampered or forged token
  }

  const [, role, tsStr] = match;
  if (!Object.prototype.hasOwnProperty.call(DEMO_USERS, role)) {
    return null;
  }

  // Enforce 24-hour token expiry
  const ts = Number(tsStr);
  if (Date.now() - ts > 24 * 60 * 60 * 1000) {
    return null; // Expired token
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
  if (String(email).trim().toLowerCase() !== expectedUser.email) return false;
  return verifyPassword(password, expectedUser.passwordHash);
}

module.exports = {
  DEMO_USERS,
  normalizeRole,
  buildDemoToken,
  verifyDemoToken,
  requireRole,
  isValidDemoCredential,
  hashPassword,
  verifyPassword,
  getJwtSecret,
};
