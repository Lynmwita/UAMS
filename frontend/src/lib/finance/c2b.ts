import { studentsStore } from '@/lib/academic/student-records';
import { allocatePayment, getCreditBalance } from './allocation';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * Daraja C2B paybill auto-posting (A2 remainder).
 *
 * A customer pays to the paybill; Daraja sends a Confirmation callback with
 * BillRefNumber. When BillRefNumber is a student's admission/registration
 * number, the payment auto-posts to that student account and an automatic
 * receipt is generated. TransID idempotency is mandatory: the same TransID
 * posted twice is recognised as a duplicate and never double-credits.
 * A BillRefNumber matching no student goes to the Suspense Queue for bursar
 * review — never silently dropped.
 *
 * BillRef matching is normalised (case-insensitive, non-alphanumerics
 * ignored) because paybill references are typed on phones: "BIT/2023/8849"
 * and "BIT20238849" are the same reference.
 *
 * Persistence: demo/in-memory stores below (same globalThis pattern as the
 * other finance stores). Institutional persistence belongs behind the
 * uams_workflow RPC; until it gains C2B operations, institutional callers
 * of the route fail closed. Nothing here calls Daraja outbound and no live
 * provider call happens in tests.
 */

const runtime = globalThis as typeof globalThis & {
  __uams_c2bPostingsStore?: C2BPosting[];
  __uams_suspenseQueueStore?: SuspenseRecord[];
};

export type C2BPosting = {
  transId: string;
  billRef: string;
  admissionNumber: string;
  studentId: string;
  studentName: string;
  amount: number;
  phone: string;
  receipt: string;
  applied: number;
  creditAdded: number;
  postedAt: string;
  postedBy: string;
};

export type SuspenseRecord = {
  id: string;
  source: 'c2b' | 'helb_batch';
  reference: string;
  amount: number;
  detail: string;
  receivedAt: string;
  status: 'pending' | 'resolved';
};

export const c2bPostingsStore: C2BPosting[] =
  runtime.__uams_c2bPostingsStore || (runtime.__uams_c2bPostingsStore = []);

export const suspenseQueueStore: SuspenseRecord[] =
  runtime.__uams_suspenseQueueStore || (runtime.__uams_suspenseQueueStore = []);

export function normalizeBillRef(ref: string): string {
  return String(ref || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function findStudentByBillRef(billRef: string) {
  const wanted = normalizeBillRef(billRef);
  if (!wanted) return null;
  return (
    studentsStore.find((s) => normalizeBillRef(s.admission_number) === wanted) ||
    null
  );
}

export type C2BPostInput = {
  transId: string;
  billRef: string;
  amount: number;
  phone: string;
  postedBy: string;
};

export type C2BPostResult =
  | { status: 'posted'; duplicate: false; posting: C2BPosting; balanceRemaining: number; creditRemaining: number }
  | { status: 'duplicate'; duplicate: true; posting: C2BPosting }
  | { status: 'suspense'; duplicate: false; suspense: SuspenseRecord };

export function postC2BPayment(input: C2BPostInput): C2BPostResult {
  const transId = String(input.transId || '').trim();
  const billRef = String(input.billRef || '').trim();
  const amount = Number(input.amount);
  if (!transId) throw new Error('TransID is required.');
  if (!billRef) throw new Error('BillRefNumber is required.');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
    throw new Error('amount must be a positive number.');
  }

  const existing = c2bPostingsStore.find((p) => p.transId === transId);
  if (existing) return { status: 'duplicate', duplicate: true, posting: existing };

  const student = findStudentByBillRef(billRef);
  if (!student) {
    const record: SuspenseRecord = {
      id: `SUSP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      source: 'c2b',
      reference: billRef,
      amount,
      detail: `No student matches BillRef ${billRef} (TransID ${transId}). Held for bursar review.`,
      receivedAt: new Date().toISOString(),
      status: 'pending',
    };
    suspenseQueueStore.push(record);
    recordAuditEvent({
      actor_email: input.postedBy,
      actor_role: 'finance_officer',
      action: 'C2B_PAYMENT_SUSPENSE',
      entity_type: 'finance',
      entity_id: transId,
      ip_address: '127.0.0.1',
      status: 'SUCCESS',
      details: { billRef, amount, suspense_id: record.id },
    });
    return { status: 'suspense', duplicate: false, suspense: record };
  }

  const allocation = allocatePayment(student.id, student.admission_number, amount);
  const posting: C2BPosting = {
    transId,
    billRef,
    admissionNumber: student.admission_number,
    studentId: student.id,
    studentName: `${student.first_name} ${student.last_name}`,
    amount,
    phone: String(input.phone || ''),
    receipt: `RCP-C2B-${Date.now()}`,
    applied: allocation.applied,
    creditAdded: allocation.creditAdded,
    postedAt: new Date().toISOString(),
    postedBy: input.postedBy,
  };
  c2bPostingsStore.push(posting);
  recordAuditEvent({
    actor_email: input.postedBy,
    actor_role: 'finance_officer',
    action: 'C2B_PAYMENT_POSTED',
    entity_type: 'finance',
    entity_id: transId,
    ip_address: '127.0.0.1',
    status: 'SUCCESS',
    details: {
      admission_number: student.admission_number,
      amount,
      applied: allocation.applied,
      credit_added: allocation.creditAdded,
      receipt: posting.receipt,
    },
  });
  return {
    status: 'posted',
    duplicate: false,
    posting,
    balanceRemaining: allocation.balanceRemaining,
    creditRemaining: getCreditBalance(student.admission_number),
  };
}
