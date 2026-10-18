import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET, DELETE } from './route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { getAuditLogs } from '@/lib/audit/audit-logger';
import { studentsStore } from '@/lib/academic/student-records';

function makeRequest(role = 'registrar', method = 'POST', body?: unknown, url = 'http://localhost:3000/api/v1/students') {
  const token = createSignedToken({
    id: `usr-${role}-test`,
    email: `${role}@university.ac.ke`,
    role: role as any,
  });

  return new Request(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

test('student registration: unauthorized roles cannot register students', async () => {
  const studentReq = makeRequest('student', 'POST', {
    full_name: 'Hacker Student',
    email: 'hacker@university.ac.ke',
    registration_number: 'SMU/BIT/2026/9999',
  });
  const res = await POST(studentReq);
  assert.equal(res.status, 403);
});

test('student registration: successfully registers a new student with full details and audit logging', async () => {
  const regNo = `SMU/BIT/2026/TEST_${Date.now()}`;
  const email = `test.student.${Date.now()}@summit.ac.ke`;

  const req = makeRequest('registrar', 'POST', {
    full_name: 'Kelvin Test User',
    email,
    registration_number: regNo,
    faculty: 'School of Computing & Informatics',
    department: 'Information Technology',
    year_of_study: 1,
    campus: 'SMU-MAIN',
    initial_password: 'StudentPassword123!',
  });

  const res = await POST(req);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.message, /Student registered: Kelvin Test User/);
  assert.equal(data.data.admission_number, regNo);
  assert.equal(data.data.email, email.toLowerCase());
  assert.equal(data.data.current_year_of_study, 1);

  // Verify stored in studentsStore
  const found = studentsStore.find((s) => s.admission_number === regNo);
  assert.ok(found, 'Student should be present in studentsStore');
  assert.equal(found?.email, email.toLowerCase());

  // Verify audit log entry
  const logs = getAuditLogs({ action: 'student_registered' });
  const matchingLog = logs.find((l) => l.entity_id === regNo || l.details?.email === email);
  assert.ok(matchingLog, 'Audit log should record student_registered action');
  assert.equal(matchingLog?.actor_role, 'registrar');

  // Clean up
  const delReq = makeRequest('registrar', 'DELETE', undefined, `http://localhost:3000/api/v1/students?admission_number=${regNo}`);
  const delRes = await DELETE(delReq);
  assert.equal(delRes.status, 200);
});

test('student registration: duplicate email rejection', async () => {
  const regNo1 = `SMU/BIT/2026/DUP1_${Date.now()}`;
  const regNo2 = `SMU/BIT/2026/DUP2_${Date.now()}`;
  const duplicateEmail = `dup.email.${Date.now()}@summit.ac.ke`;

  // Register first
  const res1 = await POST(makeRequest('registrar', 'POST', {
    full_name: 'Original Student',
    email: duplicateEmail,
    registration_number: regNo1,
    initial_password: 'StudentPassword123!',
  }));
  assert.equal(res1.status, 201);

  // Attempt second with same email
  const res2 = await POST(makeRequest('registrar', 'POST', {
    full_name: 'Duplicate Student',
    email: duplicateEmail,
    registration_number: regNo2,
    initial_password: 'StudentPassword123!',
  }));
  assert.equal(res2.status, 400);
  const data2 = await res2.json();
  assert.equal(data2.success, false);
  assert.equal(data2.error, 'A student with this email already exists');

  // Clean up
  await DELETE(makeRequest('registrar', 'DELETE', undefined, `http://localhost:3000/api/v1/students?admission_number=${regNo1}`));
});

test('student registration: duplicate registration number rejection', async () => {
  const duplicateRegNo = `SMU/BIT/2026/DUPREG_${Date.now()}`;
  const email1 = `student1.${Date.now()}@summit.ac.ke`;
  const email2 = `student2.${Date.now()}@summit.ac.ke`;

  // Register first
  const res1 = await POST(makeRequest('registrar', 'POST', {
    full_name: 'Original Student',
    email: email1,
    registration_number: duplicateRegNo,
    initial_password: 'StudentPassword123!',
  }));
  assert.equal(res1.status, 201);

  // Attempt second with same reg number
  const res2 = await POST(makeRequest('registrar', 'POST', {
    full_name: 'Duplicate Student',
    email: email2,
    registration_number: duplicateRegNo,
    initial_password: 'StudentPassword123!',
  }));
  assert.equal(res2.status, 400);
  const data2 = await res2.json();
  assert.equal(data2.success, false);
  assert.equal(data2.error, 'A student with this registration number already exists');

  // Clean up
  await DELETE(makeRequest('registrar', 'DELETE', undefined, `http://localhost:3000/api/v1/students?admission_number=${duplicateRegNo}`));
});

test('student registration: validation rejects invalid email or short password', async () => {
  const invalidEmailRes = await POST(makeRequest('registrar', 'POST', {
    full_name: 'Invalid Email Guy',
    email: 'not-an-email',
    registration_number: `SMU/BIT/2026/INV_${Date.now()}`,
    initial_password: 'StudentPassword123!',
  }));
  assert.equal(invalidEmailRes.status, 400);
  assert.match((await invalidEmailRes.json()).error, /valid email address/i);

  const shortPassRes = await POST(makeRequest('registrar', 'POST', {
    full_name: 'Short Password Guy',
    email: `valid.${Date.now()}@summit.ac.ke`,
    registration_number: `SMU/BIT/2026/SHORT_${Date.now()}`,
    initial_password: 'short',
  }));
  assert.equal(shortPassRes.status, 400);
  assert.match((await shortPassRes.json()).error, /at least 8 characters/i);
});
