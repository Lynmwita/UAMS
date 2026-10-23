import { institutionalApi } from '@/lib/academic/institutional-api';
import { admissionsStore, generateAdmissionNumber } from '@/lib/academic/admissions';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'admissions');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const program = searchParams.get('program_code');
  const entryType = searchParams.get('entry_type');
  const search = searchParams.get('search')?.toLowerCase();

  let results = [...admissionsStore];
  if (status) results = results.filter((a) => a.status === status);
  if (program) results = results.filter((a) => a.program_code === program.toUpperCase());
  if (entryType) results = results.filter((a) => a.entry_type === entryType.toUpperCase());
  if (search) {
    results = results.filter(
      (a) =>
        a.applicant_name.toLowerCase().includes(search) ||
        a.reference_number.toLowerCase().includes(search) ||
        a.applicant_email.toLowerCase().includes(search) ||
        (a.kcse_index && a.kcse_index.toLowerCase().includes(search)) ||
        (a.admission_number && a.admission_number.toLowerCase().includes(search))
    );
  }

  return NextResponse.json({ success: true, total: results.length, data: results });
}

export async function POST(request: NextRequest) {
 const auth=await requireServerAuth(request,['super_admin','admin','registrar']);
 if('errorResponse' in auth)return auth.errorResponse;
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'admissions');
  try {
    const body = await request.json();
    const { applicant_name, applicant_email, applicant_phone, program_code, gender, date_of_birth, kcse_grade, kcse_points } = body;

    if (!applicant_name || !applicant_email || !applicant_phone || !program_code || !kcse_grade) {
      return NextResponse.json(
        { success: false, error: 'applicant_name, applicant_email, applicant_phone, program_code, and kcse_grade are required' },
        { status: 400 }
      );
    }
    const points = Number(kcse_points);
    if (!Number.isFinite(points) || points < 0 || points > 84) {
      return NextResponse.json({ success: false, error: 'kcse_points must be between 0 and 84.' }, { status: 400 });
    }
    if (!['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ success: false, error: 'gender must be male, female, or other.' }, { status: 400 });
    }

    const createdAt = new Date();
    const application = {
      id: `adm-${createdAt.getTime()}`,
      reference_number: `UADM-${createdAt.getFullYear()}-${String(admissionsStore.length + 1).padStart(4, '0')}`,
      applicant_name: String(applicant_name).trim(),
      applicant_email: String(applicant_email).trim().toLowerCase(),
      applicant_phone: String(applicant_phone).trim(),
      gender,
      date_of_birth: date_of_birth ? String(date_of_birth) : '',
      program_code: String(program_code).toUpperCase(),
      program_name: body.program_name || String(program_code).toUpperCase(),
      intake: body.intake || 'September',
      intake_year: Number(body.intake_year) || createdAt.getFullYear(),
      kcse_grade: String(kcse_grade).trim(),
      kcse_points: points,
      previous_institution: body.previous_institution || '',
      status: 'submitted' as const,
      submitted_at: createdAt.toISOString().slice(0, 10),
    };

    admissionsStore.push(application);

    recordAuditEvent({
      actor_email: application.applicant_email,
      actor_role: 'student',
      action: 'ADMISSION_APPLICATION_SUBMITTED',
      entity_type: 'admission_applications',
      entity_id: application.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { reference_number: application.reference_number, program_code: application.program_code },
    });

    return NextResponse.json(
      { success: true, message: `Application submitted. Your reference number is ${application.reference_number}.`, data: application },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'admissions');

  try {
    const body = await request.json();
    const { application_id, status } = body;
    const application = admissionsStore.find((a) => a.id === application_id);
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    }

    if (['under_review', 'shortlisted', 'admitted', 'rejected'].includes(status)) {
      application.status = status;
      application.reviewed_by = auth.user.email;
      application.reviewed_at = new Date().toISOString().slice(0, 10);

      if (status === 'admitted') {
        if (!application.admission_number) {
          const admittedCount = admissionsStore.filter((a) => a.admission_number && a.program_code === application.program_code).length;
          application.admission_number = generateAdmissionNumber(
            application.program_code,
            application.intake_year,
            admittedCount + 1
          );
        }
        recordAuditEvent({
          actor_email: auth.user.email,
          actor_role: auth.user.role,
          action: 'ADMISSION_APPLICANT_ADMITTED',
          entity_type: 'admission_applications',
          entity_id: application.id,
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
          status: 'SUCCESS',
          details: { admission_number: application.admission_number },
        });
        return NextResponse.json({ success: true, data: application, message: `Admitted as ${application.admission_number}.` });
      }
    } else {
      return NextResponse.json({ success: false, error: 'status must be under_review, shortlisted, admitted, or rejected.' }, { status: 400 });
    }

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'ADMISSION_APPLICATION_REVIEWED',
      entity_type: 'admission_applications',
      entity_id: application.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { new_status: status },
    });

    return NextResponse.json({ success: true, data: application });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
