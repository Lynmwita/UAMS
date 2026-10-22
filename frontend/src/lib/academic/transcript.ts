import { getAcademicStanding } from './gpa';
import type { UamsGrade } from './grades';
import type { PDFSemesterResult, PDFStudentInfo } from '@/lib/pdf/generator';

export function buildTranscript(student: PDFStudentInfo, records: UamsGrade[]) {
  const approved = records.filter(grade => grade.is_approved);
  const groups = new Map<string, UamsGrade[]>();
  for (const grade of approved) {
    // Legacy demonstrations are explicitly labelled, never assigned a fabricated
    // academic year. Institutional adapters supply the actual period metadata.
    const academicYear = grade.academic_year || 'Academic year not recorded';
    const semester = grade.semester_label || 'Semester not recorded';
    const key = JSON.stringify([academicYear, semester]);
    groups.set(key, [...(groups.get(key) || []), grade]);
  }
  const semesterResults: PDFSemesterResult[] = [...groups.entries()].sort(([a],[b]) => a.localeCompare(b,undefined,{numeric:true})).map(([key, grades]) => {
    const [academicYear, semesterLabel] = JSON.parse(key) as [string,string];
    const credits = grades.reduce((sum, grade) => sum + Number(grade.credit_hours), 0);
    const points = grades.reduce((sum, grade) => sum + Number(grade.credit_hours) * Number(grade.grade_point), 0);
    return {academicYear, semesterLabel,
      courses: grades.map(grade => ({courseCode:grade.course_code,courseTitle:grade.course_title,creditHours:Number(grade.credit_hours),
        catScore:Number(grade.cat_score),examScore:Number(grade.exam_score),totalScore:Number(grade.total_score),
        letterGrade:grade.letter_grade,gradePoint:Number(grade.grade_point)})),
      gpa: credits ? Number((points / credits).toFixed(2)) : 0,
      creditsEarned: grades.filter(grade => Number(grade.grade_point) > 0).reduce((sum,grade) => sum + Number(grade.credit_hours),0),
    };
  });
  const totalCredits = approved.reduce((sum,grade) => sum + Number(grade.credit_hours),0);
  const points = approved.reduce((sum,grade) => sum + Number(grade.credit_hours) * Number(grade.grade_point),0);
  const cumulativeGpa = totalCredits ? Number((points / totalCredits).toFixed(2)) : 0;
  return {student,semesterResults,cumulativeGpa,totalCredits,academicStanding:getAcademicStanding(cumulativeGpa)};
}
