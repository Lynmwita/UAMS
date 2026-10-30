import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectGhostClearances,
  buildGradeModificationMap,
  buildPassGenerationLog,
  buildAuditorFlagList,
} from './auditor-utils';
import type { ExamClearanceCard } from '@/types';
import type { AuditLogEntry } from '@/lib/audit/audit-logger';

function makeCard(overrides: Partial<ExamClearanceCard>): ExamClearanceCard {
  return {
    id: 'clr-test-1',
    student_id: 'stu-1',
    student_name: 'Test Student',
    admission_number: 'BIT/2023/0001',
    program_name: 'BSc IT',
    semester_name: 'Sept-Dec 2026',
    card_serial_number: 'EXAM-2026-SEP-0001',
    fee_balance: 0,
    fee_paid_percentage: 100,
    is_cleared: true,
    attendance_percentage: 90,
    attendance_blocked: false,
    attendance_exempt: false,
    security_qr_token: 'token',
    registered_units: 5,
    waiver: null,
    status: 'cleared',
    ...overrides,
  };
}

function makeLog(overrides: Partial<AuditLogEntry>): AuditLogEntry {
  return {
    id: 'aud-test-1',
    timestamp: '2026-10-30T10:00:00Z',
    actor_email: 'hod@university.ac.ke',
    actor_role: 'hod',
    action: 'GRADE_MODIFIED',
    entity_type: 'student_grades',
    entity_id: 'grd-1',
    ip_address: '127.0.0.1',
    status: 'SUCCESS',
    details: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// detectGhostClearances
// ---------------------------------------------------------------------------

test('detectGhostClearances: cleared with zero balance is not a ghost', () => {
  const ghosts = detectGhostClearances([makeCard({ status: 'cleared', fee_balance: 0 })]);
  assert.equal(ghosts.length, 0);
});

test('detectGhostClearances: cleared with balance and no waiver is unexplained ghost', () => {
  const ghosts = detectGhostClearances([
    makeCard({ status: 'cleared', fee_balance: 15000, fee_paid_percentage: 75, waiver: null }),
  ]);
  assert.equal(ghosts.length, 1);
  assert.equal(ghosts[0].kind, 'unexplained');
  assert.equal(ghosts[0].fee_balance, 15000);
});

test('detectGhostClearances: waived status is never a ghost', () => {
  const ghosts = detectGhostClearances([
    makeCard({
      status: 'waived',
      fee_balance: 20000,
      fee_paid_percentage: 60,
      waiver: { waiver_type: 'scholarship', valid_until: '2026-12-31', granted_by_email: 'finance@university.ac.ke' },
    }),
  ]);
  assert.equal(ghosts.length, 0);
});

test('detectGhostClearances: blocked students are not clearances', () => {
  const ghosts = detectGhostClearances([
    makeCard({ status: 'blocked_fee', fee_balance: 30000, fee_paid_percentage: 40, is_cleared: false }),
    makeCard({ status: 'blocked_attendance', fee_balance: 0, is_cleared: false }),
  ]);
  assert.equal(ghosts.length, 0);
});

// ---------------------------------------------------------------------------
// buildGradeModificationMap
// ---------------------------------------------------------------------------

test('buildGradeModificationMap: extracts modifications per grade', () => {
  const logs = [
    makeLog({
      action: 'GRADE_MODIFIED',
      entity_id: 'grd-1',
      details: { old_total: 65, old_letter: 'B', new_total: 78, new_letter: 'A', reason: 'Re-marking found missing script' },
    }),
    makeLog({
      action: 'GRADE_APPROVED',
      entity_id: 'grd-2',
      details: {},
    }),
  ];
  const map = buildGradeModificationMap(logs);
  assert.equal(map.size, 2);
  const mods = map.get('grd-1')!;
  assert.equal(mods.length, 1);
  assert.equal(mods[0].from, '65/100 (B)');
  assert.equal(mods[0].to, '78/100 (A)');
  assert.equal(mods[0].authorizedBy, 'hod@university.ac.ke');
  assert.equal(mods[0].reason, 'Re-marking found missing script');
});

test('buildGradeModificationMap: ignores non-grade actions', () => {
  const logs = [
    makeLog({ action: 'PAYMENT_VERIFIED', entity_id: 'pay-1' }),
    makeLog({ action: 'SYSTEM_INITIALIZATION', entity_id: 'sec-1' }),
  ];
  const map = buildGradeModificationMap(logs);
  assert.equal(map.size, 0);
});

test('buildGradeModificationMap: honest unknown when details missing', () => {
  const logs = [makeLog({ action: 'GRADE_CORRECTION_REQUESTED', entity_id: 'grd-9', details: {} })];
  const map = buildGradeModificationMap(logs);
  const mods = map.get('grd-9')!;
  assert.equal(mods[0].from, 'unknown');
  assert.equal(mods[0].to, 'unknown');
  assert.equal(mods[0].reason, 'No reason recorded');
});

// ---------------------------------------------------------------------------
// buildPassGenerationLog
// ---------------------------------------------------------------------------

test('buildPassGenerationLog: extracts pass generation events', () => {
  const logs = [
    makeLog({
      action: 'EXAM_PASS_GENERATED',
      entity_id: 'clr-stu-1',
      actor_email: 'registrar@university.ac.ke',
      actor_role: 'registrar',
      details: { pass_code: 'EXAM-2026-SEP-8849', student_name: 'Faith Wanjiku' },
    }),
  ];
  const events = buildPassGenerationLog(logs);
  assert.equal(events.length, 1);
  assert.equal(events[0].passCode, 'EXAM-2026-SEP-8849');
  assert.equal(events[0].student, 'Faith Wanjiku');
  assert.equal(events[0].authorizedBy, 'registrar@university.ac.ke');
});

test('buildPassGenerationLog: honest empty when no events exist', () => {
  const logs = [makeLog({ action: 'GRADE_SUBMITTED', entity_id: 'grd-1' })];
  const events = buildPassGenerationLog(logs);
  assert.equal(events.length, 0);
});

// ---------------------------------------------------------------------------
// buildAuditorFlagList
// ---------------------------------------------------------------------------

test('buildAuditorFlagList: extracts AUDIT_FLAG_RAISED events', () => {
  const logs = [
    makeLog({
      action: 'AUDIT_FLAG_RAISED',
      entity_type: 'student_grades',
      entity_id: 'grd-5',
      actor_email: 'audit_officer@university.ac.ke',
      actor_role: 'audit_officer',
      details: {
        student_name: 'Kevin Otieno',
        admission_number: 'BCS/2023/1204',
        course_code: 'BCS 311',
        reason: 'Unusual score jump from 45 to 82',
      },
    }),
  ];
  const flags = buildAuditorFlagList(logs);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].student, 'Kevin Otieno');
  assert.equal(flags[0].course, 'BCS 311');
  assert.equal(flags[0].reason, 'Unusual score jump from 45 to 82');
  assert.equal(flags[0].flaggedBy, 'audit_officer@university.ac.ke');
});

test('buildAuditorFlagList: ignores other actions', () => {
  const logs = [makeLog({ action: 'GRADE_MODIFIED', entity_id: 'grd-1' })];
  const flags = buildAuditorFlagList(logs);
  assert.equal(flags.length, 0);
});
