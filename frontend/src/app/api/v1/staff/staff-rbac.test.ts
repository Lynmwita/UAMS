import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as createStaff, PATCH as updateStaff } from './route';
import { POST as inviteStaff } from './invite/route';
import { POST as managePassword } from './password/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { canAccessPage } from '@/lib/auth/roles';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, method: string, body?: unknown, url = 'http://localhost:3000/api/v1/staff') {
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
  assert.match(dataAdmin.error, /Registrars may not register administrator accounts|Registrars cannot register/i);

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
  assert.match(dataSuperAdmin.error, /Registrars may not register administrator accounts|Registrars cannot register/i);
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

test('staff invitation: unauthorized role (student) is rejected with 403', async () => {
  const res = await inviteStaff(
    makeRequest('student', 'POST', { email: 'staff@university.ac.ke' }, 'http://localhost:3000/api/v1/staff/invite')
  );
  assert.equal(res.status, 403);
});

test('staff invitation: registrar CANNOT invite admin or super_admin accounts', async () => {
  const res = await inviteStaff(
    makeRequest('registrar', 'POST', {
      email: 'admin.target@university.ac.ke',
      role: 'admin'
    }, 'http://localhost:3000/api/v1/staff/invite')
  );
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /Registrars may not invite administrator accounts/i);
});

test('staff invitation: demo users are not rejected with "Invitations require an institutional administrator"', async () => {
  const res = await inviteStaff(
    makeRequest('admin', 'POST', {
      email: 'invalid-email-format',
      role: 'lecturer'
    }, 'http://localhost:3000/api/v1/staff/invite')
  );
  // Fails with email validation (400), proving demo user was NOT blocked by demo guard (403)
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.notEqual(data.error, 'Invitations require an institutional administrator.');
  assert.match(data.error, /Valid academic record email required/i);
});

test('librarian role visibility: librarian can ONLY access library and general notices, strictly barred from registrar/admin modules', () => {
  // Allowed
  assert.equal(canAccessPage('librarian', 'library'), true);
  assert.equal(canAccessPage('librarian', 'announcements'), true);
  assert.equal(canAccessPage('librarian', 'events'), true);
  assert.equal(canAccessPage('librarian', 'ai'), true);
  assert.equal(canAccessPage('librarian', 'dashboard'), true);

  // Strictly Forbidden
  assert.equal(canAccessPage('librarian', 'students'), false);
  assert.equal(canAccessPage('librarian', 'admissions'), false);
  assert.equal(canAccessPage('librarian', 'staff'), false);
  assert.equal(canAccessPage('librarian', 'finance'), false);
  assert.equal(canAccessPage('librarian', 'grades'), false);
  assert.equal(canAccessPage('librarian', 'exams'), false);
  assert.equal(canAccessPage('librarian', 'structure'), false);
  assert.equal(canAccessPage('librarian', 'reports'), false);
  assert.equal(canAccessPage('librarian', 'audit'), false);
});

test('staff password management: registrar cannot change password for admin or super_admin', async () => {
  const res = await managePassword(
    makeRequest('registrar', 'POST', {
      email: 'admin@university.ac.ke',
      action: 'set',
      password: 'NewPassword123!',
      role: 'admin'
    }, 'http://localhost:3000/api/v1/staff/password')
  );
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /Registrars cannot modify administrative accounts/i);
});

test('staff password management: admin/registrar can set password directly for staff/librarian', async () => {
  const res = await managePassword(
    makeRequest('registrar', 'POST', {
      email: 'librarian.test@university.ac.ke',
      action: 'set',
      password: 'StrongPassword2026!',
      role: 'librarian',
      first_name: 'Test',
      last_name: 'Librarian'
    }, 'http://localhost:3000/api/v1/staff/password')
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.message, /Password set successfully/i);
});

test('staff password management: admin/registrar can dispatch recovery reset link', async () => {
  const res = await managePassword(
    makeRequest('registrar', 'POST', {
      email: 'librarian.test@university.ac.ke',
      action: 'reset_link',
      role: 'librarian'
    }, 'http://localhost:3000/api/v1/staff/password')
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.message, /Password reset link has been dispatched/i);
});
