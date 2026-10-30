import type {
  LibraryBook,
  LibraryLoan,
  LibraryReservation,
  LibraryCatalogBatch,
  LibraryPolicies,
} from '@/types';
import { studentsStore } from '@/lib/academic/student-records';

/**
 * Shared library module stores (demo path). Single source of truth for the
 * library API routes, the clearance engine, and the admin analytics.
 * Uses the globalThis pattern so Vercel serverless instances share state
 * within a warm instance (same as other UAMS demo stores).
 */

const seedBooks: LibraryBook[] = [
  { id: 'bk-01', isbn: '978-0131103627', title: 'The C Programming Language (2nd Edition)', author: 'Brian Kernighan, Dennis Ritchie', publisher: 'Prentice Hall', category: 'Computer Science', total_copies: 15, available_copies: 12, shelf_location: 'CS-ST1-04', is_ebook_available: true },
  { id: 'bk-02', isbn: '978-0134685991', title: 'Effective Java (3rd Edition)', author: 'Joshua Bloch', publisher: 'Addison-Wesley', category: 'Software Engineering', total_copies: 10, available_copies: 7, shelf_location: 'SE-ST2-11', is_ebook_available: true },
  { id: 'bk-03', isbn: '978-0262033848', title: 'Introduction to Algorithms (CLRS)', author: 'Thomas Cormen, Charles Leiserson', publisher: 'MIT Press', category: 'Algorithms', total_copies: 20, available_copies: 0, shelf_location: 'AL-ST3-01', is_ebook_available: false },
  { id: 'bk-04', isbn: '978-1449331818', title: 'Learning Python (5th Edition)', author: 'Mark Lutz', publisher: "O'Reilly Media", category: 'Data Science', total_copies: 8, available_copies: 5, shelf_location: 'PY-ST1-09', is_ebook_available: true },
];

const seedLoans: LibraryLoan[] = [
  { id: 'ln-01', book_id: 'bk-01', book_title: 'The C Programming Language (2nd Edition)', student_id: 'std-01', student_name: 'Faith Wanjiku', admission_number: 'BIT/2023/8849', borrow_date: '2026-09-15', due_date: '2026-09-29', return_date: '2026-09-28', status: 'returned', fine_amount: 0 },
  { id: 'ln-02', book_id: 'bk-03', book_title: 'Introduction to Algorithms (CLRS)', student_id: 'std-02', student_name: 'Kevin Otieno', admission_number: 'BCS/2023/1204', borrow_date: '2026-09-20', due_date: '2026-10-04', status: 'overdue', fine_amount: 50 },
];

const seedReservations: LibraryReservation[] = [
  {
    id: 'rsv-01',
    book_id: 'bk-03',
    book_title: 'Introduction to Algorithms (CLRS)',
    student_id: 'std-01',
    student_name: 'Faith Wanjiku',
    admission_number: 'BIT/2023/8849',
    reserved_date: '2026-10-25',
    status: 'queued',
  },
];

const defaultPolicies: LibraryPolicies = {
  loan_rules: {
    undergrad: { max_books: 3, loan_days: 14 },
    postgrad: { max_books: 5, loan_days: 30 },
    staff: { max_books: 5, loan_days: 30 },
  },
  fine_per_day: 50,
  max_fine_per_book: 2000,
  lost_book_fee: 1500,
  block_clearance_on_fines: true,
  updated_at: new Date().toISOString(),
};

type Runtime = typeof globalThis & {
  __uams_libraryBooks?: LibraryBook[];
  __uams_libraryLoans?: LibraryLoan[];
  __uams_libraryReservations?: LibraryReservation[];
  __uams_libraryBatches?: LibraryCatalogBatch[];
  __uams_libraryPolicies?: LibraryPolicies;
};

const rt = globalThis as Runtime;

export const libraryBooksStore: LibraryBook[] =
  rt.__uams_libraryBooks || (rt.__uams_libraryBooks = [...seedBooks]);

export const libraryLoansStore: LibraryLoan[] =
  rt.__uams_libraryLoans || (rt.__uams_libraryLoans = [...seedLoans]);

export const libraryReservationsStore: LibraryReservation[] =
  rt.__uams_libraryReservations || (rt.__uams_libraryReservations = [...seedReservations]);

export const libraryBatchesStore: LibraryCatalogBatch[] =
  rt.__uams_libraryBatches || (rt.__uams_libraryBatches = []);

export function getLibraryPolicies(): LibraryPolicies {
  if (!rt.__uams_libraryPolicies) rt.__uams_libraryPolicies = { ...defaultPolicies, loan_rules: { ...defaultPolicies.loan_rules } };
  return rt.__uams_libraryPolicies;
}

export function setLibraryPolicies(patch: Partial<LibraryPolicies>): LibraryPolicies {
  const current = getLibraryPolicies();
  const next: LibraryPolicies = {
    ...current,
    ...patch,
    loan_rules: { ...current.loan_rules, ...(patch.loan_rules || {}) },
    updated_at: new Date().toISOString(),
  };
  rt.__uams_libraryPolicies = next;
  return next;
}

/** Days between two YYYY-MM-DD dates (positive when end is after start). */
export function daysBetween(startYmd: string, endYmd: string): number {
  const ms = new Date(endYmd).getTime() - new Date(startYmd).getTime();
  return Math.floor(ms / 86400000);
}

export function todayYmd(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Computes the overdue fine for a loan using the configured policy.
 * Never fabricates: returns 0 for returned loans or loans not yet overdue.
 */
export function computeOverdueFine(loan: LibraryLoan, policies: LibraryPolicies): number {
  if (loan.status === 'returned' || loan.fine_paid) return 0;
  const daysLate = daysBetween(loan.due_date, todayYmd());
  if (daysLate <= 0) return 0;
  return Math.min(daysLate * policies.fine_per_day, policies.max_fine_per_book);
}

/** Refreshes status/fine_amount on all open loans. Call on every GET. */
export function refreshLoanStates(): void {
  const policies = getLibraryPolicies();
  const today = todayYmd();
  for (const loan of libraryLoansStore) {
    if (loan.status === 'returned' || loan.fine_paid) continue;
    if (daysBetween(loan.due_date, today) > 0) {
      loan.status = 'overdue';
    }
    loan.fine_amount = computeOverdueFine(loan, policies);
  }
}

/** Total UNPAID library fines for a student (by admission number). */
export function getStudentUnpaidFines(admissionNumber: string): number {
  refreshLoanStates();
  return libraryLoansStore
    .filter((l) => l.admission_number === admissionNumber && !l.fine_paid)
    .reduce((sum, l) => sum + (l.fine_amount || 0), 0);
}

/** Total COLLECTED (paid) library fines. */
export function getCollectedFinesTotal(): number {
  return libraryLoansStore
    .filter((l) => l.fine_paid)
    .reduce((sum, l) => sum + (l.fine_amount || 0), 0);
}

/** Active students from the registry are automatically library members. */
export function getLibraryMemberStudents() {
  return studentsStore.filter((s) => (s.status || '').toLowerCase() === 'active');
}
