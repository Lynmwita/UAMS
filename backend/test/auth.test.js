const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRole, isValidDemoCredential, buildDemoToken, verifyDemoToken, requireRole } = require('../src/auth');

test('normalizeRole supports source-role strings from the frontend', () => {
  assert.equal(normalizeRole('student'), 'student');
  assert.equal(normalizeRole('FINANCE_OFFICER'), 'finance_officer');
  assert.equal(normalizeRole('super-admin'), 'super_admin');
});

test('demo credentials only pass for the correct role and password', () => {
  assert.equal(isValidDemoCredential('student@university.ac.ke', 'DemoPassword2026!', 'student'), true);
  assert.equal(isValidDemoCredential('finance_officer@university.ac.ke', 'DemoPassword2026!', 'finance_officer'), true);
  assert.equal(isValidDemoCredential('student@university.ac.ke', 'WrongPassword', 'student'), false);
  assert.equal(isValidDemoCredential('registrar@university.ac.ke', 'DemoPassword2026!', 'student'), false);
});

test('demo login tokens can be encoded and decoded for a role', () => {
  const token = buildDemoToken('finance_officer');
  const verified = verifyDemoToken(token);

  assert.ok(token.startsWith('uams_demo_'));
  assert.equal(verified.role, 'finance_officer');
  assert.equal(verified.email, 'finance_officer@university.ac.ke');
});

test('requireRole rejects a user whose role is not allowed', () => {
  const token = buildDemoToken('student');
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };

  const next = () => { throw new Error('next should not run'); };

  requireRole(['finance_officer'])(req, res, next);
  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.success, false);
});
