import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as createCourse, PATCH as updateCourse } from './route';
import { createSignedToken } from '@/lib/auth/server-auth';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, method: string, body?: unknown, url = 'http://localhost:3000/api/v1/courses') {
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

test('courses POST: accepts unit_type, semester, description', async () => {
  const res = await createCourse(
    makeRequest('admin', 'POST', {
      code: 'TEST 101', title: 'Test Course', credit_hours: 3, level: 100,
      department: 'Computer Science', unit_type: 'elective', semester: 2,
      description: 'A test syllabus outline.',
    })
  );
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.data.unit_type, 'elective');
  assert.equal(body.data.semester, 2);
  assert.equal(body.data.description, 'A test syllabus outline.');
});

test('courses POST: defaults unit_type=core, semester=1 when omitted', async () => {
  const res = await createCourse(
    makeRequest('admin', 'POST', { code: 'TEST 102', title: 'Defaults Course', credit_hours: 3 })
  );
  const body = await res.json();
  assert.equal(body.data.unit_type, 'core');
  assert.equal(body.data.semester, 1);
  assert.equal(body.data.description, '');
});

test('courses PATCH: admin can edit unit_type, archive, update description', async () => {
  // find the TEST 101 course created above
  const { coursesStore } = await import('@/lib/academic/course-catalog');
  const course = coursesStore.find((c: any) => c.code === 'TEST 101');
  assert.ok(course, 'TEST 101 should exist');
  const res = await updateCourse(
    makeRequest('admin', 'PATCH', {
      id: course.id, unit_type: 'core', description: 'Updated outline.', is_active: false,
    })
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.unit_type, 'core');
  assert.equal(body.data.description, 'Updated outline.');
  assert.equal(body.data.is_active, false);
  // restore
  await updateCourse(makeRequest('admin', 'PATCH', { id: course.id, is_active: true }));
});

test('courses PATCH: invalid unit_type is ignored', async () => {
  const { coursesStore } = await import('@/lib/academic/course-catalog');
  const course = coursesStore.find((c: any) => c.code === 'TEST 101');
  assert.ok(course, 'TEST 101 must exist');
  const res = await updateCourse(makeRequest('admin', 'PATCH', { id: course.id, unit_type: 'super-core' }));
  const body = await res.json();
  assert.equal(body.data.unit_type, 'core'); // unchanged
});

test('courses PATCH: nonexistent id returns 404', async () => {
  const res = await updateCourse(makeRequest('admin', 'PATCH', { id: 'crs-nope', title: 'X' }));
  assert.equal(res.status, 404);
});

test('courses PATCH: student cannot edit (courses:write required)', async () => {
  const { coursesStore } = await import('@/lib/academic/course-catalog');
  const course = coursesStore[0];
  const res = await updateCourse(makeRequest('student', 'PATCH', { id: course.id, title: 'Hacked' }));
  assert.equal(res.status, 403);
});
