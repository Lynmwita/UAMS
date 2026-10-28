import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as createStaff, PATCH as updateStaff } from './route';
import { POST as deleteStaff } from './delete/route';
import { POST as unlinkStaff } from './unlink/route';
import { POST as managePassword } from './password/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import {
  staffStore,
  isTeachingRole,
  countStaffByDepartment,
  stripPersonTitle,
  findStaffByDisplayName,
} from '@/lib/hr/staff';
import { admissionsStore } from '@/lib/academic/admissions';
import type { UserRole } from '@/types';

// Demo-path actor: id starts with 'usr-' (in-memory store).
// Institutional-path actor: id does NOT start with 'usr-' (database branch).
function makeRequest(
  role: UserRole,
  method: string,
  body: unknown,
  url: string,
  demo = true
) {
  const token = createSignedToken({
    id: demo ? `usr-test-${role}-${Date.now()}` : `inst-test-${role}-${Date.now()}`,
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

const DELETE_URL = 'http://localhost:3000/api/v1/staff/delete';
const UNLINK_URL = 'http://localhost:3000/api/v1/staff/unlink';
const PASSWORD_URL = 'http://localhost:3000/api/v1/staff/password';
const STAFF_URL = 'http://localhost:3000/api/v1/staff';

test('gating (demo path): registrar and admin are refused delete, unlink and password', async () => {
  for (const role of ['registrar', 'admin'] as UserRole[]) {
    const del = await deleteStaff(makeRequest(role, 'POST', { staff_id: 'staff-1' }, DELETE_URL));
    assert.equal(del.status, 403, `${role} delete`);
    const unl = await unlinkStaff(makeRequest(role, 'POST', { email: 'jane.mwangi@university.ac.ke' }, UNLINK_URL));
    assert.equal(unl.status, 403, `${role} unlink`);
    const pwd = await managePassword(
      makeRequest(role, 'POST', { email: 'jane.mwangi@university.ac.ke', action: 'set', password: 'StrongPassword2026!' }, PASSWORD_URL)
    );
    assert.equal(pwd.status, 403, `${role} password`);
  }
});

test('gating (institutional path): registrar and admin are refused before any database work', async () => {
  for (const role of ['registrar', 'admin'] as UserRole[]) {
    const del = await deleteStaff(makeRequest(role, 'POST', { staff_id: 'staff-1' }, DELETE_URL, false));
    assert.equal(del.status, 403, `${role} institutional delete`);
    const unl = await unlinkStaff(makeRequest(role, 'POST', { email: 'jane.mwangi@university.ac.ke' }, UNLINK_URL, false));
    assert.equal(unl.status, 403, `${role} institutional unlink`);
    const pwd = await managePassword(
      makeRequest(role, 'POST', { email: 'jane.mwangi@university.ac.ke', action: 'set', password: 'StrongPassword2026!' }, PASSWORD_URL, false)
    );
    assert.equal(pwd.status, 403, `${role} institutional password`);
  }
});

test('gating (institutional path): super_admin passes the gate (fails later only on the missing database)', async () => {
  const del = await deleteStaff(makeRequest('super_admin', 'POST', { staff_id: 'staff-1' }, DELETE_URL, false));
  assert.equal(del.status, 503);
  const unl = await unlinkStaff(makeRequest('super_admin', 'POST', { email: 'jane.mwangi@university.ac.ke' }, UNLINK_URL, false));
  assert.equal(unl.status, 503);
  const pwd = await managePassword(
    makeRequest('super_admin', 'POST', { email: 'jane.mwangi@university.ac.ke', action: 'reset_link' }, PASSWORD_URL, false)
  );
  assert.equal(pwd.status, 503);
});

test('gating (demo path): registrar cannot deactivate/reactivate but can still edit details', async () => {
  const email = `gating.${Date.now()}@university.ac.ke`;
  const created = await createStaff(
    makeRequest('admin', 'POST', { first_name: 'Gate', last_name: 'Test', email, role: 'lecturer' }, STAFF_URL)
  );
  assert.equal(created.status, 201);
  const staffId = (await created.json()).data.id;

  const deactivated = await updateStaff(
    makeRequest('registrar', 'PATCH', { staff_id: staffId, is_active: false }, STAFF_URL)
  );
  assert.equal(deactivated.status, 403);
  const deactivatedData = await deactivated.json();
  assert.match(deactivatedData.error, /cannot deactivate or reactivate/i);

  const edited = await updateStaff(
    makeRequest('registrar', 'PATCH', { staff_id: staffId, job_title: 'Edited Title' }, STAFF_URL)
  );
  assert.equal(edited.status, 200);
  assert.equal((await edited.json()).data.job_title, 'Edited Title');

  const adminToggle = await updateStaff(
    makeRequest('admin', 'PATCH', { staff_id: staffId, is_active: false }, STAFF_URL)
  );
  assert.equal(adminToggle.status, 200);
  assert.equal((await adminToggle.json()).data.is_active, false);
});

test('gating (institutional path): registrar cannot deactivate/reactivate', async () => {
  const res = await updateStaff(
    makeRequest('registrar', 'PATCH', { staff_id: 'staff-1', is_active: false }, STAFF_URL, false)
  );
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /cannot deactivate or reactivate/i);
});

test('staff page rules: only teaching roles are allocation targets', () => {
  assert.equal(isTeachingRole('lecturer'), true);
  assert.equal(isTeachingRole('tutorial_fellow'), true);
  assert.equal(isTeachingRole('hod'), true);
  assert.equal(isTeachingRole('dean'), true);
  assert.equal(isTeachingRole('registrar'), false);
  assert.equal(isTeachingRole('cleaner'), false);
  assert.equal(isTeachingRole('finance_officer'), false);
  assert.equal(isTeachingRole('librarian'), false);
});

test('department counts: linked to staff records, never invented', () => {
  const counts = countStaffByDepartment(staffStore);
  assert.equal(counts['dep-cs'], 2); // Jane Mwangi (lecturer) + Grace Kimani (hod)
  assert.equal(counts['dep-library'], 1); // demo librarian
  assert.equal(counts['dep-econ'], 1); // Dennis Mutua
  assert.equal(counts['dep-bit'] || 0, 0);
});

test('name linking: titled display names match staff records, others do not', () => {
  assert.equal(stripPersonTitle('Dr. Grace Kimani'), 'Grace Kimani');
  assert.equal(stripPersonTitle('Eng. Ruth Chebet'), 'Ruth Chebet');
  assert.notEqual(findStaffByDisplayName('Dr. Grace Kimani', staffStore), null);
  assert.notEqual(findStaffByDisplayName('Dr. Jane Mwangi', staffStore), null);
  assert.equal(findStaffByDisplayName('Dr. Peter Mwangi', staffStore), null);
  assert.equal(findStaffByDisplayName('Prof. David Kamau', staffStore), null);
  assert.equal(findStaffByDisplayName('Eng. Eric Ochieng', staffStore), null);
});

test('librarian identity: one account across button, header and staff record', () => {
  const record = staffStore.find((s) => s.email === 'librarian@university.ac.ke');
  assert.notEqual(record, undefined);
  assert.equal(record!.is_active, true);
  assert.equal(record!.role, 'librarian');
  assert.equal(record!.department_id, 'dep-library');
});

test('demo contacts: no personal Gmail addresses in staff or applicant seeds', () => {
  for (const s of staffStore) assert.doesNotMatch(s.email, /@gmail\.com$/i);
  for (const a of admissionsStore) assert.doesNotMatch(a.applicant_email || '', /@gmail\.com$/i);
});
