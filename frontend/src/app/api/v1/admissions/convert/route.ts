import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { convertApplicantToStudent } from '@/lib/academic/admissions';

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const id = body.application_id || body.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'application_id is required in request body.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const result = convertApplicantToStudent(id, auth.user, ip);

    return NextResponse.json({
      success: true,
      message: result.alreadyConverted
        ? `Application was already converted to student ${result.student.admission_number}.`
        : `Applicant ${result.application.applicant_name} successfully converted to active student (${result.student.admission_number}).`,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to convert applicant to student' },
      { status: 400 }
    );
  }
}
