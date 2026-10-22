import { institutionalApi } from '@/lib/academic/institutional-api';
import { coursesStore } from '@/lib/academic/course-catalog';
import { registrationsStore } from '@/lib/academic/registrations';
import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { canTeachCourse, canReviewCourse } from '@/lib/auth/scope';
import { approveCourseRegistrations } from '@/lib/academic/registration-approval';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['student','admin','super_admin','registrar','hod','lecturer']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'courses/register');

  const { user } = auth;
  let results = registrationsStore.filter(r => canTeachCourse(user,r.course_code) && canReviewCourse(user,r.course_code));

  if (user.role === 'student') {
    results = results.filter(
      (r) => r.student_id === user.id || (user.email === 'student@university.ac.ke' && r.student_id === 'stu-1')
    );
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    data: results,
  });
}

export async function PATCH(request: NextRequest) {
  return approveCourseRegistrations(request, 'single');
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['student', 'registrar', 'admin', 'super_admin']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'courses/register');

  const { user } = auth;

  try {
    const body = await request.json();
    const { course_code, course_title } = body;

    if (!course_code) {
      return NextResponse.json({ success: false, error: 'course_code is required' }, { status: 400 });
    }

    if(!coursesStore.some(c=>c.code===course_code&&c.is_active))return NextResponse.json({success:false,error:'Choose an active course from the catalogue.'},{status:400});
    // IDOR / BOLA Prevention: Students cannot submit registrations on behalf of other students
    const effectiveStudentId = user.role === 'student' ? user.id : body.student_id || user.id;
    const effectiveAdmission =
      user.role === 'student'
        ? user.email === 'student@university.ac.ke'
          ? 'BIT/2023/8849'
          : `STU/${user.id.slice(-4)}`
        : body.admission_number || 'ADM/2026/001';
    const effectiveName =
      user.role === 'student'
        ? user.email === 'student@university.ac.ke'
          ? 'Faith Wanjiku'
          : 'Enrolled Student'
        : body.student_name || 'Enrolled Student';

    const registration = {
      id: `reg-${Date.now()}`,
      student_id: effectiveStudentId,
      admission_number: effectiveAdmission,
      student_name: effectiveName,
      course_code,
      course_title: course_title || course_code,
      status: 'pending' as const,
      registered_at: new Date().toISOString(),
    };

    if (registrationsStore.some(r => r.course_code === course_code && (r.student_id === effectiveStudentId || r.admission_number === effectiveAdmission))) return NextResponse.json({success:false,error:'This course is already registered.'},{status:409});

    registrationsStore.push(registration);
    return NextResponse.json(
      { success: true, message: 'Course registration submitted successfully', data: registration },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
