/**
 * UAMS Academic & Financial Clearance Business Logic Engine
 */

import { studentsStore } from './student-records';
import { invoicesStore } from '@/lib/finance/invoices';
import { registrationsStore } from './registrations';
import { computeStudentAttendance } from './attendance-store';
import { getStudentUnpaidFines, getLibraryPolicies } from '@/lib/library/store';
import type { ExamClearanceCard, ExamClearanceStatus, ExamWaiver } from '@/types';

/** Exam Pass rule shown on the Examinations page and applied to every demo card:
 * 100% of billed fees must be paid; any outstanding balance blocks the pass.
 * (The configurable institutional policy default is 75%; the exam-card rule
 * below is deliberately stricter and is stated on the page, not silent.) */
export const EXAM_CARD_CLEARANCE_THRESHOLD = 100;

export const WAIVER_TYPES = [
  'gov_disbursement_delay',
  'payment_plan',
  'scholarship',
  'other',
] as const;

const waiverRuntime = globalThis as typeof globalThis & {
  __uams_examWaivers?: ExamWaiver[];
};

/** In-memory waiver store (demo path). Institutional path persists via Supabase. */
export const examWaiversStore: ExamWaiver[] =
  waiverRuntime.__uams_examWaivers || (waiverRuntime.__uams_examWaivers = []);

/** Returns the active (non-revoked, non-expired) waiver for a student, or null. */
export function getActiveWaiver(student_id: string): ExamWaiver | null {
  const now = new Date();
  return (
    examWaiversStore.find(
      (w) => w.student_id === student_id && !w.is_revoked && new Date(w.valid_until) >= now
    ) || null
  );
}

/** Derives the display status: attendance blocks stand alone; waivers override fee blocks. */
export function deriveClearanceStatus(
  feeCleared: boolean,
  attendanceBlocked: boolean,
  waiver: ExamWaiver | null
): ExamClearanceStatus {
  if (attendanceBlocked) return 'blocked_attendance';
  if (waiver) return 'waived';
  return feeCleared ? 'cleared' : 'blocked_fee';
}

/**
 * Builds exam clearance cards from the ONE registry dataset, the invoice
 * ledger and the registration records, so clearance can never name a student
 * the registry does not hold. A student with no invoice has no balance billed
 * and is cleared; a student with any balance outstanding is blocked.
 */
export function buildExamClearanceCards(): ExamClearanceCard[] {
  // Attendance gate: computed once from recorded session details (never fabricated).
  // A student with no recorded sessions has percentage=null and is NOT blocked on attendance.
  const attendanceByAdm = new Map(computeStudentAttendance().map((st) => [st.adm, st]));
  return studentsStore.map((student) => {
    const invoices = invoicesStore.filter((i) => i.student_id === student.id);
    const totalBilled = invoices.reduce((sum, i) => sum + i.total_amount, 0);
    const amountPaid = invoices.reduce((sum, i) => sum + i.amount_paid, 0);
    const result = evaluateExamClearance(totalBilled, amountPaid, EXAM_CARD_CLEARANCE_THRESHOLD);
    const admissionSuffix = student.admission_number.replace(/[^A-Za-z0-9]/g, '-');
    const att = attendanceByAdm.get(student.admission_number);
    const attendance_blocked = !!att && att.is_blocked;
    const attendance_exempt = !!att && att.is_exempt;
    // Library fine block: driven by the library module. When the
    // block_clearance_on_fines policy is on and the student has unpaid
    // library fines, the card is blocked regardless of fee status.
    // Defaults to false (not blocked) when the policy is off or no fines exist.
    const libraryPolicies = getLibraryPolicies();
    const libraryFineBalance = getStudentUnpaidFines(student.admission_number);
    const libraryBlocked = libraryPolicies.block_clearance_on_fines && libraryFineBalance > 0;
    return {
      id: `clr-${student.id}`,
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_number: student.admission_number,
      program_name: student.program_name,
      semester_name: 'Sept-Dec 2026',
      card_serial_number: `EXAM-2026-SEP-${student.admission_number.slice(-4)}`,
      fee_balance: result.remainingBalance,
      fee_paid_percentage: result.percentagePaid,
      attendance_percentage: att?.percentage ?? null,
      attendance_blocked,
      attendance_exempt,
      security_qr_token: `QR-${student.admission_number}-2026SEP`,
      registered_units: registrationsStore.filter((r) => r.student_id === student.id).length,
      library_blocked: libraryBlocked,
      library_fine_balance: libraryFineBalance,
      ...(() => {
        const waiver = getActiveWaiver(student.id);
        const status = deriveClearanceStatus(result.isCleared, attendance_blocked, waiver);
        return {
          // A waived student may print their pass despite a fee balance.
          // Attendance and library blocks stand alone: waivers never override them.
          is_cleared: (status === 'cleared' || status === 'waived') && !attendance_blocked && !libraryBlocked,
          waiver: waiver
            ? {
                waiver_type: waiver.waiver_type,
                valid_until: waiver.valid_until,
                granted_by_email: waiver.granted_by_email,
              }
            : null,
          status,
        };
      })(),
    };
  });
}

export interface FeeClearanceResult {
  isCleared: boolean;
  percentagePaid: number;
  remainingBalance: number;
  reason: string;
}

export function evaluateExamClearance(
  totalBilled: number,
  amountPaid: number,
  minThresholdPercentage = 75
): FeeClearanceResult {
  if (totalBilled <= 0) {
    return {
      isCleared: true,
      percentagePaid: 100,
      remainingBalance: 0,
      reason: 'No fee balance billed.',
    };
  }

  const remainingBalance = Math.max(0, totalBilled - amountPaid);
  const percentagePaid = Math.round((amountPaid / totalBilled) * 100);

  if (percentagePaid >= minThresholdPercentage) {
    return {
      isCleared: true,
      percentagePaid,
      remainingBalance,
      reason: `Cleared for examinations (${percentagePaid}% paid, minimum required is ${minThresholdPercentage}%).`,
    };
  }

  return {
    isCleared: false,
    percentagePaid,
    remainingBalance,
    reason: `Clearance blocked: ${percentagePaid}% paid is below the mandatory ${minThresholdPercentage}% threshold. Balance: KES ${remainingBalance.toLocaleString()}`,
  };
}

export function calculateLibraryOverdueFine(
  dueDate: string,
  returnDate: string,
  ratePerDay = 10
): { overdueDays: number; fineAmount: number } {
  const due = new Date(dueDate).getTime();
  const returned = new Date(returnDate).getTime();

  if (returned <= due) {
    return { overdueDays: 0, fineAmount: 0 };
  }

  const diffMs = returned - due;
  const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const fineAmount = overdueDays * ratePerDay;

  return { overdueDays, fineAmount };
}

export function validateHostelBedAvailability(
  capacity: number,
  occupiedBeds: number
): { canAllocate: boolean; remainingBeds: number } {
  const remainingBeds = Math.max(0, capacity - occupiedBeds);
  return {
    canAllocate: remainingBeds > 0,
    remainingBeds,
  };
}
