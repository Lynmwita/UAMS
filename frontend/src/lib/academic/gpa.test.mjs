import test from 'node:test';
import assert from 'node:assert';

function calculateSemesterGPA(items) {
  if (!items || items.length === 0) {
    return { totalCredits: 0, totalGradePoints: 0, gpa: 0.0 };
  }
  const totalCredits = items.reduce((sum, item) => sum + item.creditHours, 0);
  const totalGradePoints = items.reduce(
    (sum, item) => sum + item.gradePoint * item.creditHours,
    0
  );
  const gpa = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0.0;
  return { totalCredits, totalGradePoints: Number(totalGradePoints.toFixed(2)), gpa };
}

function determineStanding(cgpa) {
  if (cgpa >= 3.7) return 'First Class Distinction';
  if (cgpa >= 3.0) return 'Upper Second Class Honors';
  if (cgpa >= 2.0) return 'Lower Second Class Honors';
  if (cgpa >= 1.0) return 'Pass';
  return 'Academic Probation';
}

test('GPA Engine - Computes accurate 4.0 weighted semester GPA', () => {
  const courses = [
    { courseCode: 'CSC101', creditHours: 3, gradePoint: 4.0 }, // 12
    { courseCode: 'CSC102', creditHours: 4, gradePoint: 3.5 }, // 14
    { courseCode: 'MAT101', creditHours: 3, gradePoint: 3.0 }, // 9
  ];
  // Total credits = 10, Total Grade Points = 35 -> GPA = 3.50
  const result = calculateSemesterGPA(courses);
  assert.strictEqual(result.totalCredits, 10);
  assert.strictEqual(result.totalGradePoints, 35.0);
  assert.strictEqual(result.gpa, 3.5);
});

test('Academic Standing - Classifies Honors and Distinctions correctly', () => {
  assert.strictEqual(determineStanding(3.85), 'First Class Distinction');
  assert.strictEqual(determineStanding(3.2), 'Upper Second Class Honors');
  assert.strictEqual(determineStanding(2.4), 'Lower Second Class Honors');
  assert.strictEqual(determineStanding(0.8), 'Academic Probation');
});
