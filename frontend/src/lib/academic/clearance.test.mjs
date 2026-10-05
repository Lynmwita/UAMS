import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateExamClearance,
  calculateLibraryOverdueFine,
  validateHostelBedAvailability,
} from './clearance.ts';

test('Exam Clearance Engine - Validates fee thresholds correctly', () => {
  // 100% paid
  const full = evaluateExamClearance(50000, 50000, 75);
  assert.equal(full.isCleared, true);
  assert.equal(full.percentagePaid, 100);
  assert.equal(full.remainingBalance, 0);

  // 80% paid (above 75% threshold)
  const partialCleared = evaluateExamClearance(50000, 40000, 75);
  assert.equal(partialCleared.isCleared, true);
  assert.equal(partialCleared.percentagePaid, 80);
  assert.equal(partialCleared.remainingBalance, 10000);

  // 50% paid (below 75% threshold -> blocked)
  const blocked = evaluateExamClearance(50000, 25000, 75);
  assert.equal(blocked.isCleared, false);
  assert.equal(blocked.percentagePaid, 50);
  assert.equal(blocked.remainingBalance, 25000);
});

test('Library Fine Engine - Calculates accurate overdue rates', () => {
  // Returned on time
  const onTime = calculateLibraryOverdueFine('2026-10-01', '2026-10-01', 10);
  assert.equal(onTime.fineAmount, 0);
  assert.equal(onTime.overdueDays, 0);

  // 5 days late at 10 KES/day
  const late = calculateLibraryOverdueFine('2026-10-01', '2026-10-06', 10);
  assert.equal(late.overdueDays, 5);
  assert.equal(late.fineAmount, 50);
});

test('Hostel Engine - Verifies bed capacity limits', () => {
  const available = validateHostelBedAvailability(4, 2);
  assert.equal(available.canAllocate, true);
  assert.equal(available.remainingBeds, 2);

  const full = validateHostelBedAvailability(4, 4);
  assert.equal(full.canAllocate, false);
  assert.equal(full.remainingBeds, 0);
});
