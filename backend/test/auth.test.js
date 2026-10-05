const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRole, isValidDemoCredential } = require('../src/auth');

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
