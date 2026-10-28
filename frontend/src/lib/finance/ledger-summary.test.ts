import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLedgerTotals,
  formatKES,
  perStudentStatements,
  resolveDemoStudent,
  studentStatement,
} from './ledger-summary';
import { invoicesStore } from './invoices';
import { studentsStore } from '../academic/student-records';
import { GET as financeSummary } from '../../app/api/v1/finance/summary/route';
import { GET as reports } from '../../app/api/v1/reports/route';
import { GET as studentInvoices } from '../../app/api/v1/finance/invoices/[student_id]/route';
import { createSignedToken } from '../auth/server-auth';

const ORIGIN = 'http://localhost:3000';

function req(url: string, token: string) {
  return new Request(url, {
    headers: { Authorization: `Bearer ${token}`, Origin: ORIGIN },
  }) as any;
}

function financeToken() {
  return createSignedToken({ id: 'usr-finance-ledger', email: 'finance@university.ac.ke', role: 'finance_officer' });
}
function studentToken(id: string, email: string) {
  return createSignedToken({ id, email, role: 'student' });
}

// The demo invoice ledger, as seeded in src/lib/finance/invoices.ts:
// Faith Wanjiku INV-2026-0001: 52,500 invoiced, 52,500 paid, 0 balance.
// Kevin Otieno INV-2026-0002: 59,000 invoiced, 40,500 paid, 18,500 balance.
// Brian Kiprono: no invoices. Totals: 111,500 / 93,000 / 18,500.

test('one ledger: institutional totals come from the invoice records', () => {
  const totals = computeLedgerTotals(invoicesStore);
  assert.equal(totals.invoiced, 111500);
  assert.equal(totals.collected, 93000);
  assert.equal(totals.outstanding, 18500);
  assert.equal(totals.invoiced - totals.collected, totals.outstanding);
  assert.equal(totals.invoices_issued, 2);
  assert.equal(totals.settled_invoices, 1);
  assert.equal(totals.partial_invoices, 1);
});

test('one ledger: per-student statements sum back to the institutional totals', () => {
  const statements = perStudentStatements(invoicesStore, studentsStore);
  const byId = new Map(statements.map((s) => [s.student_id, s]));
  assert.equal(byId.get('stu-1')?.invoiced, 52500);
  assert.equal(byId.get('stu-1')?.outstanding, 0);
  assert.equal(byId.get('stu-2')?.invoiced, 59000);
  assert.equal(byId.get('stu-2')?.collected, 40500);
  assert.equal(byId.get('stu-2')?.outstanding, 18500);
  assert.equal(byId.get('stu-3')?.invoiced, 0);
  assert.equal(byId.get('stu-3')?.invoices_issued, 0);
  const summed = statements.reduce(
    (acc, s) => ({ invoiced: acc.invoiced + s.invoiced, collected: acc.collected + s.collected, outstanding: acc.outstanding + s.outstanding }),
    { invoiced: 0, collected: 0, outstanding: 0 }
  );
  assert.deepEqual(summed, { invoiced: 111500, collected: 93000, outstanding: 18500 });
});

test('student statement contains only that student invoices', () => {
  const faith = studentStatement(invoicesStore, 'stu-1');
  assert.deepEqual(faith.totals, {
    invoiced: 52500, collected: 52500, outstanding: 0,
    invoices_issued: 1, settled_invoices: 1, partial_invoices: 0,
  });
  assert.deepEqual(faith.invoices.map((i) => i.invoice_number), ['INV-2026-0001']);
  const kevin = studentStatement(invoicesStore, 'stu-2');
  assert.equal(kevin.totals.outstanding, 18500);
  assert.deepEqual(kevin.invoices.map((i) => i.invoice_number), ['INV-2026-0002']);
});

test('one currency: KES in full, never KSh and never abbreviated', () => {
  assert.equal(formatKES(111500), 'KES 111,500');
  assert.equal(formatKES(18500), 'KES 18,500');
  assert.equal(formatKES(0), 'KES 0');
  assert.ok(!formatKES(111500).includes('KSh'));
  assert.ok(!formatKES(128400000).includes('M'));
});

test('student resolver matches own record and never resolves staff', () => {
  assert.equal(resolveDemoStudent({ id: 'usr-kevin', email: 'kevin.otieno@student.university.ac.ke', role: 'student' }, studentsStore)?.id, 'stu-2');
  assert.equal(resolveDemoStudent({ id: 'usr-student-01', email: 'student@university.ac.ke', role: 'student' }, studentsStore)?.id, 'stu-1');
  assert.equal(resolveDemoStudent({ id: 'usr-unknown', email: 'nobody@university.ac.ke', role: 'student' }, studentsStore), null);
  assert.equal(resolveDemoStudent({ id: 'usr-finance-ledger', email: 'finance@university.ac.ke', role: 'finance_officer' }, studentsStore), null);
});

test('finance summary API: staff see institutional totals, students see only their own statement', async () => {
  const staffRes = await financeSummary(req('http://localhost:3000/api/v1/finance/summary', financeToken()));
  const staff = await staffRes.json();
  assert.equal(staffRes.status, 200);
  assert.equal(staff.scope, 'institutional');
  assert.deepEqual(staff.totals, {
    invoiced: 111500, collected: 93000, outstanding: 18500,
    invoices_issued: 2, settled_invoices: 1, partial_invoices: 1,
  });

  const kevinRes = await financeSummary(req('http://localhost:3000/api/v1/finance/summary', studentToken('usr-kevin', 'kevin.otieno@student.university.ac.ke')));
  const kevin = await kevinRes.json();
  assert.equal(kevinRes.status, 200);
  assert.equal(kevin.scope, 'student');
  assert.equal(kevin.student.admission_number, 'BCS/2023/1204');
  assert.deepEqual(kevin.totals, {
    invoiced: 59000, collected: 40500, outstanding: 18500,
    invoices_issued: 1, settled_invoices: 0, partial_invoices: 1,
  });
  assert.deepEqual(kevin.invoices.map((i: { invoice_number: string }) => i.invoice_number), ['INV-2026-0002']);
  assert.equal('statements' in kevin, false);
  assert.ok(!JSON.stringify(kevin).includes('INV-2026-0001'));
  assert.ok(!JSON.stringify(kevin).includes('Faith'));
});

test('finance summary and reports totals agree on the one ledger', async () => {
  const summary = await (await financeSummary(req('http://localhost:3000/api/v1/finance/summary', financeToken()))).json();
  const report = await (await reports(req('http://localhost:3000/api/v1/reports', financeToken()))).json();
  assert.equal(report.success, true);
  assert.deepEqual(report.data.financeTotals, summary.totals);
});

test('invoice endpoint: a student cannot read another student invoices', async () => {
  const forbidden = await studentInvoices(
    req('http://localhost:3000/api/v1/finance/invoices/stu-1', studentToken('usr-kevin', 'kevin.otieno@student.university.ac.ke')),
    { params: Promise.resolve({ student_id: 'stu-1' }) } as any
  );
  assert.equal(forbidden.status, 403);
  const own = await studentInvoices(
    req('http://localhost:3000/api/v1/finance/invoices/stu-2', studentToken('usr-kevin', 'kevin.otieno@student.university.ac.ke')),
    { params: Promise.resolve({ student_id: 'stu-2' }) } as any
  );
  const ownBody = await own.json();
  assert.equal(own.status, 200);
  assert.deepEqual(ownBody.data.invoices.map((i: { invoice_number: string }) => i.invoice_number), ['INV-2026-0002']);
});
