import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { buildExamClearanceCards } from '@/lib/academic/clearance';
import { studentsStore } from '@/lib/academic/student-records';
import { registrationsStore } from '@/lib/academic/registrations';
import { coursesStore } from '@/lib/academic/course-catalog';
import { generateExamCardPDF } from '@/lib/pdf/generator';
import JSZip from 'jszip';

/**
 * Bulk exam-pass PDF export.
 * POST /api/v1/exams/bulk-pass { student_ids: string[] }
 * Returns a ZIP with one PDF per admittable (cleared/waived) student.
 * Blocked students are skipped and reported — never issued a pass.
 */
export async function POST(req: NextRequest) {
  const auth = await requireServerAuth(req, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) {
    return NextResponse.json(
      { success: false, error: 'Bulk export requires the demo path.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body.student_ids) ? body.student_ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No students selected.' }, { status: 400 });
    }
    if (ids.length > 500) {
      return NextResponse.json({ success: false, error: 'Maximum 500 passes per batch.' }, { status: 400 });
    }

    const cards = buildExamClearanceCards();
    const zip = new JSZip();
    const issued: string[] = [];
    const skipped: { admission_number: string; reason: string }[] = [];

    for (const sid of ids) {
      const card = cards.find((c) => c.student_id === sid);
      if (!card) {
        skipped.push({ admission_number: sid, reason: 'No clearance card found.' });
        continue;
      }
      if (card.status !== 'cleared' && card.status !== 'waived') {
        skipped.push({
          admission_number: card.admission_number,
          reason: card.status === 'blocked_attendance'
            ? 'Blocked: attendance below 75%'
            : 'Blocked: fee balance outstanding',
        });
        continue;
      }
      const student = studentsStore.find((s) => s.id === sid);
      const regs = registrationsStore.filter((r) => r.student_id === sid);
      const courses = regs.map((r) => {
        const course = coursesStore.find((c) => c.code === r.course_code);
        return {
          code: r.course_code,
          title: course?.title || r.course_code,
          attendancePercent: 100, // honest default: per-course attendance not tracked per registration yet
        };
      });

      const pdf = generateExamCardPDF({
        student: {
          name: card.student_name,
          admissionNumber: card.admission_number,
          program: card.program_name,
          yearOfStudy: student?.current_year_of_study ?? 1,
          semesterNumber: student?.current_semester_number ?? 1,
          status: card.status,
        },
        semester: card.semester_name,
        academicYear: '2026/2027',
        courses,
        feeCleared: card.status === 'cleared',
        clearanceCode: card.security_qr_token,
      });
      const fileName = `exam-pass-${card.admission_number.replace(/[^A-Za-z0-9]/g, '-')}.pdf`;
      zip.file(fileName, Buffer.from(pdf.output('arraybuffer')));
      issued.push(card.admission_number);
    }

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'EXAM_PASSES_BULK_EXPORT',
      entity_type: 'exam_clearance',
      entity_id: 'bulk',
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { issued: issued.length, skipped: skipped.length },
    });

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="exam-passes.zip"',
        'X-Issued-Count': String(issued.length),
        'X-Skipped-Count': String(skipped.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
