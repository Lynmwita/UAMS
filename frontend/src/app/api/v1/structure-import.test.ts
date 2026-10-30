import test from 'node:test';
import assert from 'node:assert/strict';
import { PATCH as patchSchool } from './schools/route';
import { PATCH as patchDept } from './departments/route';
import { PATCH as patchProg } from './programs/route';
import { POST as bulkImport, GET as exportCsv } from './structure/import/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, method: string, body?: unknown, url = 'http://localhost:3000/api/v1/x') {
  const token = createSignedToken({
    id: `usr-test-${role}-${Date.now()}`,
    email: `${role}@university.ac.ke`,
    role,
  });
  return new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

test('structure PATCH: admin can rename a school and reassign dean', async () => {
  const res = await patchSchool(
    makeRequest('admin', 'PATCH', { id: 'sch-ict', dean: 'Prof. Test Dean', dean_email: 'test.dean@university.ac.ke' })
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.dean, 'Prof. Test Dean');
  // restore
  await patchSchool(makeRequest('admin', 'PATCH', { id: 'sch-ict', dean: 'Prof. Alice Njuguna' }));
});

test('structure PATCH: registrar cannot edit schools (admin-tier only)', async () => {
  const res = await patchSchool(
    makeRequest('registrar', 'PATCH', { id: 'sch-ict', dean: 'Hacker' })
  );
  assert.equal(res.status, 403);
});

test('structure PATCH: admin can suspend a department', async () => {
  const res = await patchDept(
    makeRequest('admin', 'PATCH', { id: 'dep-cs', is_active: false })
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.is_active, false);
  // restore
  await patchDept(makeRequest('admin', 'PATCH', { id: 'dep-cs', is_active: true }));
});

test('structure PATCH: admin can set CUE accreditation fields on a program', async () => {
  const res = await patchProg(
    makeRequest('admin', 'PATCH', {
      id: 'prog-bcs',
      accreditation_status: 'accredited',
      regulatory_body: 'CUE',
      last_review_date: '2024-06-01',
      next_inspection_date: '2029-06-01',
      max_capacity: 120,
    })
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.accreditation_status, 'accredited');
  assert.equal(body.data.max_capacity, 120);
  // restore to unknown
  await patchProg(makeRequest('admin', 'PATCH', { id: 'prog-bcs', accreditation_status: 'unknown', max_capacity: 0 }));
});

test('structure PATCH: invalid accreditation_status is rejected', async () => {
  const res = await patchProg(
    makeRequest('admin', 'PATCH', { id: 'prog-bcs', accreditation_status: 'super-accredited' })
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  // invalid value ignored, stays unknown
  assert.equal(body.data.accreditation_status, 'unknown');
});

test('structure PATCH: nonexistent id returns 404', async () => {
  const res = await patchSchool(makeRequest('admin', 'PATCH', { id: 'sch-nope', name: 'X' }));
  assert.equal(res.status, 404);
});

test('structure bulk import: creates schools/departments/programs, skips duplicates', async () => {
  const res = await bulkImport(
    makeRequest('admin', 'POST', {
      schools: [{ code: 'TEST-SCH', name: 'Test School', dean: 'Dr. Test' }],
      departments: [{ code: 'TEST-DEP', name: 'Test Department', school_code: 'TEST-SCH', hod: 'Dr. HOD' }],
      programs: [{ code: 'TEST-PROG', name: 'Test Program', department_code: 'TEST-DEP' }],
    })
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.schools.created, 1);
  assert.equal(body.data.departments.created, 1);
  assert.equal(body.data.programs.created, 1);

  // Re-import: all skipped as duplicates
  const res2 = await bulkImport(
    makeRequest('admin', 'POST', {
      schools: [{ code: 'TEST-SCH', name: 'Test School' }],
      departments: [{ code: 'TEST-DEP', name: 'Test Department' }],
      programs: [{ code: 'TEST-PROG', name: 'Test Program', department_code: 'TEST-DEP' }],
    })
  );
  const body2 = await res2.json();
  assert.equal(body2.data.schools.skipped, 1);
  assert.equal(body2.data.departments.skipped, 1);
  assert.equal(body2.data.programs.skipped, 1);
});

test('structure bulk import: program with unknown department_code errors', async () => {
  const res = await bulkImport(
    makeRequest('admin', 'POST', {
      schools: [],
      departments: [],
      programs: [{ code: 'TEST-PROG2', name: 'Orphan Program', department_code: 'NOPE' }],
    })
  );
  const body = await res.json();
  assert.equal(body.data.programs.errors.length, 1);
  assert.match(body.data.programs.errors[0], /not found/);
});

test('structure export: returns CSV with all three sections', async () => {
  const res = await exportCsv(makeRequest('admin', 'GET'));
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /\[schools\]/);
  assert.match(text, /\[departments\]/);
  assert.match(text, /\[programs\]/);
  assert.match(text, /TEST-SCH/);
});
