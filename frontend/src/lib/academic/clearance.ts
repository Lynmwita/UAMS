/**
 * UAMS Academic & Financial Clearance Business Logic Engine
 */

import { studentsStore } from './student-records';
import { invoicesStore } from '@/lib/finance/invoices';
import { registrationsStore } from './registrations';
import type { ExamClearanceCard } from '@/types';

/** Exam Pass rule shown on the Examinations page and applied to every demo card:
 * 100% of billed fees must be paid; any outstanding balance blocks the pass.
 * (The configurable institutional policy default is 75%; the exam-card rule
 * below is deliberately stricter and is stated on the page, not silent.) */
export const EXAM_CARD_CLEARANCE_THRESHOLD = 100;

/**
 * Builds exam clearance cards from the ONE registry dataset, the invoice
 * ledger and the registration records, so clearance can never name a student
 * the registry does not hold. A student with no invoice has no balance billed
 * and is cleared; a student with any balance outstanding is blocked.
 */
export function buildExamClearanceCards(): ExamClearanceCard[] {
  return studentsStore.map((student) => {
    const invoices = invoicesStore.filter((i) => i.student_id === student.id);
    const totalBilled = invoices.reduce((sum, i) => sum + i.total_amount, 0);
    const amountPaid = invoices.reduce((sum, i) => sum + i.amount_paid, 0);
    const result = evaluateExamClearance(totalBilled, amountPaid, EXAM_CARD_CLEARANCE_THRESHOLD);
    const admissionSuffix = student.admission_number.replace(/[^A-Za-z0-9]/g, '-');
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
      is_cleared: result.isCleared,
      security_qr_token: `UAMS-SEC-CLR-${admissionSuffix}-VALID-2026`,
      registered_units: registrationsStore.filter((r) => r.student_id === student.id).length,
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
