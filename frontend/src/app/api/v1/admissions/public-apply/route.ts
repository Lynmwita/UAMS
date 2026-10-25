import { NextRequest, NextResponse } from 'next/server';
import { admissionsStore, generateReferenceNumber } from '@/lib/academic/admissions';
import { normalizeKenyanPhone } from '@/lib/communications/phone-sanitizer';
import { executeDispatch } from '@/lib/communications/dispatcher-service';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { UamsAdmissionApplication } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      applicant_name,
      applicant_email,
      applicant_phone,
      gender,
      date_of_birth,
      program_code,
      program_name,
      intake = 'September',
      intake_year = 2026,
      kcse_grade,
      kcse_points,
      kcse_index,
      national_id,
      previous_institution,
      documents,
    } = body;

    // Required fields validation
    if (!applicant_name || typeof applicant_name !== 'string' || applicant_name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Full applicant name is required.' }, { status: 400 });
    }

    if (!applicant_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant_email)) {
      return NextResponse.json({ success: false, error: 'A valid applicant email address is required.' }, { status: 400 });
    }

    if (!applicant_phone) {
      return NextResponse.json({ success: false, error: 'Applicant mobile phone number is required.' }, { status: 400 });
    }

    const phoneSanitized = normalizeKenyanPhone(applicant_phone);
    if (!phoneSanitized.valid || !phoneSanitized.normalized) {
      return NextResponse.json(
        { success: false, error: `Invalid Kenyan phone number: ${phoneSanitized.error || 'Format as 07XXXXXXXX or +254XXXXXXXXX'}` },
        { status: 400 }
      );
    }

    if (!['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ success: false, error: 'Gender must be male, female, or other.' }, { status: 400 });
    }

    if (!date_of_birth || isNaN(Date.parse(date_of_birth))) {
      return NextResponse.json({ success: false, error: 'A valid date of birth is required.' }, { status: 400 });
    }

    if (!program_code) {
      return NextResponse.json({ success: false, error: 'Please select a degree programme.' }, { status: 400 });
    }

    if (!kcse_grade) {
      return NextResponse.json({ success: false, error: 'KCSE mean grade is required.' }, { status: 400 });
    }

    const points = Number(kcse_points);
    if (!Number.isFinite(points) || points < 0 || points > 84) {
      return NextResponse.json({ success: false, error: 'KCSE aggregate points must be between 0 and 84.' }, { status: 400 });
    }

    // Duplicate check
    const kcseClean = kcse_index ? String(kcse_index).trim().replace(/\s+/g, '') : undefined;
    if (kcseClean) {
      const existing = admissionsStore.find(
        (a) => a.kcse_index && a.kcse_index.toLowerCase() === kcseClean.toLowerCase()
      );
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `An application with KCSE Index '${kcseClean}' has already been submitted (Reference: ${existing.reference_number}). Please track your status on the tracking tab.`,
          },
          { status: 409 }
        );
      }
    }

    const year = Number(intake_year) || new Date().getFullYear();
    const nextSeq = admissionsStore.length + 1;
    const refNo = generateReferenceNumber('DIRECT', year, nextSeq);
    const createdAt = new Date();

    const application: UamsAdmissionApplication = {
      id: `adm-pub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      reference_number: refNo,
      applicant_name: applicant_name.trim(),
      applicant_email: applicant_email.trim().toLowerCase(),
      applicant_phone: phoneSanitized.normalized,
      gender,
      date_of_birth: String(date_of_birth),
      program_code: String(program_code).toUpperCase(),
      program_name: program_name ? String(program_name) : String(program_code).toUpperCase(),
      intake: String(intake),
      intake_year: year,
      kcse_grade: String(kcse_grade).trim().toUpperCase(),
      kcse_points: points,
      kcse_index: kcseClean,
      national_id: national_id ? String(national_id).trim() : undefined,
      entry_type: 'DIRECT',
      previous_institution: previous_institution ? String(previous_institution).trim() : undefined,
      documents: documents && typeof documents === 'object' ? documents : undefined,
      status: 'submitted',
      submitted_at: createdAt.toISOString().slice(0, 10),
    };

    admissionsStore.push(application);

    // Audit Log
    recordAuditEvent({
      actor_email: application.applicant_email,
      actor_role: 'student',
      action: 'DIRECT_ADMISSION_APPLICATION_SUBMITTED',
      entity_type: 'admission_applications',
      entity_id: application.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: {
        reference_number: application.reference_number,
        program_code: application.program_code,
        kcse_index: application.kcse_index,
      },
    });

    // Confirmation SMS dispatch (safe sandbox or real, respecting privacy guard)
    try {
      const host = request.headers.get('host') || 'localhost:3000';
      const proto = request.headers.get('x-forwarded-proto') || 'http';
      const originUrl = `${proto}://${host}`;

      await executeDispatch(
        {
          recipient_type: 'student',
          recipient_identifier: application.applicant_phone,
          recipient_name: application.applicant_name,
          channel: 'sms',
          subject: 'Direct Entry Application Received',
          message_content: `UAMS ADMISSIONS: Dear ${application.applicant_name.split(' ')[0]}, your application for ${application.program_code} has been received. Your Ref No is ${application.reference_number}. Track online at ${originUrl}/apply.`,
        },
        true
      );
    } catch (e) {
      console.error('Failed to dispatch public application SMS:', e);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Your application has been received successfully! Your tracking reference number is ${application.reference_number}.`,
        reference_number: application.reference_number,
        data: application,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
