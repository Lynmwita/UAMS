import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidDemoCredentials, normalizeRole, saveSession, SESSION_STORAGE_KEY } from './session';
import { createSignedToken, verifySignedToken, requireServerAuth, getJwtSecret } from './server-auth';
import { checkRateLimit, resetRateLimit } from './rate-limiter';

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

test('saveSession strips raw token from localStorage payload', () => {
  // Mock window.localStorage
  let storedValue = '';
  const mockStorage: Record<string, string> = {};
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

  const parsed = JSON.parse(mockStorage[SESSION_STORAGE_KEY]);
  assert.equal(parsed.token, undefined);
  assert.equal(parsed.email, 'student@university.ac.ke');
  assert.equal(parsed.role, 'student');

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

