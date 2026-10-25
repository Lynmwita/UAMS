import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { convertApplicantToStudent } from '@/lib/academic/admissions';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Application ID is required' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  try {
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
