import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWeightedScore,
  validateExamEligibility,
  DEFAULT_INSTITUTIONAL_POLICY,
} from './institutionalPolicy.ts';

test('Policy Engine - Calculates default 30/70 weighted scores accurately', () => {
  const result = calculateWeightedScore(28, 62, 30, 70);
  assert.equal(result.weightedTotal, 90);
  assert.equal(result.grade, 'A');
  assert.equal(result.gradePoint, 4.0);
});

test('Policy Engine - Adapts dynamically to custom 40/60 weighting policies', () => {
  const customPolicy = {
    ...DEFAULT_INSTITUTIONAL_POLICY,
    catWeightPercentage: 40,
    examWeightPercentage: 60,
  };

  // Student scored full marks: 30/30 CAT, 70/70 Exam -> should scale to 40 + 60 = 100%
  const result = calculateWeightedScore(30, 70, 30, 70, customPolicy);
  assert.equal(result.weightedTotal, 100);
  assert.equal(result.grade, 'A');
});

test('Policy Engine - Validates exam eligibility against attendance & finance thresholds', () => {
  // Both passed (80% att, 90% fees with 75% thresholds)
  const cleared = validateExamEligibility(80, 90);
  assert.equal(cleared.isEligible, true);
  assert.equal(cleared.reasons.length, 0);

  // Attendance failed (70% < 75%)
  const attFailed = validateExamEligibility(70, 100);
  assert.equal(attFailed.isEligible, false);
  assert.equal(attFailed.attendancePassed, false);
  assert.equal(attFailed.financePassed, true);

  // Both failed
  const bothFailed = validateExamEligibility(60, 50);
  assert.equal(bothFailed.isEligible, false);
  assert.equal(bothFailed.reasons.length, 2);
});
