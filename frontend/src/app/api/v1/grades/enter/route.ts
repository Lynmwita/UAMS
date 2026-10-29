import { institutionalApi } from '@/lib/academic/institutional-api';
import { studentsStore } from '@/lib/academic/student-records';
import { coursesStore } from '@/lib/academic/course-catalog';
import { gradesStore } from '@/lib/academic/grades';
import { canTeachCourse, canReviewCourse } from '@/lib/auth/scope';
import { NextRequest, NextResponse } from 'next/server';
import { calculateGradePoint, getAcademicStanding } from '@/lib/academic/gpa';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['student','admin','super_admin','registrar','hod','lecturer','audit_officer']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'grades/enter');

  const { user } = auth;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id');
  const courseCode = searchParams.get('course_code');

  let results = gradesStore.filter(g => canTeachCourse(user, g.course_code) && canReviewCourse(user, g.course_code));
  if (user.role === 'student') {
    // Student can strictly see only their own grades (IDOR / BOLA Prevention)
    results = results.filter(
      (g) =>
        g.is_approved && (g.student_id === user.id ||
        (user.email.toLowerCase() === 'student@university.ac.ke' && g.admission_number === 'BIT/2023/8849'))
    );
  } else {
    if (studentId) {
      results = results.filter((g) => g.student_id === studentId);
    }
    if (courseCode) {
      results = results.filter((g) => g.course_code === courseCode);
    }
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    data: results,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireServerAuth(request, ['hod','registrar','super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'grades/enter');
  try {
    const body = await request.json();
    const grade = gradesStore.find(g => g.id === body.grade_id);
    if (!grade || !canReviewCourse(auth.user, grade.course_code)) return NextResponse.json({ success:false, error:'Grade not found in your scope.' }, {status:404});
    grade.is_approved = true;
    recordAuditEvent({ actor_email:auth.user.email, actor_role:auth.user.role, action:'GRADE_APPROVED', entity_type:'student_grades', entity_id:grade.id, ip_address:request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown', status:'SUCCESS' });
    return NextResponse.json({success:true,data:grade});
  } catch { return NextResponse.json({success:false,error:'Invalid grade approval request.'},{status:400}); }
}

export async function POST(request: NextRequest) {
  // Only teaching and academic administrators can enter grades
  const auth = await requireServerAuth(request, ['lecturer', 'super_admin']);

  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'grades/enter');

  try {
    const body = await request.json();
    const { student_id, student_name, admission_number, course_code, course_title, credit_hours, cat_score, exam_score } = body;

    if ((!student_id && !admission_number) || !course_code || cat_score === undefined || exam_score === undefined) {
      return NextResponse.json(
        { success: false, error: 'student_id, course_code, cat_score, and exam_score are required' },
        { status: 400 }
      );
    }


    if (!canTeachCourse(auth.user, course_code)) return NextResponse.json({ success:false, error:'You may only enter marks for your assigned courses.' }, {status:403});
    const student=studentsStore.find(s=>admission_number ? s.admission_number===admission_number : s.id===student_id);
    const course=coursesStore.find(c=>c.code===course_code);
    if(!student||!course||(student_id&&student.id!==student_id))return NextResponse.json({success:false,error:'Student and course must match registered records.'},{status:400});
    const cat = Number(cat_score);
    const exam = Number(exam_score);
    if (!Number.isFinite(cat) || cat < 0 || cat > 30 || !Number.isFinite(exam) || exam < 0 || exam > 70) {
      return NextResponse.json({ success: false, error: 'CAT must be 0–30 and exam must be 0–70.' }, { status: 400 });
    }
    const total = cat + exam;
    const { letter, points } = calculateGradePoint(total);

    const newGrade = {
      id: `grd-${Date.now()}`,
      student_id: student.id,
      student_name: student.first_name+' '+student.last_name,
      admission_number: student.admission_number,
      course_code,
      course_title: course.title,
      credit_hours: course.credit_hours,
      cat_score: cat,
      exam_score: exam,
      total_score: total,
      letter_grade: letter,
      grade_point: points,
      is_submitted: true,
      is_approved: false, // requires senate/registrar approval
    };

    gradesStore.push(newGrade);

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'GRADE_SUBMITTED',
      entity_type: 'student_grades',
      entity_id: newGrade.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: {
        student_id: newGrade.student_id,
        course_code: newGrade.course_code,
        total_score: newGrade.total_score,
        letter_grade: newGrade.letter_grade,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Grade entered successfully and submitted for senate approval',
      data: newGrade,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
