import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { PATCH } from '../register/route';
import { registrationsStore } from '@/lib/academic/registrations';
import { createSignedToken } from '@/lib/auth/server-auth';
import { getAuditLogs } from '@/lib/audit/audit-logger';
import type { UserRole } from '@/types';

const original = structuredClone(registrationsStore);
beforeEach(() => {
  registrationsStore.splice(0, registrationsStore.length, ...['BCS 311', 'BCS 316', 'BIT 312'].map((code, index) => ({
    id: `approval-test-${index}`, student_id: `stu-${index}`, admission_number: `BCS/2026/${index}`,
    student_name: 'Test Student', course_code: code, course_title: code,
    status: 'pending' as const, registered_at: new Date().toISOString(),
  })));
});
afterEach(() => registrationsStore.splice(0, registrationsStore.length, ...structuredClone(original)));

function request(role: UserRole, body: unknown, method = 'POST') {
  const token = createSignedToken({ id: `usr-demo-${role}`, email: `${role}@university.ac.ke`, role });
  return new NextRequest('http://localhost:3000/api/v1/courses/approve', {
    method, headers: { Authorization: `Bearer ${token}`, Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('bulk approval rejects malformed selectors without changing registrations', async () => {
  for (const body of [null, [], {}, { registration_ids: [] }, { registration_ids: [12] },
    { registration_ids: [' '] }, { course_code: 12 }, { course_code: ' ' },
    { registration_ids: ['approval-test-0'], course_code: false }]) {
    assert.equal((await POST(request('registrar', body))).status, 400, JSON.stringify(body));
    assert.ok(registrationsStore.every(r => r.status === 'pending'));
  }
  const malformed = request('registrar', {});
  const invalidJson = new NextRequest(malformed.url, { method: 'POST', headers: malformed.headers, body: '{' });
  assert.equal((await POST(invalidJson)).status, 400);
});

test('bulk approval requires authentication and a reviewer role', async () => {
  const unauthenticated = new NextRequest('http://localhost:3000/api/v1/courses/approve', { method: 'POST', body: '{}' });
  assert.equal((await POST(unauthenticated)).status, 401);
  for (const role of ['student', 'lecturer', 'finance_officer'] as UserRole[]) {
    assert.equal((await POST(request(role, { course_code: 'BCS 311' }))).status, 403);
  }
});

test('registrar approves only selected pending records and records an audit event', async () => {
  const res = await POST(request('registrar', { registration_ids: ['approval-test-0', 'approval-test-1', 'approval-test-0'] }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.approved_count, 2);
  assert.deepEqual(registrationsStore.map(r => r.status), ['approved', 'approved', 'pending']);
  assert.equal(registrationsStore[0].approved_by, 'registrar@university.ac.ke');
  assert.ok(registrationsStore[0].approved_at);
  assert.equal(getAuditLogs({ action: 'REGISTRATION_BULK_APPROVED', limit: 1 })[0].details?.approved_count, 2);
  assert.equal((await POST(request('registrar', { registration_ids: ['approval-test-0'] }))).status, 404);
});

test('HOD approval stays within course scope and mixed selections cannot partly mutate', async () => {
  assert.equal((await POST(request('hod', { registration_ids: ['approval-test-0', 'approval-test-2'] }))).status, 403);
  assert.ok(registrationsStore.every(r => r.status === 'pending'));
  assert.equal((await POST(request('hod', { course_code: 'BIT 312' }))).status, 403);
  const res = await POST(request('hod', { course_code: 'BCS 311' }));
  assert.equal(res.status, 200);
  assert.deepEqual(registrationsStore.map(r => r.status), ['approved', 'pending', 'pending']);
});

test('unknown IDs cannot cause a partial bulk approval', async () => {
  assert.equal((await POST(request('registrar', { registration_ids: ['approval-test-0', 'missing'] }))).status, 404);
  assert.ok(registrationsStore.every(r => r.status === 'pending'));
});

test('individual approval uses the same HOD scope and audit checks', async () => {
  assert.equal((await PATCH(request('hod', { registration_id: 'approval-test-2' }, 'PATCH'))).status, 403);
  assert.equal((await PATCH(request('hod', { registration_id: 'approval-test-0' }, 'PATCH'))).status, 200);
  assert.ok(registrationsStore[0].approved_at);
  assert.equal(getAuditLogs({ action: 'REGISTRATION_APPROVED', limit: 1 })[0].entity_id, 'approval-test-0');
  assert.equal((await PATCH(request('registrar', { registration_id: '' }, 'PATCH'))).status, 400);
});
