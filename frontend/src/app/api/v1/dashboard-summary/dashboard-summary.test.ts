import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSignedToken } from '@/lib/auth/server-auth';
import { studentsStore } from '@/lib/academic/student-records';
import { coursesStore } from '@/lib/academic/course-catalog';
import { buildExamClearanceCards } from '@/lib/academic/clearance';
import { buildExamSchedules } from '@/lib/academic/exam-schedules';
import { derivedAttendanceAverage, attendanceSessions } from '@/lib/academic/attendance-store';
import { resolveAuditTarget } from '@/lib/audit/audit-labels';
import { GET as getSummary } from './route';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(path.join(HERE, '..', '..', '..', '..', rel), 'utf8');
const adminReq = () =>
  new Request('http://localhost:3000/api/v1/dashboard-summary', {
    headers: { authorization: `Bearer ${createSignedToken({ id: 'usr-demo-admin', email: 'admin@university.ac.ke', role: 'super_admin' })}` },
  });
const roleReq = (id: string, email: string, role: 'student' | 'lecturer') =>
  new Request('http://localhost:3000/api/v1/dashboard-summary', {
    headers: { authorization: `Bearer ${createSignedToken({ id, email, role })}` },
  });

test('dashboard summary returns live counts from the same stores the list pages read', async () => {
  const res = await getSummary(adminReq() as never);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.students.total, studentsStore.length);
  assert.equal(body.data.students.total, 3);
  assert.equal(body.data.courses.total, coursesStore.length);
  assert.equal(body.data.courses.total, 5);
  assert.equal(body.data.applications.total, 3);
  assert.deepEqual(body.data.catalogue.map((c: { code: string }) => c.code), ['BCS 311', 'BIT 312', 'BCS 314', 'BCS 316', 'BBA 201']);
  assert.equal(body.data.finance.invoiced, 111500);
  assert.equal(body.data.finance.collected, 93000);
  assert.equal(body.data.finance.outstanding, 18500);
  assert.equal(body.data.finance.invoices_issued, 2);
  assert.equal(body.data.finance.accounts_with_outstanding_balance, 1);
  assert.equal(body.data.attendance.sessions, 1);
  assert.equal(body.data.attendance.average_percentage, 66.7);
});

test('dashboard summary scopes student and lecturer views to live records', async () => {
  const studentBody = await (await getSummary(roleReq('usr-student-01', 'student@university.ac.ke', 'student') as never)).json();
  assert.equal(studentBody.data.student.cgpa, 3.82);
  assert.equal(studentBody.data.student.fee_balance, 0);
  assert.equal(studentBody.data.student.approved_registrations, 1);
  assert.deepEqual(studentBody.data.catalogue.map((c: { code: string }) => c.code), ['BCS 311']);

  const lecturerBody = await (await getSummary(roleReq('usr-demo-lecturer', 'lecturer@university.ac.ke', 'lecturer') as never)).json();
  assert.equal(lecturerBody.data.lecturer.teaching_units, 2);
  assert.equal(lecturerBody.data.lecturer.approved_registrations, 1);
  assert.equal(lecturerBody.data.lecturer.distinct_students, 1);
});

test('exam clearance cards use exactly the registry students and block Kevin Otieno', () => {
  const cards = buildExamClearanceCards();
  assert.deepEqual(cards.map((c) => c.admission_number), studentsStore.map((s) => s.admission_number));
  assert.deepEqual(cards.map((c) => c.student_name), ['Faith Wanjiku', 'Kevin Otieno', 'Brian Kiprono']);
  const faith = cards.find((c) => c.admission_number === 'BIT/2023/8849')!;
  assert.equal(faith.is_cleared, true);
  assert.equal(faith.fee_balance, 0);
  assert.equal(faith.fee_paid_percentage, 100);
  const kevin = cards.find((c) => c.admission_number === 'BCS/2023/1204')!;
  assert.equal(kevin.is_cleared, false);
  assert.equal(kevin.fee_balance, 18500);
  assert.equal(kevin.fee_paid_percentage, 69);
  assert.ok(!cards.some((c) => c.student_name.includes('Kiptoo') || c.student_name.includes('Chebet')));
});

test('exam timetable uses only the 5-unit catalogue with future dates and registration counts', () => {
  const schedules = buildExamSchedules();
  assert.deepEqual(schedules.map((s) => s.course_code), ['BCS 311', 'BIT 312', 'BCS 314', 'BCS 316', 'BBA 201']);
  for (const s of schedules) assert.ok(s.exam_date >= '2026-12-01', `${s.course_code} exam date ${s.exam_date} is not a future planned date`);
  assert.equal(schedules.find((s) => s.course_code === 'BCS 311')!.total_candidates, 1);
  assert.equal(schedules.find((s) => s.course_code === 'BIT 312')!.total_candidates, 1);
  assert.equal(schedules.find((s) => s.course_code === 'BCS 316')!.total_candidates, 0);
});

test('hostel allocations and dashboard name only registry students', () => {
  const hostels = read('app/api/v1/hostels/route.ts');
  assert.ok(hostels.includes('Faith Wanjiku'));
  assert.ok(hostels.includes('Kevin Otieno'));
  assert.ok(!hostels.includes('Alex Kiptoo'));
  assert.ok(!hostels.includes('Faith Chebet'));
  const dashboard = read('app/dashboard/DashboardExperience.tsx');
  for (const ghost of ['4,820', '128.4', '812', '96.8', 'CSC101', 'CSC301', 'BUS214', 'CSC401', 'October 5', 'running smoothly']) {
    assert.ok(!dashboard.includes(ghost), `dashboard still contains placeholder ${ghost}`);
  }
});

test('attendance average is derived from recorded sessions, never a placeholder', () => {
  assert.equal(derivedAttendanceAverage(attendanceSessions), 66.7);
  assert.equal(derivedAttendanceAverage([]), null);
});

test('audit targets resolve to human-readable names', () => {
  assert.equal(resolveAuditTarget({ entity_type: 'staff', entity_id: 'staff-1', details: {} }), 'Jane Mwangi — Staff');
  assert.equal(resolveAuditTarget({ entity_type: 'students', entity_id: 'BIT/2023/8849', details: {} }), 'Faith Wanjiku — Student');
  assert.equal(resolveAuditTarget({ entity_type: 'student_grades', entity_id: 'grd-1', details: {} }), 'Faith Wanjiku — Grade (BCS 311)');
  assert.equal(resolveAuditTarget({ entity_type: 'transactions', entity_id: 'QHJ8917263', details: { student: 'BIT/2023/8849' } }), 'Faith Wanjiku — Payment');
});
