import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as raiseFlag, GET as listFlags } from './route';
import { createSignedToken } from '@/lib/auth/server-auth';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, method: string, body?: unknown, url = 'http://localhost:3000/api/v1/audit/flags') {
  const token = createSignedToken({
    id: `usr-test-${role}-${Date.now()}`,
    email: `${role}@university.ac.ke`,
    role,
  });
  return new Request(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

test('flags POST: audit_officer can raise a flag on a grade', async () => {
  const res = await raiseFlag(
    makeRequest('audit_officer', 'POST', {
      entity_type: 'grade',
      entity_id: 'grd-test-1',
      student_name: 'Test Student',
      admission_number: 'BIT/2023/0001',
      course_code: 'BCS 311',
      reason: 'Test flag from unit test',
    })
  );
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.action, 'AUDIT_FLAG_RAISED');
  assert.equal(data.data.actor_role, 'audit_officer');
});

test('flags POST: audit_officer can raise a flag on a clearance', async () => {
  const res = await raiseFlag(
    makeRequest('audit_officer', 'POST', {
      entity_type: 'clearance',
      entity_id: 'clr-test-1',
      student_name: 'Test Student',
      admission_number: 'BIT/2023/0001',
      reason: 'Ghost clearance suspected',
    })
  );
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.entity_type, 'exam_clearance');
});

test('flags POST: lecturer cannot raise flags (403)', async () => {
  const res = await raiseFlag(
    makeRequest('lecturer', 'POST', {
      entity_type: 'grade',
      entity_id: 'grd-test-2',
      student_name: 'Test Student',
      admission_number: 'BIT/2023/0002',
    })
  );
  // Lecturer lacks audit:read, so they fail at the permission gate
  assert.ok(res.status === 401 || res.status === 403);
});

test('flags POST: rejects missing required fields (400)', async () => {
  const res = await raiseFlag(
    makeRequest('audit_officer', 'POST', {
      entity_type: 'grade',
      // entity_id missing
      student_name: 'Test Student',
    })
  );
  assert.equal(res.status, 400);
});

test('flags POST: rejects invalid entity_type (400)', async () => {
  const res = await raiseFlag(
    makeRequest('audit_officer', 'POST', {
      entity_type: 'invoice',
      entity_id: 'inv-1',
      student_name: 'Test Student',
    })
  );
  assert.equal(res.status, 400);
});

test('flags GET: returns raised flags', async () => {
  const res = await listFlags(makeRequest('audit_officer', 'GET'));
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
  // The flags raised in earlier tests should appear
  const testFlag = data.data.find((f: any) => f.entity_id === 'grd-test-1');
  assert.ok(testFlag, 'Previously raised flag should be listed');
  assert.equal(testFlag.action, 'AUDIT_FLAG_RAISED');
});
