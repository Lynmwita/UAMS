import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';

let registrationsStore = [
  {
    id: 'reg-1',
    student_id: 'stu-1',
    admission_number: 'BIT/2023/8849',
    student_name: 'Faith Wanjiku',
    course_code: 'BCS 311',
    course_title: 'Advanced Database Systems',
    status: 'approved',
    registered_at: '2026-09-10T10:00:00Z',
    approved_by: 'Registrar',
  },
  {
    id: 'reg-2',
    student_id: 'stu-2',
    admission_number: 'BCS/2023/1204',
    student_name: 'Kevin Otieno',
    course_code: 'BIT 312',
    course_title: 'Distributed Systems & Cloud Computing',
    status: 'pending',
    registered_at: '2026-09-12T14:30:00Z',
  },
];

export async function GET(request: NextRequest) {
  const auth = requireServerAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { user } = auth;
  let results = [...registrationsStore];

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

export async function POST(request: NextRequest) {
  const auth = requireServerAuth(request, ['student', 'registrar', 'admin', 'super_admin']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { user } = auth;

  try {
    const body = await request.json();
    const { course_code, course_title } = body;

    if (!course_code) {
      return NextResponse.json({ success: false, error: 'course_code is required' }, { status: 400 });
    }

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
      status: 'pending',
      registered_at: new Date().toISOString(),
    };

    registrationsStore.push(registration);
    return NextResponse.json(
      { success: true, message: 'Course registration submitted successfully', data: registration },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
