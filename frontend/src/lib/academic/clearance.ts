/**
 * UAMS Academic & Financial Clearance Business Logic Engine
 */

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
