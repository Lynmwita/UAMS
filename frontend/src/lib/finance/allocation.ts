import { invoicesStore, upsertStudentInvoice } from './invoices';

/**
 * Shared payment allocation + student credit ledger (A2 remainder).
 *
 * How money moves, in order, for every payment (C2B or HELB batch row):
 *  1. Any existing credit on the student's account is applied to outstanding
 *     invoices first, so credit never idles while a balance exists.
 *  2. The new payment is applied across the student's outstanding invoices,
 *     oldest first, via upsertStudentInvoice.
 *  3. Any excess over what is owed stays as CREDIT on the student's account
 *     (user-decided overpayment rule, 2026-10-28), to be applied to future
 *     fees. It is never refunded and never dropped.
 *
 * Persistence: demo/in-memory stores below, following the same globalThis
 * pattern as invoicesStore/bankDepositsStore. Institutional persistence
 * belongs behind the uams_workflow RPC (see the finance routes); until the
 * workflow gains these operations, institutional callers fail closed and
 * nothing is recorded as if it succeeded.
 */

const runtime = globalThis as typeof globalThis & {
  __uams_creditBalancesStore?: Record<string, number>;
};

export const creditBalancesStore: Record<string, number> =
  runtime.__uams_creditBalancesStore || (runtime.__uams_creditBalancesStore = {});

export function getCreditBalance(admissionNumber: string): number {
  return creditBalancesStore[admissionNumber] || 0;
}

export function totalOutstandingBalance(studentId: string): number {
  return invoicesStore
    .filter((i) => i.student_id === studentId && i.balance > 0)
    .reduce((sum, i) => sum + i.balance, 0);
}

export type AllocationResult = {
  /** Amount of the NEW payment applied to invoices. */
  applied: number;
  /** Amount of PRE-EXISTING credit consumed by outstanding invoices. */
  creditConsumed: number;
  /** Amount of the new payment that became credit (overpayment). */
  creditAdded: number;
  /** Credit balance remaining on the account after this allocation. */
  creditRemaining: number;
  /** Total outstanding balance remaining after this allocation. */
  balanceRemaining: number;
  /** Invoice numbers touched by this allocation. */
  invoicesTouched: string[];
};

/** Apply existing credit to outstanding invoices. Returns credit consumed. */
export function applyCredit(studentId: string, admissionNumber: string): number {
  let credit = getCreditBalance(admissionNumber);
  if (credit <= 0) return 0;
  let consumed = 0;
  while (credit > 0) {
    const invoice = invoicesStore
      .filter((i) => i.student_id === studentId && i.balance > 0)
      .sort((a, b) => a.issued_at.localeCompare(b.issued_at))[0];
    if (!invoice) break;
    const chunk = Math.min(credit, invoice.balance);
    const updated = upsertStudentInvoice(studentId, chunk);
    if (!updated) break;
    credit -= chunk;
    consumed += chunk;
  }
  creditBalancesStore[admissionNumber] = credit;
  return consumed;
}

/**
 * Allocate a new payment for a student. Oldest outstanding invoices first;
 * excess becomes credit (never refunded, never lost).
 */
export function allocatePayment(
  studentId: string,
  admissionNumber: string,
  amount: number
): AllocationResult {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number.');
  }
  const creditConsumed = applyCredit(studentId, admissionNumber);
  let remaining = amount;
  let applied = 0;
  const invoicesTouched: string[] = [];
  while (remaining > 0) {
    const invoice = invoicesStore
      .filter((i) => i.student_id === studentId && i.balance > 0)
      .sort((a, b) => a.issued_at.localeCompare(b.issued_at))[0];
    if (!invoice) break;
    const chunk = Math.min(remaining, invoice.balance);
    const updated = upsertStudentInvoice(studentId, chunk);
    if (!updated) break;
    invoicesTouched.push(updated.invoice_number);
    remaining -= chunk;
    applied += chunk;
  }
  const creditAdded = remaining;
  if (creditAdded > 0) {
    creditBalancesStore[admissionNumber] =
      getCreditBalance(admissionNumber) + creditAdded;
  }
  return {
    applied,
    creditConsumed,
    creditAdded,
    creditRemaining: getCreditBalance(admissionNumber),
    balanceRemaining: totalOutstandingBalance(studentId),
    invoicesTouched,
  };
}
