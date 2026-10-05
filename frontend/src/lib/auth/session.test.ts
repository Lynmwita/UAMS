import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidDemoCredentials, normalizeRole } from './session';

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
