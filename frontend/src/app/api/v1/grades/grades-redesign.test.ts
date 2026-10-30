import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as listGrades, POST as enterGrade, PATCH as moderateGrade } from './enter/route';
import { POST as bulkImport } from './bulk/route';
import { GET as listAppeals, POST as submitAppeal, PATCH as decideAppeal } from './appeals/route';
import { classifyStanding } from '@/lib/academic/gpa';
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

let draftId = '';

test('grades workflow: lecturer creates a draft (not approved)', async () => {
  const res = await enterGrade(makeRequest('lecturer', 'POST', {
    admission_number: 'BCS/2023/1204', course_code: 'BCS 311', cat_score: 20, exam_score: 50,
  }));
  assert.ok([200, 201].includes(res.status));
  const body = await res.json();
  assert.equal(body.data.moderation_status, 'draft');
  assert.equal(body.data.is_approved, false);
  draftId = body.data.id;
});

test('grades workflow: draft -> pending_hod via submit', async () => {
  const res = await moderateGrade(makeRequest('lecturer', 'PATCH', { grade_id: draftId, action: 'submit' }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.moderation_status, 'pending_hod');
});

test('grades workflow: lecturer cannot approve (403)', async () => {
  const res = await moderateGrade(makeRequest('lecturer', 'PATCH', { grade_id: draftId, action: 'approve' }));
  assert.equal(res.status, 403);
});

test('grades workflow: hod requests correction -> back to draft', async () => {
  const res = await moderateGrade(makeRequest('hod', 'PATCH', { grade_id: draftId, action: 'request_correction', note: 'Recheck CAT 2' }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.moderation_status, 'draft');
});

test('grades workflow: resubmit then approve -> senate_approved', async () => {
  await moderateGrade(makeRequest('lecturer', 'PATCH', { grade_id: draftId, action: 'submit' }));
  const res = await moderateGrade(makeRequest('hod', 'PATCH', { grade_id: draftId, action: 'approve' }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.moderation_status, 'senate_approved');
  assert.equal(body.data.is_approved, true);
});

test('grades workflow: bare PATCH (legacy) still approves', async () => {
  const created = await enterGrade(makeRequest('lecturer', 'POST', {
    admission_number: 'BBA/2022/4412', course_code: 'BCS 316', cat_score: 18, exam_score: 45,
  }));
  const id = (await created.json()).data.id;
  const res = await moderateGrade(makeRequest('admin', 'PATCH', { grade_id: id }));
  assert.equal((await res.json()).data.moderation_status, 'senate_approved');
});

test('grades bulk: creates drafts, rejects out-of-range and unknown students', async () => {
  const res = await bulkImport(makeRequest('lecturer', 'POST', {
    course_code: 'BCS 311',
    grades: [
      { admission_number: 'BBA/2022/4412', cat_score: 25, exam_score: 55 },
      { admission_number: 'BBA/2022/4412', cat_score: 20, exam_score: 40 },
      { admission_number: 'NOPE/0000/000', cat_score: 20, exam_score: 40 },
      { admission_number: 'BCS/2023/1204', cat_score: 35, exam_score: 40 },
      { admission_number: 'BIT/2023/8849', cat_score: 20, exam_score: 75 },
    ],
  }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.created, 1);
  assert.equal(body.data.results.filter((r: any) => !r.ok).length, 4);
  assert.match(body.data.results[2].error, /Unknown admission/);
  assert.match(body.data.results[3].error, /out of range/);
});

test('grades bulk: lecturer cannot bulk-upload unassigned course (403)', async () => {
  const res = await bulkImport(makeRequest('lecturer', 'POST', {
    course_code: 'BIT 312', grades: [{ admission_number: 'BIT/2023/8849', cat_score: 10, exam_score: 20 }],
  }));
  assert.equal(res.status, 403);
});

test('grades appeals: lecturer submits with reason, hod approves', async () => {
  // create a grade to appeal
  const created = await enterGrade(makeRequest('lecturer', 'POST', {
    admission_number: 'BCS/2023/1204', course_code: 'BCS 316', cat_score: 15, exam_score: 40,
  }));
  const gradeId = (await created.json()).data.id;

  // short reason rejected
  const short = await submitAppeal(makeRequest('lecturer', 'POST', {
    grade_id: gradeId, new_cat_score: 18, new_exam_score: 45, reason: 'typo',
  }));
  assert.equal(short.status, 400);

  const res = await submitAppeal(makeRequest('lecturer', 'POST', {
    grade_id: gradeId, new_cat_score: 18, new_exam_score: 45,
    reason: 'Missing script found during re-marking of CAT 2',
  }));
  assert.equal(res.status, 201);
  const appeal = (await res.json()).data;
  assert.equal(appeal.status, 'pending');
  assert.equal(appeal.new_total, 63);

  const decided = await decideAppeal(makeRequest('hod', 'PATCH', { appeal_id: appeal.id, decision: 'approved' }));
  assert.equal(decided.status, 200);
  const decidedBody = (await decided.json()).data;
  assert.equal(decidedBody.status, 'approved');

  // grade corrected and back to draft
  const list = await listGrades(makeRequest('hod', 'GET'));
  const grades = (await list.json()).data;
  const corrected = grades.find((g: any) => g.id === gradeId);
  assert.equal(corrected.total_score, 63);
  assert.equal(corrected.moderation_status, 'draft');
  assert.equal(corrected.is_approved, false);
});

test('grades appeals: lecturer cannot decide (403)', async () => {
  const res = await decideAppeal(makeRequest('lecturer', 'PATCH', { appeal_id: 'apl-nope', decision: 'approved' }));
  assert.equal(res.status, 403);
});

test('standing classifier: bands match the brief', async () => {
  assert.equal(classifyStanding(3.82, 5).band, "Dean's List");
  assert.equal(classifyStanding(3.2, 5).band, 'Second Class Upper');
  assert.equal(classifyStanding(2.7, 5).band, 'Second Class Lower');
  assert.equal(classifyStanding(2.2, 5).band, 'Pass');
  assert.equal(classifyStanding(1.5, 5).band, 'Academic Probation');
  assert.equal(classifyStanding(1.5, 5).detail, 'Warning letter due');
  assert.equal(classifyStanding(4.0, 2).band, 'Insufficient data');
});
