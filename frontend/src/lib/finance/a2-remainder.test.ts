import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as c2bCallback } from '../../app/api/v1/finance/mpesa/c2b/route';
import { POST as helbBatch } from '../../app/api/v1/finance/helb/batch/route';
import { GET as helbBands } from '../../app/api/v1/finance/helb/bands/route';
import { GET as helbExport } from '../../app/api/v1/finance/helb/export/route';
import { createSignedToken } from '../auth/server-auth';
import { postC2BPayment, suspenseQueueStore } from './c2b';
import { reconcileHelbBatch, splitFunding, HEF_BAND_SPLITS } from './helb';
import { invoicesStore, type UamsInvoice } from './invoices';
import { getCreditBalance, totalOutstandingBalance } from './allocation';

const ORIGIN = 'http://localhost:3000';
const SECRET = 'a'.repeat(40);

function financeReq(url: string, method: string, body?: unknown) {
  const token = createSignedToken({ id: 'usr-finance-a2', email: 'finance@university.ac.ke', role: 'finance_officer' });
  return new Request(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

function studentReq(url: string, method: string, body?: unknown) {
  const token = createSignedToken({ id: 'usr-student-a2', email: 'student@university.ac.ke', role: 'student' });
  return new Request(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
}

function testInvoice(number: string, studentId: string, admission: string, name: string, total: number, issued: string): UamsInvoice {
  return {
    invoice_number: number,
    student_id: studentId,
    admission_number: admission,
    student_name: name,
    semester_label: 'Semester 1',
    academic_year: '2026/2027',
    items: [{ description: 'Tuition', amount: total, type: 'tuition' }],
    total_amount: total,
    amount_paid: 0,
    balance: total,
    status: 'outstanding',
    issued_at: issued,
  };
}

// ---- Bands ----

test('HEF bands: every band sums to 100% and splits a round total exactly', () => {
  const expected: Record<number, [number, number, number]> = {
    1: [70000, 30000, 0],
    2: [60000, 30000, 10000],
    3: [50000, 30000, 20000],
    4: [40000, 30000, 30000],
    5: [30000, 30000, 40000],
  };
  for (const band of [1, 2, 3, 4, 5]) {
    const split = HEF_BAND_SPLITS[band as 1 | 2 | 3 | 4 | 5];
    assert.equal(split.scholarship + split.loan + split.household, 100);
    const got = splitFunding(band, 100000);
    assert.deepEqual([got.scholarship, got.loan, got.household], expected[band]);
    assert.equal(got.scholarship + got.loan + got.household, 100000);
  }
});

test('HEF bands: odd totals still sum exactly, invalid inputs throw', () => {
  const got = splitFunding(1, 100001);
  assert.equal(got.scholarship + got.loan + got.household, 100001);
  assert.throws(() => splitFunding(6, 1000), /band must be/);
  assert.throws(() => splitFunding(1, -5), /non-negative/);
});

test('bands route: split query, table query, and finance-only gate', async () => {
  const splitRes = await helbBands(financeReq(`${ORIGIN}/api/v1/finance/helb/bands?band=2&total=100000`, 'GET'));
  assert.equal(splitRes.status, 200);
  assert.deepEqual((await splitRes.json()).data.split, { scholarship: 60000, loan: 30000, household: 10000 });
  const tableRes = await helbBands(financeReq(`${ORIGIN}/api/v1/finance/helb/bands`, 'GET'));
  assert.equal((await tableRes.json()).data.bands['1'].scholarship, 70);
  const denied = await helbBands(studentReq(`${ORIGIN}/api/v1/finance/helb/bands`, 'GET'));
  assert.equal(denied.status, 403);
});

// ---- C2B ----

test('C2B: payment auto-posts with receipt and BillRef normalisation', () => {
  invoicesStore.push(testInvoice('INV-A2-TEST-01', 'stu-3', 'BBA/2022/4412', 'Test Student', 10000, '2026-09-01'));
  const result = postC2BPayment({ transId: 'A2T1', billRef: 'BBA20224412', amount: 4000, phone: '254712345678', postedBy: 'daraja-c2b@system' });
  assert.equal(result.status, 'posted');
  if (result.status !== 'posted') throw new Error('expected posted');
  assert.equal(result.posting.applied, 4000);
  assert.equal(result.balanceRemaining, 6000);
  assert.match(result.posting.receipt, /^RCP-C2B-/);
});

test('C2B: same TransID twice never double-credits', () => {
  const before = totalOutstandingBalance('stu-3');
  const result = postC2BPayment({ transId: 'A2T1', billRef: 'BBA/2022/4412', amount: 4000, phone: '254712345678', postedBy: 'daraja-c2b@system' });
  assert.equal(result.status, 'duplicate');
  assert.equal(totalOutstandingBalance('stu-3'), before);
});

test('C2B: unknown BillRef goes to the suspense queue, never dropped', () => {
  const before = suspenseQueueStore.length;
  const result = postC2BPayment({ transId: 'A2T-UNKNOWN', billRef: 'ZZZ9999', amount: 3000, phone: '254700000000', postedBy: 'daraja-c2b@system' });
  assert.equal(result.status, 'suspense');
  assert.equal(suspenseQueueStore.length, before + 1);
  assert.equal(suspenseQueueStore[suspenseQueueStore.length - 1].status, 'pending');
});

test('C2B: overpayment becomes credit, not a refund and not lost money', () => {
  const result = postC2BPayment({ transId: 'A2T2', billRef: 'BBA/2022/4412', amount: 8500, phone: '254712345678', postedBy: 'daraja-c2b@system' });
  assert.equal(result.status, 'posted');
  if (result.status !== 'posted') throw new Error('expected posted');
  assert.equal(result.posting.applied, 6000);
  assert.equal(result.posting.creditAdded, 2500);
  assert.equal(getCreditBalance('BBA/2022/4412'), 2500);
  assert.equal(totalOutstandingBalance('stu-3'), 0);
});

test('C2B: credit is applied to future fees when a new invoice appears', () => {
  invoicesStore.push(testInvoice('INV-A2-TEST-02', 'stu-3', 'BBA/2022/4412', 'Test Student', 1000, '2026-09-02'));
  const result = postC2BPayment({ transId: 'A2T3', billRef: 'BBA/2022/4412', amount: 100, phone: '254712345678', postedBy: 'daraja-c2b@system' });
  assert.equal(result.status, 'posted');
  if (result.status !== 'posted') throw new Error('expected posted');
  // 1000 of old credit settled the new invoice, then the new 100 had nowhere
  // to go and joined the credit: 2500 - 1000 + 100 = 1600.
  assert.equal(getCreditBalance('BBA/2022/4412'), 1600);
  assert.equal(totalOutstandingBalance('stu-3'), 0);
});

test('C2B route: secret auth, suspense acceptance, and malformed rejection', async () => {
  const saved = process.env.MPESA_CALLBACK_SECRET;
  process.env.MPESA_CALLBACK_SECRET = SECRET;
  try {
    const noToken = await c2bCallback(new Request(`${ORIGIN}/api/v1/finance/mpesa/c2b`, {
      method: 'POST', body: JSON.stringify({ TransID: 'X1', BillRefNumber: 'ZZZ1', TransAmount: '100' }),
    }) as any);
    assert.equal(noToken.status, 401);
    const ok = await c2bCallback(new Request(`${ORIGIN}/api/v1/finance/mpesa/c2b?token=${SECRET}`, {
      method: 'POST', body: JSON.stringify({ TransID: 'A2T-ROUTE', BillRefNumber: 'NOPE777', TransAmount: '700', MSISDN: '254700000001' }),
    }) as any);
    const okBody = await ok.json();
    assert.equal(ok.status, 200);
    assert.equal(okBody.ResultCode, 0);
    assert.ok(okBody.suspense_id);
    const bad = await c2bCallback(new Request(`${ORIGIN}/api/v1/finance/mpesa/c2b?token=${SECRET}`, {
      method: 'POST', body: JSON.stringify({ TransID: '', BillRefNumber: '', TransAmount: '0' }),
    }) as any);
    assert.equal((await bad.json()).ResultCode, 1);
  } finally {
    if (saved === undefined) delete process.env.MPESA_CALLBACK_SECRET;
    else process.env.MPESA_CALLBACK_SECRET = saved;
  }
});

// ---- HELB batch ----

test('HELB batch: credits matched rows, reports unmatched, and never double-credits', async () => {
  invoicesStore.push(testInvoice('INV-A2-TEST-03', 'stu-1', 'BIT/2023/8849', 'Faith Wanjiku', 20000, '2026-09-01'));
  const body = {
    batchId: 'HELB-A2-01',
    date: '2026-10-28',
    rows: [
      { admissionNumber: 'BIT/2023/8849', amount: 12000, band: 2 },
      { admissionNumber: 'NOPE123', amount: 5000 },
    ],
  };
  const first = await helbBatch(financeReq(`${ORIGIN}/api/v1/finance/helb/batch`, 'POST', body));
  const firstData = await first.json();
  assert.equal(first.status, 200);
  assert.equal(firstData.duplicate, false);
  assert.equal(firstData.data.creditedAmount, 12000);
  assert.equal(firstData.data.unmatchedAmount, 5000);
  assert.equal(firstData.data.rows[0].status, 'credited');
  assert.equal(firstData.data.rows[1].status, 'unmatched');
  const invoice = invoicesStore.find((i) => i.invoice_number === 'INV-A2-TEST-03')!;
  assert.equal(invoice.balance, 8000);

  const again = await helbBatch(financeReq(`${ORIGIN}/api/v1/finance/helb/batch`, 'POST', body));
  const againData = await again.json();
  assert.equal(againData.duplicate, true);
  assert.equal(invoicesStore.find((i) => i.invoice_number === 'INV-A2-TEST-03')!.balance, 8000);
});

test('HELB batch: malformed batches apply nothing, and finance gate holds', async () => {
  assert.throws(
    () => reconcileHelbBatch({ batchId: 'HELB-A2-BAD', date: '2026-10-28', rows: [], reconciledBy: 'finance@university.ac.ke' }),
    /At least one batch row/
  );
  assert.throws(
    () => reconcileHelbBatch({ batchId: 'HELB-A2-BAD2', date: '2026-10-28', rows: [{ admissionNumber: 'BIT/2023/8849', amount: -100 }], reconciledBy: 'finance@university.ac.ke' }),
    /positive amount/
  );
  const denied = await helbBatch(studentReq(`${ORIGIN}/api/v1/finance/helb/batch`, 'POST', { batchId: 'X', rows: [] }));
  assert.equal(denied.status, 403);
});

// ---- Export ----

test('enrolment export: CSV header, rows, funding band, and finance-only gate', async () => {
  const res = await helbExport(financeReq(`${ORIGIN}/api/v1/finance/helb/export`, 'GET'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/csv/);
  const csv = await res.text();
  const lines = csv.split('\n');
  assert.equal(lines[0], 'admission_number,full_name,programme,academic_period,enrolment_status,funding_band,fee_balance');
  const bitRow = lines.find((l) => l.startsWith('BIT/2023/8849,'));
  assert.ok(bitRow, 'BIT student row present');
  assert.match(bitRow, /Band 2/);
  const denied = await helbExport(studentReq(`${ORIGIN}/api/v1/finance/helb/export`, 'GET'));
  assert.equal(denied.status, 403);
});
