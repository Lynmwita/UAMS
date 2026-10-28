import { studentsStore } from '@/lib/academic/student-records';
import { allocatePayment } from './allocation';
import { suspenseQueueStore, normalizeBillRef } from './c2b';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * HEF/HELB funding bands, batch reconciliation and band assignment (A2).
 *
 * BAND SPLITS — the published HEF funding model: the loan share is constant
 * at 30% and the scholarship share falls as the household share rises, so
 * every band sums to exactly 100%. VERIFICATION NOTE (statutory-accuracy
 * rule): these percentages follow the widely published HEF model; re-verify
 * them against the current HELB/HEF schedule before production use, and
 * update this table — never another source — if the schedule changes.
 *
 *   Band 1 (most needy): 70% scholarship, 30% loan,  0% household
 *   Band 2:             60% scholarship, 30% loan, 10% household
 *   Band 3:             50% scholarship, 30% loan, 20% household
 *   Band 4:             40% scholarship, 30% loan, 30% household
 *   Band 5 (least needy):30% scholarship, 30% loan, 40% household
 *
 * Splits are computed in whole shillings with the remainder assigned to the
 * household portion, so scholarship + loan + household always equals the
 * total exactly (no shilling lost to rounding).
 *
 * BATCH RECONCILIATION — a disbursement batch (Batch ID, date, rows of
 * admission number + amount) is matched row by row to student records and
 * credited to invoices. Re-uploading the same Batch ID is recognised as a
 * duplicate and never double-credits. Rows matching no student are reported
 * as unmatched and held in the Suspense Queue, never silently dropped.
 * Rows are validated before any row is applied, so a malformed batch
 * applies nothing.
 */

export type HefBand = 1 | 2 | 3 | 4 | 5;

export const HEF_BAND_SPLITS: Record<HefBand, { scholarship: number; loan: number; household: number }> = {
  1: { scholarship: 70, loan: 30, household: 0 },
  2: { scholarship: 60, loan: 30, household: 10 },
  3: { scholarship: 50, loan: 30, household: 20 },
  4: { scholarship: 40, loan: 30, household: 30 },
  5: { scholarship: 30, loan: 30, household: 40 },
};

export type FundingSplit = { scholarship: number; loan: number; household: number };

export function splitFunding(band: number, total: number): FundingSplit {
  const split = HEF_BAND_SPLITS[band as HefBand];
  if (!split) throw new Error('band must be an integer from 1 to 5.');
  if (!Number.isFinite(total) || total < 0) throw new Error('total must be a non-negative number.');
  const scholarship = Math.round((total * split.scholarship) / 100);
  const loan = Math.round((total * split.loan) / 100);
  const household = total - scholarship - loan;
  return { scholarship, loan, household };
}

const runtime = globalThis as typeof globalThis & {
  __uams_helbBatchesStore?: HelbBatchResult[];
  __uams_fundingBandsStore?: Record<string, HefBand>;
};

export type HelbBatchRow = {
  admissionNumber: string;
  amount: number;
  band?: number;
};

export type HelbBatchRowResult = HelbBatchRow & {
  status: 'credited' | 'unmatched';
  applied: number;
  creditAdded: number;
  studentName: string | null;
};

export type HelbBatchResult = {
  batchId: string;
  date: string;
  rows: HelbBatchRowResult[];
  totalAmount: number;
  creditedAmount: number;
  unmatchedAmount: number;
  duplicate: boolean;
  reconciledAt: string;
  reconciledBy: string;
};

export const helbBatchesStore: HelbBatchResult[] =
  runtime.__uams_helbBatchesStore || (runtime.__uams_helbBatchesStore = []);

export const fundingBandsStore: Record<string, HefBand> =
  runtime.__uams_fundingBandsStore || (runtime.__uams_fundingBandsStore = {});

export function assignFundingBand(admissionNumber: string, band: number): void {
  if (!HEF_BAND_SPLITS[band as HefBand]) throw new Error('band must be an integer from 1 to 5.');
  fundingBandsStore[admissionNumber] = band as HefBand;
}

export function getFundingBand(admissionNumber: string): HefBand | null {
  return fundingBandsStore[admissionNumber] ?? null;
}

export type HelbBatchInput = {
  batchId: string;
  date: string;
  rows: HelbBatchRow[];
  reconciledBy: string;
};

export function reconcileHelbBatch(input: HelbBatchInput): HelbBatchResult {
  const batchId = String(input.batchId || '').trim();
  if (!batchId) throw new Error('Batch ID is required.');
  const existing = helbBatchesStore.find((b) => b.batchId === batchId);
  if (existing) return { ...existing, duplicate: true };

  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (rows.length === 0) throw new Error('At least one batch row is required.');
  if (rows.length > 5000) throw new Error('A batch may contain at most 5000 rows.');
  // Validate everything before applying anything (all-or-nothing).
  for (const row of rows) {
    if (!row || typeof row.admissionNumber !== 'string' || !row.admissionNumber.trim()) {
      throw new Error('Every batch row needs an admission number.');
    }
    if (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) {
      throw new Error('Every batch row needs a positive amount.');
    }
    if (row.band !== undefined && !HEF_BAND_SPLITS[row.band as HefBand]) {
      throw new Error('Batch row band must be an integer from 1 to 5.');
    }
  }

  const results: HelbBatchRowResult[] = [];
  let creditedAmount = 0;
  let unmatchedAmount = 0;
  for (const row of rows) {
    const amount = Number(row.amount);
    const wanted = normalizeBillRef(row.admissionNumber);
    const student = studentsStore.find((s) => normalizeBillRef(s.admission_number) === wanted) || null;
    if (!student) {
      unmatchedAmount += amount;
      suspenseQueueStore.push({
        id: `SUSP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        source: 'helb_batch',
        reference: row.admissionNumber,
        amount,
        detail: `HELB batch ${batchId}: no student matches admission ${row.admissionNumber}. Held for bursar review.`,
        receivedAt: new Date().toISOString(),
        status: 'pending',
      });
      results.push({ ...row, amount, status: 'unmatched', applied: 0, creditAdded: 0, studentName: null });
      continue;
    }
    if (row.band !== undefined) assignFundingBand(student.admission_number, row.band);
    const allocation = allocatePayment(student.id, student.admission_number, amount);
    creditedAmount += amount;
    results.push({
      ...row,
      amount,
      status: 'credited',
      applied: allocation.applied,
      creditAdded: allocation.creditAdded,
      studentName: `${student.first_name} ${student.last_name}`,
    });
  }

  const result: HelbBatchResult = {
    batchId,
    date: String(input.date || ''),
    rows: results,
    totalAmount: rows.reduce((sum, r) => sum + Number(r.amount), 0),
    creditedAmount,
    unmatchedAmount,
    duplicate: false,
    reconciledAt: new Date().toISOString(),
    reconciledBy: input.reconciledBy,
  };
  helbBatchesStore.push(result);
  recordAuditEvent({
    actor_email: input.reconciledBy,
    actor_role: 'finance_officer',
    action: 'HELB_BATCH_RECONCILED',
    entity_type: 'finance',
    entity_id: batchId,
    ip_address: '127.0.0.1',
    status: 'SUCCESS',
    details: {
      rows: results.length,
      credited_amount: creditedAmount,
      unmatched_amount: unmatchedAmount,
    },
  });
  return result;
}
