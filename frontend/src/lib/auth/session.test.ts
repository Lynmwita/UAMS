import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidDemoCredentials, normalizeRole } from './session';
import { createSignedToken, verifySignedToken, requireServerAuth } from './server-auth';

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

