import type { LibraryBook, LibraryLoan } from '@/types';

/**
 * Librarian dashboard summary, computed only from the library module's own
 * data: the book catalogue and the current loans. Nothing here reads academic,
 * staff, or money records, so the librarian view can never surface them.
 */

export function shouldShowLibrarianDashboard(role: string): boolean {
  return role === 'librarian';
}

export interface LibrarianLoanRow {
  id: string;
  bookTitle: string;
  borrower: string;
  admissionNumber: string;
  dueDate: string;
  daysOverdue: number;
}

export interface LibrarianSummary {
  onLoan: number;
  overdue: number;
  dueThisWeek: number;
  totalTitles: number;
  availableCopies: number;
  overdueLoans: LibrarianLoanRow[];
  dueSoonLoans: LibrarianLoanRow[];
  /** The library module has no holds shelf yet, so this is always false. */
  reservationsTracked: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse a YYYY-MM-DD date as a local midnight date (no timezone shift). */
function parseDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toRow(loan: LibraryLoan, today: Date): LibrarianLoanRow {
  const due = parseDay(loan.due_date);
  const daysOverdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / DAY_MS));
  return {
    id: loan.id,
    bookTitle: loan.book_title,
    borrower: loan.student_name,
    admissionNumber: loan.admission_number,
    dueDate: loan.due_date,
    daysOverdue,
  };
}

export function summarizeLibrary(
  books: LibraryBook[],
  loans: LibraryLoan[],
  todayInput: Date = new Date(),
): LibrarianSummary {
  const today = new Date(todayInput.getFullYear(), todayInput.getMonth(), todayInput.getDate());
  const weekEnd = new Date(today.getTime() + 7 * DAY_MS);

  const isOverdue = (loan: LibraryLoan): boolean => {
    if (loan.status === 'overdue') return true;
    return loan.status === 'borrowed' && parseDay(loan.due_date) < today;
  };
  const isDueSoon = (loan: LibraryLoan): boolean => {
    if (loan.status !== 'borrowed') return false;
    const due = parseDay(loan.due_date);
    return due >= today && due <= weekEnd;
  };

  const active = loans.filter((loan) => loan.status === 'borrowed' || loan.status === 'overdue');
  const overdueLoans = loans
    .filter(isOverdue)
    .map((loan) => toRow(loan, today))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  const dueSoonLoans = loans
    .filter(isDueSoon)
    .map((loan) => toRow(loan, today))
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));

  return {
    onLoan: active.length,
    overdue: overdueLoans.length,
    dueThisWeek: dueSoonLoans.length,
    totalTitles: books.length,
    availableCopies: books.reduce((sum, book) => sum + book.available_copies, 0),
    overdueLoans,
    dueSoonLoans,
    reservationsTracked: false,
  };
}
