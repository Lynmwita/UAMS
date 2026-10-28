/**
 * Single source of truth for finance totals.
 *
 * Every finance surface (the Finance page, the Reports totals and the
 * finance summary API) must derive its figures from the invoice ledger
 * records through the helpers in this module, never from hardcoded
 * component state. The demo ledger is `invoicesStore`; the institutional
 * path reads the same shape from `uams_invoice_records` and reduces it
 * with the identical `computeLedgerTotals` logic (see reports route).
 *
 * Currency is always KES, written in full (e.g. "KES 111,500"). Never
 * the alternate shilling abbreviation, never abbreviated "M"/"k"
 * forms: an abbreviated figure cannot be traced back to ledger records.
 */
import type { UamsInvoice } from './invoices';
import type { StudentRecord } from '../academic/student-records';

export type LedgerTotals = {
  invoiced: number;
  collected: number;
  outstanding: number;
  invoices_issued: number;
  settled_invoices: number;
  partial_invoices: number;
};

/** Format a whole-KES amount in full, e.g. 111500 -> "KES 111,500". */
export function formatKES(amount: number): string {
  if (!Number.isFinite(amount)) return 'KES 0';
  return `KES ${amount.toLocaleString('en-KE')}`;
}

/**
 * Reduce invoice ledger records to totals. `collected` is the sum of
 * amounts allocated to invoices; `outstanding` is the sum of the
 * invoices' own balances, so invoiced - collected === outstanding
 * whenever the ledger records are internally consistent.
 */
export function computeLedgerTotals(invoices: UamsInvoice[]): LedgerTotals {
  return {
    invoiced: invoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
    collected: invoices.reduce((sum, i) => sum + Number(i.amount_paid), 0),
    outstanding: invoices.reduce((sum, i) => sum + Number(i.balance), 0),
    invoices_issued: invoices.length,
    settled_invoices: invoices.filter((i) => i.status === 'settled').length,
    partial_invoices: invoices.filter((i) => i.status === 'partial').length,
  };
}

/** One student's slice of the ledger: only their own invoices and totals. */
export function studentStatement(invoices: UamsInvoice[], studentId: string) {
  const own = invoices.filter((i) => i.student_id === studentId);
  return { invoices: own, totals: computeLedgerTotals(own) };
}

/** Per-student ledger statements, for the institutional (staff) view only. */
export function perStudentStatements(invoices: UamsInvoice[], students: StudentRecord[]) {
  return students.map((student) => {
    const { invoices: own, totals } = studentStatement(invoices, student.id);
    return {
      student_id: student.id,
      admission_number: student.admission_number,
      student_name: `${student.first_name} ${student.last_name}`,
      invoices_issued: totals.invoices_issued,
      invoiced: totals.invoiced,
      collected: totals.collected,
      outstanding: totals.outstanding,
    };
  });
}

export type DemoStudentUser = { id: string; email: string; role: string };

/**
 * Resolve the demo student record belonging to a signed-in student.
 * Matches, in order: the record's user_id, the record's email, or the
 * single generic demo student account (student@university.ac.ke ->
 * stu-1). Returns null when nothing matches, so a student who cannot
 * be matched to a record sees nothing instead of another student's
 * statement. Staff roles never resolve through this helper.
 */
export function resolveDemoStudent(
  user: DemoStudentUser,
  students: StudentRecord[]
): StudentRecord | null {
  if (user.role !== 'student') return null;
  const email = user.email.toLowerCase();
  return (
    students.find((s) => s.user_id === user.id) ||
    students.find((s) => s.email.toLowerCase() === email) ||
    (email === 'student@university.ac.ke'
      ? students.find((s) => s.id === 'stu-1') || null
      : null)
  );
}
