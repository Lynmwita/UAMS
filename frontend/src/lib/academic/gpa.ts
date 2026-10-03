export interface GradeScoreItem {
  courseCode: string;
  creditHours: number;
  gradePoint: number;
}

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

export function determineStanding(cgpa: number): string {
  if (cgpa >= 3.7) return 'First Class Distinction';
  if (cgpa >= 3.0) return 'Upper Second Class Honors';
  if (cgpa >= 2.0) return 'Lower Second Class Honors';
  if (cgpa >= 1.0) return 'Pass';
  return 'Academic Probation';
}
