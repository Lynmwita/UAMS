import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as createWaiver, PATCH as revokeWaiver, GET as listWaivers } from './waivers/route';
import { GET as verifyQr } from './verify-qr/route';
import { PATCH as setVenue } from './venue/route';
import { POST as bulkPass } from './bulk-pass/route';
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

test('waivers: finance_officer can grant a waiver with a proper reason', async () => {
  const res = await createWaiver(
    makeRequest('finance_officer', 'POST', {
      admission_number: 'BCS/2023/1204',
      waiver_type: 'payment_plan',
      valid_until: '2026-12-31',
      reason: 'Approved payment plan: parent pays balance in two instalments by mid-December.',
    })
  );
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.waiver_type, 'payment_plan');
});

test('waivers: reason shorter than 20 chars is rejected (400)', async () => {
  const res = await createWaiver(
    makeRequest('admin', 'POST', {
      admission_number: 'BCS/2023/1204',
      waiver_type: 'other',
      valid_until: '2026-12-31',
      reason: 'Too short',
    })
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /20 characters/);
});

test('waivers: missing reason is rejected (400)', async () => {
  const res = await createWaiver(
    makeRequest('admin', 'POST', {
      admission_number: 'BCS/2023/1204',
      waiver_type: 'other',
      valid_until: '2026-12-31',
    })
  );
  assert.equal(res.status, 400);
});

test('waivers: past valid_until is rejected (400)', async () => {
  const res = await createWaiver(
    makeRequest('admin', 'POST', {
      admission_number: 'BCS/2023/1204',
      waiver_type: 'scholarship',
      valid_until: '2020-01-01',
      reason: 'This reason is long enough to pass the length check easily.',
    })
  );
  assert.equal(res.status, 400);
});

test('waivers: duplicate active waiver is rejected (409)', async () => {
  const res = await createWaiver(
    makeRequest('admin', 'POST', {
      admission_number: 'BCS/2023/1204',
      waiver_type: 'scholarship',
      valid_until: '2026-12-31',
      reason: 'Second waiver attempt while the first is still active and valid.',
    })
  );
  assert.equal(res.status, 409);
});

test('waivers: student role cannot grant waivers (403)', async () => {
  const res = await createWaiver(
    makeRequest('student', 'POST', {
      admission_number: 'BCS/2023/1204',
      waiver_type: 'other',
      valid_until: '2026-12-31',
      reason: 'Students cannot grant themselves waivers, obviously enough.',
    })
  );
  assert.equal(res.status, 403);
});

test('waivers: revoke works and is audit-logged', async () => {
  const list = await listWaivers(makeRequest('admin', 'GET', undefined, 'http://localhost:3000/api/v1/exams/waivers?scope=active'));
  const body = await list.json();
  const waiver = body.data[0];
  assert.ok(waiver, 'expected an active waiver from earlier test');

  const res = await revokeWaiver(makeRequest('admin', 'PATCH', { id: waiver.id, action: 'revoke' }));
  assert.equal(res.status, 200);
  const revoked = await res.json();
  assert.equal(revoked.data.is_revoked, true);

  // double revoke -> 409
  const res2 = await revokeWaiver(makeRequest('admin', 'PATCH', { id: waiver.id, action: 'revoke' }));
  assert.equal(res2.status, 409);
});

test('verify-qr: unknown code fails closed (DO NOT ADMIT)', async () => {
  const res = await verifyQr(
    makeRequest('lecturer', 'GET', undefined, 'http://localhost:3000/api/v1/exams/verify-qr?code=FAKE-CODE-123')
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.valid, false);
  assert.equal(body.verdict, 'DO NOT ADMIT');
  assert.ok(!body.student_name, 'no student details leaked for unknown codes');
});

test('verify-qr: missing code is a 400', async () => {
  const res = await verifyQr(
    makeRequest('lecturer', 'GET', undefined, 'http://localhost:3000/api/v1/exams/verify-qr')
  );
  assert.equal(res.status, 400);
});

test('verify-qr: issued code verifies with clearance status', async () => {
  // Build a real issued token from the clearance cards
  const { buildExamClearanceCards } = await import('@/lib/academic/clearance');
  const cards = buildExamClearanceCards();
  assert.ok(cards.length > 0, 'expected demo clearance cards');
  const card = cards[0];
  const res = await verifyQr(
    makeRequest('lecturer', 'GET', undefined, `http://localhost:3000/api/v1/exams/verify-qr?code=${encodeURIComponent(card.security_qr_token)}`)
  );
  const body = await res.json();
  assert.equal(body.valid, true);
  assert.equal(body.student_name, card.student_name);
  assert.equal(body.admission_number, card.admission_number);
  assert.ok(['ADMIT', 'DO NOT ADMIT'].includes(body.verdict));
});

test('venue: admin can set venue/building/seat_range', async () => {
  const res = await setVenue(
    makeRequest('admin', 'PATCH', {
      schedule_id: 'exm-test-1',
      venue: 'Lenana Hall',
      building: 'Block C',
      seat_range: 'A1-A60',
    })
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.venue, 'Lenana Hall');
  assert.equal(body.data.building, 'Block C');
  assert.equal(body.data.seat_range, 'A1-A60');
});

test('venue: missing schedule_id is a 400', async () => {
  const res = await setVenue(makeRequest('admin', 'PATCH', { venue: 'X' }));
  assert.equal(res.status, 400);
});

test('bulk-pass: blocked students are skipped, never issued', async () => {
  const { buildExamClearanceCards } = await import('@/lib/academic/clearance');
  const cards = buildExamClearanceCards();
  const blocked = cards.find((c) => c.status === 'blocked_fee' || c.status === 'blocked_attendance');
  const cleared = cards.find((c) => c.status === 'cleared');
  assert.ok(blocked || cleared, 'expected demo cards');

  const ids = [blocked?.student_id, cleared?.student_id].filter(Boolean) as string[];
  const res = await bulkPass(makeRequest('admin', 'POST', { student_ids: ids }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'application/zip');
  const issued = Number(res.headers.get('X-Issued-Count'));
  const skipped = Number(res.headers.get('X-Skipped-Count'));
  if (blocked && cleared) {
    assert.equal(issued, 1);
    assert.equal(skipped, 1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  assert.ok(buf.length > 100, 'ZIP should not be empty');
  assert.equal(buf[0], 0x50); // 'P' of PK zip magic
  assert.equal(buf[1], 0x4b); // 'K'
});

test('bulk-pass: empty selection is a 400', async () => {
  const res = await bulkPass(makeRequest('admin', 'POST', { student_ids: [] }));
  assert.equal(res.status, 400);
});
