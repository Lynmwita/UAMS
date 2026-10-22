import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET, DELETE, PATCH } from './route';
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
    registration_number: 'BIT/2026/9999',
  });
  const res = await POST(studentReq);
  assert.equal(res.status, 403);
});

test('student registration: successfully registers an isolated demo student with full details and audit logging', async (context) => {
  const outbound = context.mock.method(globalThis, 'fetch', async () => { throw new Error('Demo registration must not make outbound requests'); });
  const regNo = `SMU/BIT/2026/TEST_${Date.now()}`;
  const email = `test.student.${Date.now()}@summit.ac.ke`;

  const req = makeRequest('registrar', 'POST', {
    full_name: 'Kelvin Test User',
    email,
    registration_number: regNo,
    faculty: 'School of Computing & Informatics',
    department: 'Information Technology',
    year_of_study: 1,
    campus: 'ZU-TECH',
    initial_password: 'StudentPassword123!',
  });

  const res = await POST(req);
  assert.equal(outbound.mock.callCount(), 0);
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.match(data.message, /Demonstration student registered: Kelvin Test User/);
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
  const regNo1 = `BIT/2026/DUP1_${Date.now()}`;
  const regNo2 = `BIT/2026/DUP2_${Date.now()}`;
  const duplicateEmail = `dup.email.${Date.now()}@university.ac.ke`;

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
  const duplicateRegNo = `BIT/2026/DUPREG_${Date.now()}`;
  const email1 = `student1.${Date.now()}@university.ac.ke`;
  const email2 = `student2.${Date.now()}@university.ac.ke`;

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
    registration_number: `BIT/2026/INV_${Date.now()}`,
    initial_password: 'StudentPassword123!',
  }));
  assert.equal(invalidEmailRes.status, 400);
  assert.match((await invalidEmailRes.json()).error, /valid email address/i);

  const shortPassRes = await POST(makeRequest('registrar', 'POST', {
    full_name: 'Short Password Guy',
    email: `valid.${Date.now()}@university.ac.ke`,
    registration_number: `BIT/2026/SHORT_${Date.now()}`,
    initial_password: 'short',
  }));
  assert.equal(shortPassRes.status, 400);
  assert.match((await shortPassRes.json()).error, /at least 8 characters/i);
});

test('student record update: registrar can edit and fix typos on student record with audit log', async () => {
  const regNo = `BIT/2026/EDIT_${Date.now()}`;
  const email = `typo.student.${Date.now()}@university.ac.ke`;

  // Create student first
  await POST(makeRequest('registrar', 'POST', {
    full_name: 'Jon Doe Typo',
    email,
    registration_number: regNo,
    faculty: 'School of Computing & Informatics',
    department: 'Information Technology',
    year_of_study: 1,
  }));

  // Fix typo in name and program
  const editReq = makeRequest('registrar', 'PATCH', {
    registration_number: regNo,
    full_name: 'Johnathan Doe Corrected',
    program: 'Bachelor of Science in Computer Science',
    department: 'Computer Science',
    year_of_study: 2,
  });
  const editRes = await PATCH(editReq);
  assert.equal(editRes.status, 200);
  const editData = await editRes.json();
  assert.equal(editData.success, true);
  assert.equal(editData.data.first_name, 'Johnathan');
  assert.equal(editData.data.last_name, 'Doe Corrected');
  assert.equal(editData.data.current_year_of_study, 2);

  // Check audit log
  const logs = getAuditLogs({ action: 'student_updated' });
  const matching = logs.find((l) => l.entity_id === regNo);
  assert.ok(matching, 'Audit log must record student_updated');

  // Clean up
  await DELETE(makeRequest('registrar', 'DELETE', undefined, `http://localhost:3000/api/v1/students?admission_number=${regNo}`));
});

test('student suspension: registrar can deactivate/suspend student preserving audit trail', async () => {
  const regNo = `BIT/2026/SUSP_${Date.now()}`;
  const email = `susp.student.${Date.now()}@university.ac.ke`;

  // Create student
  await POST(makeRequest('registrar', 'POST', {
    full_name: 'Student To Suspend',
    email,
    registration_number: regNo,
  }));

  // Suspend with reason
  const suspReq = makeRequest('registrar', 'PATCH', {
    registration_number: regNo,
    status: 'suspended',
    reason: 'Administrative error during manual enrollment',
  });
  const suspRes = await PATCH(suspReq);
  assert.equal(suspRes.status, 200);
  const suspData = await suspRes.json();
  assert.equal(suspData.success, true);
  assert.equal(suspData.data.status, 'suspended');

  // Verify stored status is suspended (not deleted)
  const inStore = studentsStore.find((s) => s.admission_number === regNo);
  assert.ok(inStore, 'Student must remain in store (not hard deleted)');
  assert.equal(inStore.status, 'suspended');

  // Verify audit log
  const suspLogs = getAuditLogs({ action: 'student_suspended' });
  const suspLog = suspLogs.find((l) => l.entity_id === regNo);
  assert.ok(suspLog, 'Audit log must record student_suspended with reason');
  assert.equal(suspLog.details?.reason, 'Administrative error during manual enrollment');

  // Reactivate student
  const reactivateRes = await PATCH(makeRequest('registrar', 'PATCH', {
    registration_number: regNo,
    status: 'active',
  }));
  assert.equal(reactivateRes.status, 200);
  assert.equal((await reactivateRes.json()).data.status, 'active');

  // Clean up
  await DELETE(makeRequest('registrar', 'DELETE', undefined, `http://localhost:3000/api/v1/students?admission_number=${regNo}`));
});
