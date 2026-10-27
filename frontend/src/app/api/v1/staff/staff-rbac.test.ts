import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as createStaff, PATCH as updateStaff } from './route';
import { createSignedToken } from '@/lib/auth/server-auth';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, method: string, body?: unknown) {
  const token = createSignedToken({
    id: `usr-test-${role}-${Date.now()}`,
    email: `${role}@university.ac.ke`,
    role,
  });
  return new Request('http://localhost:3000/api/v1/staff', {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3000',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

test('staff registration: registrar can register normal staff (lecturer, librarian, cleaner, etc.)', async () => {
  const res = await createStaff(
    makeRequest('registrar', 'POST', {
      first_name: 'John',
      last_name: 'Librarian',
      email: `test.librarian.${Date.now()}@university.ac.ke`,
      role: 'library',
      job_title: 'Head Librarian',
    })
  );
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.role, 'library');
});

test('staff registration: registrar CANNOT register admin or super_admin roles', async () => {
  const resAdmin = await createStaff(
    makeRequest('registrar', 'POST', {
      first_name: 'Malicious',
      last_name: 'Admin',
      email: `malicious.admin.${Date.now()}@university.ac.ke`,
      role: 'admin',
    })
  );
  assert.equal(resAdmin.status, 403);
  const dataAdmin = await resAdmin.json();
  assert.match(dataAdmin.error, /Registrars cannot register or assign administrative roles/i);

  const resSuperAdmin = await createStaff(
    makeRequest('registrar', 'POST', {
      first_name: 'Malicious',
      last_name: 'SuperAdmin',
      email: `malicious.superadmin.${Date.now()}@university.ac.ke`,
      role: 'super_admin',
    })
  );
  assert.equal(resSuperAdmin.status, 403);
  const dataSuperAdmin = await resSuperAdmin.json();
  assert.match(dataSuperAdmin.error, /Registrars cannot register or assign administrative roles/i);
});

test('staff registration: unauthorized roles (student, lecturer) are rejected with 403', async () => {
  const resStudent = await createStaff(
    makeRequest('student', 'POST', {
      first_name: 'Sneaky',
      last_name: 'Student',
      email: `sneaky.student.${Date.now()}@university.ac.ke`,
      role: 'lecturer',
    })
  );
  assert.equal(resStudent.status, 403);

  const resLecturer = await createStaff(
    makeRequest('lecturer', 'POST', {
      first_name: 'Sneaky',
      last_name: 'Lecturer',
      email: `sneaky.lecturer.${Date.now()}@university.ac.ke`,
      role: 'lecturer',
    })
  );
  assert.equal(resLecturer.status, 403);
});

test('staff registration: admin CAN register administrative and regular roles', async () => {
  const res = await createStaff(
    makeRequest('admin', 'POST', {
      first_name: 'Legit',
      last_name: 'Admin',
      email: `legit.admin.${Date.now()}@university.ac.ke`,
      role: 'admin',
    })
  );
  assert.equal(res.status, 201);
});
