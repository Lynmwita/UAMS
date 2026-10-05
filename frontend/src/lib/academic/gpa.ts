export interface GradeScoreItem {
  courseCode: string;
  creditHours: number;
  gradePoint: number;
}

/**
 * Maps numeric percentage mark (0-100) to official University Letter Grade and 4.0 Grade Point
 */
export function calculateGradePoint(score: number): { letter: string; points: number } {
  const normalized = Math.min(100, Math.max(0, Number(score) || 0));
  if (normalized >= 70) return { letter: 'A', points: 4.0 };
  if (normalized >= 60) return { letter: 'B', points: 3.0 };
  if (normalized >= 50) return { letter: 'C', points: 2.0 };
  if (normalized >= 40) return { letter: 'D', points: 1.0 };
  return { letter: 'E', points: 0.0 };
}

/**
 * Computes credit-weighted Semester GPA and summary totals
 */
export function calculateSemesterGPA(items: GradeScoreItem[]): {
  totalCredits: number;
  totalGradePoints: number;
  gpa: number;
} {
  if (!items || items.length === 0) {
    return { totalCredits: 0, totalGradePoints: 0, gpa: 0.0 };
  }

  const totalCredits = items.reduce((sum, item) => sum + item.creditHours, 0);
  const totalGradePoints = items.reduce(
    (sum, item) => sum + item.gradePoint * item.creditHours,
    0
  );

  const gpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0.0;

  return {
    totalCredits,
    totalGradePoints: Number(totalGradePoints.toFixed(2)),
    gpa,
  };
}

/**
 * Classifies degree honors and senate academic standing
 */
export function determineStanding(cgpa: number): string {
  if (cgpa >= 3.7) return 'First Class Distinction';
  if (cgpa >= 3.0) return 'Upper Second Class Honors';
  if (cgpa >= 2.0) return 'Lower Second Class Honors';
  if (cgpa >= 1.0) return 'Pass';
  return 'Academic Probation';
}

export const getAcademicStanding = determineStanding;
