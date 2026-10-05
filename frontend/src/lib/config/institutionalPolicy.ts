/**
 * UAMS Institutional Policy & Configuration Engine
 * Provides flexible, non-hardcoded rules for academic grading, assessment weighting,
 * attendance eligibility, and financial exam clearance.
 */

export interface AcademicPolicyConfig {
  catWeightPercentage: number; // e.g., 30 or 40
  examWeightPercentage: number; // e.g., 70 or 60
  attendanceEligibilityThreshold: number; // e.g., 75%
  examFeeClearanceThreshold: number; // e.g., 75% or 100%
  gradingScale: {
    minScore: number;
    maxScore: number;
    letterGrade: string;
    gradePoint: number;
    classification: string;
  }[];
}

export const DEFAULT_INSTITUTIONAL_POLICY: AcademicPolicyConfig = {
  catWeightPercentage: 30,
  examWeightPercentage: 70,
  attendanceEligibilityThreshold: 75,
  examFeeClearanceThreshold: 75,
  gradingScale: [
    { minScore: 70, maxScore: 100, letterGrade: 'A', gradePoint: 4.0, classification: 'First Class Honours / Distinction' },
    { minScore: 60, maxScore: 69, letterGrade: 'B', gradePoint: 3.0, classification: 'Second Class Honours (Upper Division) / Credit' },
    { minScore: 50, maxScore: 59, letterGrade: 'C', gradePoint: 2.0, classification: 'Second Class Honours (Lower Division) / Pass' },
    { minScore: 40, maxScore: 49, letterGrade: 'D', gradePoint: 1.0, classification: 'Pass' },
    { minScore: 0, maxScore: 39, letterGrade: 'E', gradePoint: 0.0, classification: 'Fail / Retake' },
  ],
};

/**
 * Calculates weighted total score based on configurable policy weights
 */
export function calculateWeightedScore(
  catRawScore: number,
  examRawScore: number,
  catOutOf = 30,
  examOutOf = 70,
  policy: AcademicPolicyConfig = DEFAULT_INSTITUTIONAL_POLICY
): {
  normalizedCat: number;
  normalizedExam: number;
  weightedTotal: number;
  grade: string;
  gradePoint: number;
  classification: string;
} {
  const normalizedCat = (Math.max(0, catRawScore) / catOutOf) * policy.catWeightPercentage;
  const normalizedExam = (Math.max(0, examRawScore) / examOutOf) * policy.examWeightPercentage;
  const weightedTotal = Math.round(normalizedCat + normalizedExam);

  const matchedGrade =
    policy.gradingScale.find((g) => weightedTotal >= g.minScore && weightedTotal <= g.maxScore) ||
    policy.gradingScale[policy.gradingScale.length - 1];

  return {
    normalizedCat: Math.round(normalizedCat * 10) / 10,
    normalizedExam: Math.round(normalizedExam * 10) / 10,
    weightedTotal,
    grade: matchedGrade.letterGrade,
    gradePoint: matchedGrade.gradePoint,
    classification: matchedGrade.classification,
  };
}

/**
 * Validates whether a student meets attendance and financial thresholds for exam admission
 */
export function validateExamEligibility(
  attendancePercentage: number,
  feePercentagePaid: number,
  policy: AcademicPolicyConfig = DEFAULT_INSTITUTIONAL_POLICY
): {
  isEligible: boolean;
  attendancePassed: boolean;
  financePassed: boolean;
  reasons: string[];
} {
  const attendancePassed = attendancePercentage >= policy.attendanceEligibilityThreshold;
  const financePassed = feePercentagePaid >= policy.examFeeClearanceThreshold;
  const reasons: string[] = [];

  if (!attendancePassed) {
    reasons.push(
      `Attendance (${attendancePercentage}%) is below the required ${policy.attendanceEligibilityThreshold}% threshold.`
    );
  }

  if (!financePassed) {
    reasons.push(
      `Fee payment (${feePercentagePaid}%) is below the required ${policy.examFeeClearanceThreshold}% clearance threshold.`
    );
  }

  return {
    isEligible: attendancePassed && financePassed,
    attendancePassed,
    financePassed,
    reasons,
  };
}
