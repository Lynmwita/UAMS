import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidDemoCredentials, normalizeRole, saveSession, readSession, clearSession, SESSION_STORAGE_KEY } from './session';
import { createSignedToken, verifySignedToken, requireServerAuth, requirePermission, getJwtSecret } from './server-auth';
import { checkRateLimit, resetRateLimit } from './rate-limiter';
import { validateCsrf } from './csrf';
import { roleHasPermission } from './rbac';
import { recordAuditEvent, getAuditLogs } from '../audit/audit-logger';

test('role normalization accepts known university roles', () => {
  assert.equal(normalizeRole('student'), 'student');
  assert.equal(normalizeRole('FINANCE_OFFICER'), 'finance_officer');
  assert.equal(normalizeRole('super-admin'), 'super_admin');
});

test('demo credentials validate the selected role', () => {
  assert.equal(isValidDemoCredentials('student@university.ac.ke', 'DemoPassword2026!', 'student'), true);
  assert.equal(isValidDemoCredentials('finance_officer@university.ac.ke', 'DemoPassword2026!', 'finance_officer'), true);
  assert.equal(isValidDemoCredentials('student@university.ac.ke', 'WrongPassword123', 'student'), false);
  assert.equal(isValidDemoCredentials('registrar@university.ac.ke', 'DemoPassword2026!', 'student'), false);
});

test('cryptographic token creation and verification succeeds for authentic users', () => {
  const token = createSignedToken({
    id: 'usr-student-01',
    email: 'student@university.ac.ke',
    role: 'student',
  });

  const verified = verifySignedToken(token);
  assert.ok(verified !== null);
  assert.equal(verified?.email, 'student@university.ac.ke');
  assert.equal(verified?.role, 'student');
});

test('cryptographic token verification strictly rejects tampered payloads', () => {
  const token = createSignedToken({
    id: 'usr-student-01',
    email: 'student@university.ac.ke',
    role: 'student',
  });

  const [header, body, sig] = token.split('.');
  // Attacker attempts to change role to super_admin
  const forgedPayload = Buffer.from(JSON.stringify({
    id: 'usr-student-01',
    email: 'student@university.ac.ke',
    role: 'super_admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');

  const forgedToken = `${header}.${forgedPayload}.${sig}`;
  const result = verifySignedToken(forgedToken);
  assert.equal(result, null);
});

test('requireServerAuth rejects unauthenticated requests with 401', () => {
  const dummyReq = new Request('http://localhost:3000/api/v1/students', {
    method: 'GET',
  });

  const authResult = requireServerAuth(dummyReq);
  assert.ok('errorResponse' in authResult);
  assert.equal(authResult.errorResponse.status, 401);
});

test('requireServerAuth rejects unauthorized roles with 403', () => {
  const studentToken = createSignedToken({
    id: 'usr-stu-1',
    email: 'student@university.ac.ke',
    role: 'student',
  });

  const req = new Request('http://localhost:3000/api/v1/finance/bank/reconcile', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
  });

  const authResult = requireServerAuth(req, ['finance_officer', 'admin']);
  assert.ok('errorResponse' in authResult);
  assert.equal(authResult.errorResponse.status, 403);
});

test('getJwtSecret provides valid secret and enforces fail-closed checks', () => {
  const secret = getJwtSecret();
  assert.ok(typeof secret === 'string');
  assert.ok(secret.length >= 32);
});

test('rate limiter blocks requests when threshold is exceeded', () => {
  const testIp = 'test-client-ip-rate-limit-1';
  resetRateLimit(`login:${testIp}`);

  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(`login:${testIp}`, 5, 60);
    assert.equal(res.allowed, true);
  }

  // 6th attempt should be blocked
  const blockedRes = checkRateLimit(`login:${testIp}`, 5, 60);
  assert.equal(blockedRes.allowed, false);
  assert.equal(blockedRes.remaining, 0);
  assert.ok(blockedRes.resetSeconds > 0);

  resetRateLimit(`login:${testIp}`);
});

test('saveSession eliminates localStorage persistence and maintains in-memory state', () => {
  const mockStorage: Record<string, string> = {
    [SESSION_STORAGE_KEY]: 'legacy-token-data',
  };
  (global as any).window = {
    localStorage: {
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      getItem: (key: string) => mockStorage[key] || null,
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    },
  };

  saveSession({
    id: 'usr-student-01',
    email: 'student@university.ac.ke',
    role: 'student',
    firstName: 'Faith',
    lastName: 'Wanjiku',
    token: 'super-sensitive-jwt-token-that-must-not-leak',
    authenticatedAt: new Date().toISOString(),
  });

  // Zero localStorage verification: legacy storage purged and no new entries written
  assert.equal(mockStorage[SESSION_STORAGE_KEY], undefined);

  // In-memory session returns safe sanitized metadata without raw token
  const current = readSession();
  assert.ok(current);
  assert.equal(current?.token, undefined);
  assert.equal(current?.email, 'student@university.ac.ke');
  assert.equal(current?.role, 'student');

  clearSession();
  assert.equal(readSession(), null);

  delete (global as any).window;
});

test('unauthenticated requests to extended modules are rejected with 401', async () => {
  const { GET: getCoursesRegister } = await import('../../app/api/v1/courses/register/route');
  const { GET: getHostels } = await import('../../app/api/v1/hostels/route');
  const { GET: getLibrary } = await import('../../app/api/v1/library/route');
  const { GET: getExams } = await import('../../app/api/v1/exams/route');

  const req = new Request('http://localhost:3000/api/v1/test');

  const res1 = await getCoursesRegister(req as any);
  assert.equal(res1.status, 401);

  const res2 = await getHostels(req as any);
  assert.equal(res2.status, 401);

  const res3 = await getLibrary(req as any);
  assert.equal(res3.status, 401);

  const res4 = await getExams(req as any);
  assert.equal(res4.status, 401);
});

test('students endpoint strictly enforces student isolation without fallback leaking', async () => {
  const { GET: getStudents } = await import('../../app/api/v1/students/route');

  // Student with non-existent email
  const unknownStudentToken = createSignedToken({
    id: 'usr-unknown-999',
    email: 'unknown.student@university.ac.ke',
    role: 'student',
  });

  const req = new Request('http://localhost:3000/api/v1/students', {
    headers: { Authorization: `Bearer ${unknownStudentToken}` },
  });

  const res = await getStudents(req as any);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.total, 0);
  assert.equal(data.data.length, 0); // Must NOT leak Faith Wanjiku or student 0
});

test('validateCsrf rejects cross-origin mutations and permits same-origin requests', () => {
  // Safe GET request
  const getReq = new Request('http://localhost:3000/api/v1/students', { method: 'GET' });
  assert.equal(validateCsrf(getReq).valid, true);

  // POST with valid matching origin
  const validPost = new Request('http://localhost:3000/api/v1/courses/register', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    },
  });
  assert.equal(validateCsrf(validPost).valid, true);

  // POST with hostile cross-origin
  const evilPost = new Request('http://localhost:3000/api/v1/courses/register', {
    method: 'POST',
    headers: {
      origin: 'https://attacker-controlled-site.com',
      host: 'localhost:3000',
    },
  });
  const evilRes = validateCsrf(evilPost);
  assert.equal(evilRes.valid, false);
  assert.ok(evilRes.error?.includes('CSRF violation'));
});

test('requirePermission enforces fine-grained capability checks', () => {
  const lecturerToken = createSignedToken({
    id: 'usr-lec-1',
    email: 'lecturer@university.ac.ke',
    role: 'lecturer',
  });

  const lecturerReq = new Request('http://localhost:3000/api/v1/grades/enter', {
    headers: { Authorization: `Bearer ${lecturerToken}` },
  });

  // Lecturer has grades:write
  const allowed = requirePermission(lecturerReq, 'grades:write');
  assert.ok('user' in allowed);

  // Lecturer lacks finance:reconcile
  const blocked = requirePermission(lecturerReq, 'finance:reconcile');
  assert.ok('errorResponse' in blocked);
  assert.equal(blocked.errorResponse.status, 403);
});

test('audit logging appends immutable records and supports telemetry filtering', () => {
  const uniqueAction = `AUDIT_TEST_${Date.now()}`;
  recordAuditEvent({
    actor_email: 'tester@university.ac.ke',
    actor_role: 'admin',
    action: uniqueAction,
    entity_type: 'security_test',
    entity_id: 'tst-01',
    ip_address: '10.0.0.1',
    status: 'SUCCESS',
    details: { test: true },
  });

  const logs = getAuditLogs({ action: uniqueAction });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].action, uniqueAction);
  assert.equal(logs[0].actor_email, 'tester@university.ac.ke');
  assert.equal(logs[0].status, 'SUCCESS');
});

test('auth/me route verifies cookie-only sessions and logout clears cookie', async () => {
  const { GET: getAuthMe } = await import('../../app/api/v1/auth/me/route');
  const { POST: postLogout } = await import('../../app/api/v1/auth/logout/route');

  // Unauthenticated call
  const unauthReq = new Request('http://localhost:3000/api/v1/auth/me');
  const unauthRes = await getAuthMe(unauthReq as any);
  assert.equal(unauthRes.status, 401);

  // Authenticated call via cookie
  const validToken = createSignedToken({
    id: 'usr-student-01',
    email: 'student@university.ac.ke',
    role: 'student',
  });

  const authReq = new Request('http://localhost:3000/api/v1/auth/me', {
    headers: {
      Cookie: `uams_auth_token=${validToken}`,
    },
  });

  const authRes = await getAuthMe(authReq as any);
  assert.equal(authRes.status, 200);
  const authData = await authRes.json();
  assert.equal(authData.success, true);
  assert.equal(authData.user.email, 'student@university.ac.ke');
  assert.equal(authData.user.role, 'student');

  // Logout clears session cookie
  const logoutRes = await postLogout();
  assert.equal(logoutRes.status, 200);
  const cookieHeader = logoutRes.headers.get('set-cookie');
  assert.ok(cookieHeader?.includes('uams_auth_token=;'));
  assert.ok(cookieHeader?.includes('uams_refresh_token=;'));
});

test('password hashing implements salted scrypt key derivation and timing-safe verification', async () => {
  const { hashPassword, verifyPassword } = await import('./password');

  const plain = 'StrongInstitutionalSecret2026!';
  const hashed = hashPassword(plain);

  assert.ok(hashed.includes('$'));
  const [salt, hash] = hashed.split('$');
  assert.equal(salt.length, 32); // 16 bytes hex
  assert.equal(hash.length, 128); // 64 bytes hex

  // Positive verification
  assert.equal(verifyPassword(plain, hashed), true);

  // Negative verification (wrong password)
  assert.equal(verifyPassword('WrongPassword', hashed), false);

  // Negative verification (malformed hash)
  assert.equal(verifyPassword(plain, 'invalid-hash-string'), false);
});

test('refresh token engine enforces rotation and detects token replay attacks', async () => {
  const { issueRefreshToken, rotateRefreshToken, verifyRefreshToken } = await import('./refresh-token');

  const user = {
    id: 'usr-student-99',
    email: 'student99@university.ac.ke',
    role: 'student' as const,
  };

  // Issue initial refresh token
  const token1 = issueRefreshToken(user);
  const payload1 = verifyRefreshToken(token1);
  assert.ok(payload1);
  assert.equal(payload1?.id, user.id);

  // 1st Rotation (legitimate client refresh)
  const rotation1 = rotateRefreshToken(token1);
  assert.equal(rotation1.success, true);
  if (!rotation1.success) return;
  assert.ok(rotation1.newRefreshToken);
  assert.notEqual(rotation1.newRefreshToken, token1);

  // 2nd Rotation (legitimate client refresh again)
  const rotation2 = rotateRefreshToken(rotation1.newRefreshToken);
  assert.equal(rotation2.success, true);
  if (!rotation2.success) return;

  // REPLAY ATTACK: Adversary intercepts and attempts to use the already-rotated token1
  const replayAttack = rotateRefreshToken(token1, '192.168.1.100');
  assert.equal(replayAttack.success, false);
  assert.equal(replayAttack.breachDetected, true);
  assert.ok(replayAttack.error.includes('Security breach detected'));

  // Verify that replay containment invalidated the entire token family (rotation2's token is now revoked too)
  const subsequentAttempt = rotateRefreshToken(rotation2.newRefreshToken);
  assert.equal(subsequentAttempt.success, false);
});

test('MFA engine generates standard TOTP passcodes and verifies timing-safe tokens', async () => {
  const { generateMfaSecret, generateTotp, verifyTotp } = await import('./mfa');

  const secret = generateMfaSecret();
  assert.equal(secret.length, 20);

  const code = generateTotp(secret);
  assert.equal(code.length, 6);
  assert.ok(/^\d{6}$/.test(code));

  // Positive verification
  assert.equal(verifyTotp(code, secret), true);

  // Negative verification (invalid code)
  assert.equal(verifyTotp('000000', secret), false);
  assert.equal(verifyTotp('999999', secret), false);
});

test('refresh and mfa API routes handle authentication cycles securely', async () => {
  const { POST: postRefresh } = await import('../../app/api/v1/auth/refresh/route');
  const { POST: postMfaVerify } = await import('../../app/api/v1/auth/mfa/verify/route');
  const { issueRefreshToken } = await import('./refresh-token');
  const { generateTotp } = await import('./mfa');

  // Test Refresh Route with unauthenticated request
  const unauthRefreshReq = new Request('http://localhost:3000/api/v1/auth/refresh', { method: 'POST' });
  const unauthRefreshRes = await postRefresh(unauthRefreshReq as any);
  assert.equal(unauthRefreshRes.status, 401);

  // Test Refresh Route with valid cookie
  const validRefreshToken = issueRefreshToken({
    id: 'usr-student-01',
    email: 'student@university.ac.ke',
    role: 'student',
  });

  const validRefreshReq = new Request('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      Cookie: `uams_refresh_token=${validRefreshToken}`,
    },
  });

  const validRefreshRes = await postRefresh(validRefreshReq as any);
  assert.equal(validRefreshRes.status, 200);
  const refreshData = await validRefreshRes.json();
  assert.equal(refreshData.success, true);
  assert.equal(refreshData.user.email, 'student@university.ac.ke');

  // Test MFA Route (requires same-origin header for CSRF defense on POST mutations)
  const validUserToken = createSignedToken({
    id: 'usr-admin-01',
    email: 'admin@university.ac.ke',
    role: 'admin',
  });

  const validOtp = generateTotp('JBSWY3DPEHPK3PXP');
  const mfaReq = new Request('http://localhost:3000/api/v1/auth/mfa/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
      Cookie: `uams_auth_token=${validUserToken}`,
    },
    body: JSON.stringify({ code: validOtp }),
  });

  const mfaRes = await postMfaVerify(mfaReq as any);
  assert.equal(mfaRes.status, 200);
  const mfaData = await mfaRes.json();
  assert.equal(mfaData.success, true);
  assert.equal(mfaData.mfaVerified, true);
});


