import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStudentAttendance,
  attendanceTrend,
  attendanceExemptions,
  sessionDetails,
  ATTENDANCE_THRESHOLD,
  type SessionDetail,
} from '@/lib/academic/attendance-store';
import { buildExamClearanceCards } from '@/lib/academic/clearance';

test('attendance threshold comes from institutional policy', () => {
  assert.equal(ATTENDANCE_THRESHOLD, 75);
});

test('computeStudentAttendance: honest stats from recorded sessions', () => {
  const stats = computeStudentAttendance();
  // Seed: Faith present, Kevin present, Brian absent (1 session)
  const faith = stats.find((s) => s.adm === 'BIT/2023/8849');
  const brian = stats.find((s) => s.adm === 'BBA/2022/4412');
  assert.ok(faith);
  assert.equal(faith.percentage, 100);
  assert.equal(faith.is_at_risk, false);
  assert.equal(faith.is_blocked, false);
  assert.ok(brian);
  assert.equal(brian.percentage, 0);
  assert.equal(brian.is_at_risk, true);
  assert.equal(brian.is_blocked, true); // below threshold, no exemption
  assert.equal(brian.sessions_missed, 1);
});

test('computeStudentAttendance: exemption lifts the block', () => {
  attendanceExemptions.push({
    student_id: 'stu-3', adm: 'BBA/2022/4412', name: 'Brian Kiprono',
    reason: 'Test medical exemption', granted_by: 'test@university.ac.ke', granted_at: new Date().toISOString(),
  });
  try {
    const stats = computeStudentAttendance();
    const brian = stats.find((s) => s.adm === 'BBA/2022/4412');
    assert.ok(brian);
    assert.equal(brian.is_at_risk, true); // still at-risk on numbers
    assert.equal(brian.is_exempt, true);
    assert.equal(brian.is_blocked, false); // block lifted
  } finally {
    attendanceExemptions.pop();
  }
});

test('attendanceTrend: nodata with a single old session', () => {
  const t = attendanceTrend([{ id: 'x', date: '2026-10-03', course: 'BCS 311', courseTitle: 'T', topic: 'T', lecturer: 'L', present: 2, total: 3, percentage: '66.7%' }]);
  assert.equal(t.direction, 'nodata'); // session is older than 2 weeks from "now"
});

test('exam clearance: attendance block applies to below-threshold students', () => {
  const cards = buildExamClearanceCards();
  const brian = cards.find((c) => c.admission_number === 'BBA/2022/4412');
  assert.ok(brian);
  assert.equal(brian.attendance_percentage, 0);
  assert.equal(brian.attendance_blocked, true);
  assert.equal(brian.is_cleared, false); // blocked on attendance even with no fee balance
  const faith = cards.find((c) => c.admission_number === 'BIT/2023/8849');
  assert.ok(faith);
  assert.equal(faith.attendance_blocked, false);
});

test('exam clearance: students with no recorded sessions are NOT attendance-blocked', () => {
  const cards = buildExamClearanceCards();
  // Any student not in the attendance seed must have null percentage and no block
  for (const c of cards) {
    if (c.attendance_percentage === null) {
      assert.equal(c.attendance_blocked, false, `${c.admission_number} should not be blocked with no data`);
    }
  }
});

test('session detail persists per-student records for drill-down', () => {
  const d: SessionDetail | undefined = sessionDetails.find((x) => x.session_id === 'ses-1');
  assert.ok(d);
  assert.equal(d.records.length, 3);
  assert.ok(d.records.every((r) => ['present', 'absent', 'late', 'excused'].includes(r.status)));
});
