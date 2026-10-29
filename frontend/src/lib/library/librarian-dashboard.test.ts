import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { shouldShowLibrarianDashboard, summarizeLibrary } from './librarian-dashboard';
import type { LibraryBook, LibraryLoan } from '@/types';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(HERE, '..', '..', 'app', 'dashboard');
const read = (name: string) => readFileSync(path.join(dashboardDir, name), 'utf8');

const book = (id: string, available: number): LibraryBook => ({
  id,
  isbn: '978-0000000000',
  title: 'Book ' + id,
  author: 'Author',
  publisher: 'Press',
  category: 'General',
  total_copies: 10,
  available_copies: available,
  shelf_location: 'S-1',
  is_ebook_available: false,
});

const loan = (id: string, status: LibraryLoan['status'], due: string): LibraryLoan => ({
  id,
  book_id: 'bk-1',
  book_title: 'Book ' + id,
  student_id: 'std-1',
  student_name: 'Borrower ' + id,
  admission_number: 'BIT/2023/0001',
  borrow_date: '2026-10-01',
  due_date: due,
  status,
});

test('librarian gating: only the librarian role gets the librarian dashboard', () => {
  assert.equal(shouldShowLibrarianDashboard('librarian'), true);
  for (const role of ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer', 'student']) {
    assert.equal(shouldShowLibrarianDashboard(role), false, role + ' must not get the librarian dashboard');
  }
});

test('summary: on-loan counts borrowed plus overdue, returned excluded, due-soon is a 7-day window', () => {
  const today = new Date(2026, 9, 28); // 2026-10-28
  const summary = summarizeLibrary(
    [book('a', 5), book('b', 3)],
    [
      loan('returned', 'returned', '2026-10-20'),
      loan('overdue-flag', 'overdue', '2026-10-04'),
      loan('borrowed-past-due', 'borrowed', '2026-10-20'),
      loan('due-soon', 'borrowed', '2026-10-31'),
      loan('due-later', 'borrowed', '2026-11-15'),
    ],
    today,
  );
  assert.equal(summary.onLoan, 4);
  assert.equal(summary.overdue, 2);
  assert.equal(summary.dueThisWeek, 1);
  assert.equal(summary.totalTitles, 2);
  assert.equal(summary.availableCopies, 8);
  assert.deepEqual(
    summary.overdueLoans.map((l) => l.id),
    ['overdue-flag', 'borrowed-past-due'],
    'overdue list sorted by due date',
  );
  assert.equal(summary.overdueLoans[0].daysOverdue, 24);
  assert.deepEqual(
    summary.dueSoonLoans.map((l) => l.id),
    ['due-soon'],
  );
  assert.equal(summary.reservationsTracked, false);
});

test('summary: empty library data gives zeros and empty lists, never fabricated numbers', () => {
  const summary = summarizeLibrary([], [], new Date(2026, 9, 28));
  assert.equal(summary.onLoan, 0);
  assert.equal(summary.overdue, 0);
  assert.equal(summary.dueThisWeek, 0);
  assert.equal(summary.totalTitles, 0);
  assert.equal(summary.availableCopies, 0);
  assert.deepEqual(summary.overdueLoans, []);
  assert.deepEqual(summary.dueSoonLoans, []);
});

// Terms that must never appear in the librarian dashboard: institution totals,
// course lists, money figures, or registrar events.
const FORBIDDEN = [
  'fee clearance',
  'finance',
  'enrolment',
  'enrolled',
  'active students',
  'faculty and staff',
  'course catalogue',
  'account balance',
  'registration',
];

test('librarian dashboard source contains zero forbidden content', () => {
  const source = read('LibrarianDashboard.tsx').toLowerCase();
  for (const term of FORBIDDEN) {
    assert.ok(!source.includes(term), 'librarian dashboard must not contain: ' + term);
  }
  for (const marker of ['books on loan', 'overdue books', 'due back this week', '/dashboard/library']) {
    assert.ok(source.includes(marker), 'librarian dashboard must contain: ' + marker);
  }
});

test('both dashboard entry points route the librarian to the librarian dashboard', () => {
  const demo = read('DashboardExperience.tsx');
  assert.ok(demo.includes("role === 'librarian'") && demo.includes('LibrarianDashboard'));
  const institutional = read('InstitutionalDashboard.tsx');
  assert.ok(institutional.includes("role === 'librarian'") && institutional.includes('LibrarianDashboard'));
});

test('other roles dashboards are unchanged', () => {
  const demo = read('DashboardExperience.tsx');
  for (const marker of ['InstitutionalDashboard', "role === 'student'", "role === 'finance_officer'", "role === 'lecturer'", 'Active students']) {
    assert.ok(demo.includes(marker), 'demo dashboard lost content for other roles: ' + marker);
  }
  const institutional = read('InstitutionalDashboard.tsx');
  assert.ok(institutional.includes("role==='finance_officer'") && institutional.includes("role==='lecturer'"));
});

test('every quick-action link on the librarian dashboard points at a real page', () => {
  const source = read('LibrarianDashboard.tsx');
  const hrefs = [...source.matchAll(/href="(\/dashboard\/[a-z]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 4, 'expected quick-action links, found: ' + hrefs.join(', '));
  for (const href of new Set(hrefs)) {
    const page = path.join(dashboardDir, href.replace('/dashboard/', ''), 'page.tsx');
    assert.ok(existsSync(page), 'quick-action link has no page: ' + href);
  }
});
