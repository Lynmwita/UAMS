import { NextRequest, NextResponse } from 'next/server';
import { admissionsStore } from '@/lib/academic/admissions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref')?.trim().toLowerCase();
  const verify = searchParams.get('verify')?.trim().toLowerCase();

  if (!ref) {
    return NextResponse.json(
      { success: false, error: 'Provide a reference number or KCSE Index Number (?ref=...).' },
      { status: 400 }
    );
  }

  // Verification is MANDATORY: no applicant data is returned on a reference
  // number alone. The caller must prove ownership with the phone or email
  // recorded on the application (KDPA privacy).
  if (!verify) {
    return NextResponse.json(
      { success: false, error: 'Verification required: provide the phone number or email on your application (?verify=...) to view this application.' },
      { status: 400 }
    );
  }

  // Find candidate by reference number or kcse_index
  const application = admissionsStore.find(
    (a) =>
      a.reference_number.toLowerCase() === ref ||
      (a.kcse_index && a.kcse_index.toLowerCase() === ref) ||
      (a.admission_number && a.admission_number.toLowerCase() === ref)
  );

  if (!application) {
    return NextResponse.json(
      { success: false, error: `No application found matching reference or index number '${ref}'.` },
      { status: 404 }
    );
  }

  // KDPA privacy verification: phone or email must match the application.
  const phoneClean = (application.applicant_phone || '').replace(/[^0-9]/g, '');
  const verifyClean = verify.replace(/[^0-9]/g, '');
  const phoneMatches =
    phoneClean.length > 0 &&
    verifyClean.length >= 4 &&
    (phoneClean.endsWith(verifyClean) || phoneClean === verifyClean);
  const emailMatches = Boolean(application.applicant_email) && application.applicant_email!.toLowerCase() === verify;

  if (!phoneMatches && !emailMatches) {
    return NextResponse.json(
      {
        success: false,
        error: 'Verification failed. The phone number or email provided does not match our records for this application.',
      },
      { status: 403 }
    );
  }

  // Checklist of documents
  const docs = application.documents || {};
  const documentChecklist = [
    { name: 'KCSE Result Slip / Certificate', submitted: Boolean(docs.kcse_slip) },
    { name: 'National ID / Birth Certificate', submitted: Boolean(docs.national_id_doc) },
    { name: 'Passport Size Photograph', submitted: Boolean(docs.passport_photo) },
  ];

  return NextResponse.json({
    success: true,
    data: {
      id: application.id,
      reference_number: application.reference_number,
      applicant_name: application.applicant_name,
      entry_type: application.entry_type || 'DIRECT',
      program_code: application.program_code,
      program_name: application.program_name,
      intake: application.intake,
      intake_year: application.intake_year,
      kcse_grade: application.kcse_grade,
      kcse_index: application.kcse_index,
      cluster_weight: application.cluster_weight,
      status: application.status,
      admission_number: application.admission_number,
      offer_letter_available: application.status === 'admitted',
      offer_letter_generated_at: application.offer_letter_generated_at,
      submitted_at: application.submitted_at,
      reviewed_at: application.reviewed_at,
      documents: documentChecklist,
    },
  });
}
