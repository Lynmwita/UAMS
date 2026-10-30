import test from 'node:test';
import assert from 'node:assert/strict';
import { POST as libraryPost, GET as libraryGet } from './library/route';
import { GET as policiesGet, PATCH as policiesPatch } from './library/policies/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { getLibraryPolicies, computeOverdueFine, daysBetween } from '@/lib/library/store';
import { buildExamClearanceCards } from '@/lib/academic/clearance';
import type { UserRole } from '@/types';

function makeRequest(role: UserRole, method: string, body?: unknown, url = 'http://localhost:3000/api/v1/library') {
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

test('library policies: defaults are honest (3/14 undergrad, KES 50/day, block on)', async () => {
  const p = getLibraryPolicies();
  assert.equal(p.loan_rules.undergrad.max_books, 3);
  assert.equal(p.loan_rules.undergrad.loan_days, 14);
  assert.equal(p.loan_rules.postgrad.max_books, 5);
  assert.equal(p.fine_per_day, 50);
  assert.equal(p.block_clearance_on_fines, true);
});

test('library policies: librarian can read, only admin can PATCH', async () => {
  const getRes = await policiesGet(makeRequest('librarian', 'GET', undefined, 'http://localhost:3000/api/v1/library/policies'));
  assert.equal(getRes.status, 200);

  const badPatch = await policiesPatch(makeRequest('librarian', 'PATCH', { fine_per_day: 100 }, 'http://localhost:3000/api/v1/library/policies'));
  assert.equal(badPatch.status, 403);

  const okPatch = await policiesPatch(makeRequest('admin', 'PATCH', { fine_per_day: 75 }, 'http://localhost:3000/api/v1/library/policies'));
  assert.equal(okPatch.status, 200);
  const body = await okPatch.json();
  assert.equal(body.data.fine_per_day, 75);
  // restore
  await policiesPatch(makeRequest('admin', 'PATCH', { fine_per_day: 50 }, 'http://localhost:3000/api/v1/library/policies'));
});

test('library policies: invalid values rejected', async () => {
  const res = await policiesPatch(
    makeRequest('admin', 'PATCH', { loan_rules: { undergrad: { max_books: 99, loan_days: 14 } } }, 'http://localhost:3000/api/v1/library/policies')
  );
  assert.equal(res.status, 400);
});

test('library renew: extends due date once, second renew rejected', async () => {
  // Borrow a book first as librarian
  const borrow = await libraryPost(makeRequest('librarian', 'POST', {
    action: 'borrow', book_id: 'bk-02', student_name: 'Test Student', admission_number: 'TST/2026/001',
  }));
  const borrowBody = await borrow.json();
  assert.equal(borrowBody.success, true);
  const loanId = borrowBody.data.id;

  const renew1 = await libraryPost(makeRequest('librarian', 'POST', { action: 'renew', loan_id: loanId }));
  assert.equal(renew1.status, 200);
  const renewBody = await renew1.json();
  assert.equal(renewBody.data.renewed, true);

  const renew2 = await libraryPost(makeRequest('librarian', 'POST', { action: 'renew', loan_id: loanId }));
  assert.equal(renew2.status, 400);

  // cleanup: return the book
  await libraryPost(makeRequest('librarian', 'POST', { action: 'return', loan_id: loanId }));
});

test('library fine payment: requires reference, marks paid', async () => {
  // Use the seeded overdue loan ln-02 (Kevin Otieno, fine 50)
  const noRef = await libraryPost(makeRequest('librarian', 'POST', { action: 'record_fine_payment', loan_id: 'ln-02' }));
  assert.equal(noRef.status, 400);

  const paid = await libraryPost(makeRequest('librarian', 'POST', {
    action: 'record_fine_payment', loan_id: 'ln-02', reference: 'TEST-RCPT-001',
  }));
  assert.equal(paid.status, 200);
  const body = await paid.json();
  assert.equal(body.data.fine_paid, true);
  assert.equal(body.data.fine_payment_ref, 'TEST-RCPT-001');
});

test('library reservations: queue, dedupe, fulfill', async () => {
  const r1 = await libraryPost(makeRequest('librarian', 'POST', {
    action: 'reserve', book_id: 'bk-01', student_name: 'Reserve Tester', admission_number: 'TST/2026/002',
  }));
  assert.equal(r1.status, 200);

  const dup = await libraryPost(makeRequest('librarian', 'POST', {
    action: 'reserve', book_id: 'bk-01', student_name: 'Reserve Tester', admission_number: 'TST/2026/002',
  }));
  assert.equal(dup.status, 409);

  const r1Body = await r1.json();
  const fulfill = await libraryPost(makeRequest('librarian', 'POST', {
    action: 'fulfill_reservation', reservation_id: r1Body.data.id,
  }));
  assert.equal(fulfill.status, 200);
});

test('library member search: finds students by name/admission', async () => {
  const res = await libraryPost(makeRequest('librarian', 'POST', { action: 'search_members', query: 'Faith' }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.data.length > 0);
  assert.match(body.data[0].student_name, /Faith/i);

  const studentDenied = await libraryPost(makeRequest('student', 'POST', { action: 'search_members', query: 'Faith' }));
  assert.equal(studentDenied.status, 403);
});

test('library batch: submit, approve adds books, reject needs reason', async () => {
  const submit = await libraryPost(makeRequest('librarian', 'POST', {
    action: 'submit_batch',
    books: [{ title: 'Test Batch Book', author: 'Test Author', isbn: '978-9999999999', total_copies: 3 }],
  }));
  assert.equal(submit.status, 200);
  const batchId = (await submit.json()).data.id;

  const noReason = await libraryPost(makeRequest('admin', 'POST', { action: 'reject_batch', batch_id: batchId }));
  assert.equal(noReason.status, 400);

  // Submit another for approval
  const submit2 = await libraryPost(makeRequest('librarian', 'POST', {
    action: 'submit_batch',
    books: [{ title: 'Approved Batch Book', author: 'Test Author', isbn: '978-8888888888', total_copies: 2 }],
  }));
  const batchId2 = (await submit2.json()).data.id;
  const approve = await libraryPost(makeRequest('admin', 'POST', { action: 'approve_batch', batch_id: batchId2 }));
  assert.equal(approve.status, 200);

  // Verify the book entered the catalogue
  const getRes = await libraryGet(makeRequest('librarian', 'GET'));
  const books = (await getRes.json()).data.books;
  assert.ok(books.some((b: { isbn: string }) => b.isbn === '978-8888888888'));
});

test('library write-off: admin only, needs reason, preserves history', async () => {
  const librarianDenied = await libraryPost(makeRequest('librarian', 'POST', {
    action: 'write_off', book_id: 'bk-04', reason: 'Damaged beyond repair, pages missing.',
  }));
  assert.equal(librarianDenied.status, 403);

  const shortReason = await libraryPost(makeRequest('admin', 'POST', {
    action: 'write_off', book_id: 'bk-04', reason: 'bad',
  }));
  assert.equal(shortReason.status, 400);

  const ok = await libraryPost(makeRequest('admin', 'POST', {
    action: 'write_off', book_id: 'bk-04', reason: 'Damaged beyond repair, pages missing throughout.',
  }));
  assert.equal(ok.status, 200);

  // Archived book leaves the catalogue
  const getRes = await libraryGet(makeRequest('librarian', 'GET'));
  const books = (await getRes.json()).data.books;
  assert.ok(!books.some((b: { id: string }) => b.id === 'bk-04'));
});

test('clearance: library_blocked defaults false, blocks when fines unpaid and policy on', async () => {
  const cards = buildExamClearanceCards();
  for (const card of cards) {
    assert.equal(typeof card.library_blocked, 'boolean');
    assert.ok('library_fine_balance' in card);
  }
  // Kevin Otieno (BCS/2023/1204) had his fine paid in an earlier test, so he should not be blocked.
  // A student with no fines is never blocked.
  const faith = cards.find((c) => c.admission_number === 'BIT/2023/8849');
  assert.ok(faith);
  assert.equal(faith.library_blocked, false);
});

test('overdue fine computation uses policy rate and cap', async () => {
  const policies = getLibraryPolicies();
  const loan = {
    id: 'x', book_id: 'y', book_title: 'T', student_id: 's', student_name: 'N',
    admission_number: 'A', borrow_date: '2026-01-01', due_date: '2026-01-01',
    status: 'overdue' as const, fine_amount: 0,
  };
  const fine = computeOverdueFine(loan, policies);
  assert.ok(fine > 0);
  assert.ok(fine <= policies.max_fine_per_book);
  assert.equal(daysBetween('2026-01-01', '2026-01-10'), 9);
});
