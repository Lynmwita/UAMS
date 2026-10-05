import { NextRequest, NextResponse } from 'next/server';
import { calculateGradePoint, getAcademicStanding } from '@/lib/academic/gpa';

let gradesStore = [
  {
    id: 'grd-1',
    student_id: 'stu-1',
    student_name: 'Faith Wanjiku',
    admission_number: 'BIT/2023/8849',
    course_code: 'BCS 311',
    course_title: 'Advanced Database Systems',
    credit_hours: 3,
    cat_score: 28,
    exam_score: 62,
    total_score: 90,
    letter_grade: 'A',
    grade_point: 4.0,
    is_submitted: true,
    is_approved: true,
  },
  {
    id: 'grd-2',
    student_id: 'stu-1',
    student_name: 'Faith Wanjiku',
    admission_number: 'BIT/2023/8849',
    course_code: 'BIT 312',
    course_title: 'Distributed Systems & Cloud Computing',
    credit_hours: 3,
    cat_score: 26,
    exam_score: 58,
    total_score: 84,
    letter_grade: 'A',
    grade_point: 4.0,
    is_submitted: true,
    is_approved: true,
  },
  {
    id: 'grd-3',
    student_id: 'stu-1',
    student_name: 'Faith Wanjiku',
    admission_number: 'BIT/2023/8849',
    course_code: 'BCS 314',
    course_title: 'Software Engineering Architecture',
    credit_hours: 4,
    cat_score: 24,
    exam_score: 52,
    total_score: 76,
    letter_grade: 'B',
    grade_point: 3.0,
    is_submitted: true,
    is_approved: true,
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id');
  const courseCode = searchParams.get('course_code');

  let results = [...gradesStore];
  if (studentId) {
    results = results.filter((g) => g.student_id === studentId);
  }
  if (courseCode) {
    results = results.filter((g) => g.course_code === courseCode);
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    data: results,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, student_name, admission_number, course_code, course_title, credit_hours, cat_score, exam_score } = body;

    if (!student_id || !course_code || cat_score === undefined || exam_score === undefined) {
      return NextResponse.json(
        { success: false, error: 'student_id, course_code, cat_score, and exam_score are required' },
        { status: 400 }
      );
    }

    const cat = Math.min(30, Math.max(0, Number(cat_score)));
    const exam = Math.min(70, Math.max(0, Number(exam_score)));
    const total = cat + exam;
    const { letter, points } = calculateGradePoint(total);

    const newGrade = {
      id: `grd-${Date.now()}`,
      student_id,
      student_name: student_name || 'Enrolled Student',
      admission_number: admission_number || 'BIT/2023/8849',
      course_code,
      course_title: course_title || course_code,
      credit_hours: Number(credit_hours) || 3,
      cat_score: cat,
      exam_score: exam,
      total_score: total,
      letter_grade: letter,
      grade_point: points,
      is_submitted: true,
      is_approved: false, // requires senate/registrar approval
    };

    gradesStore.push(newGrade);

    return NextResponse.json({
      success: true,
      message: 'Grade entered successfully and submitted for senate approval',
      data: newGrade,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
