import { institutionalApi } from '@/lib/academic/institutional-api';
import { studentsStore } from '@/lib/academic/student-records';
import { coursesStore } from '@/lib/academic/course-catalog';
import { gradesStore } from '@/lib/academic/grades';
import { canTeachCourse } from '@/lib/auth/scope';
import { NextRequest, NextResponse } from 'next/server';
import { calculateGradePoint } from '@/lib/academic/gpa';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * Bulk grade sheet import.
 * POST /api/v1/grades/bulk { course_code, grades: [{admission_number, cat_score, exam_score}] }
 * Validates every row (CAT 0-30, exam 0-70, known admission number, no duplicate
 * for the same course) and creates all valid rows as 'draft' moderation status.
 * Returns per-row results so the UI can show green/red preview outcomes.
 * Lecturer+ only, scoped to courses they teach.
 */
export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['lecturer', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) {
    return NextResponse.json(
      { success: false, error: 'Bulk import requires the demo path; institutional bulk import is not yet supported.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const course_code: string = (body.course_code || '').trim();
    const rows: Array<{ admission_number?: string; cat_score?: unknown; exam_score?: unknown }> =
      Array.isArray(body.grades) ? body.grades : [];

    if (!course_code) return NextResponse.json({ success: false, error: 'course_code is required.' }, { status: 400 });
    if (!canTeachCourse(auth.user, course_code)) {
      return NextResponse.json({ success: false, error: 'You may only upload marks for your assigned courses.' }, { status: 403 });
    }
    const course = coursesStore.find((c) => c.code === course_code);
    if (!course) return NextResponse.json({ success: false, error: 'Course not found.' }, { status: 404 });
    if (rows.length === 0) return NextResponse.json({ success: false, error: 'No grade rows supplied.' }, { status: 400 });
    if (rows.length > 1000) return NextResponse.json({ success: false, error: 'Maximum 1000 rows per upload.' }, { status: 400 });

    const results: Array<{ row: number; admission_number: string; ok: boolean; error?: string; grade_id?: string }> = [];
    let created = 0;

    for (const [i, row] of rows.entries()) {
      const adm = (row.admission_number || '').trim();
      const cat = Number(row.cat_score);
      const exam = Number(row.exam_score);
      const fail = (error: string) => results.push({ row: i + 1, admission_number: adm, ok: false, error });

      if (!adm) { fail('admission_number is required.'); continue; }
      const student = studentsStore.find((st) => st.admission_number === adm);
      if (!student) { fail(`Unknown admission number '${adm}'.`); continue; }
      if (!Number.isFinite(cat) || cat < 0 || cat > 30) { fail(`CAT score ${row.cat_score} out of range (0-30).`); continue; }
      if (!Number.isFinite(exam) || exam < 0 || exam > 70) { fail(`Exam score ${row.exam_score} out of range (0-70).`); continue; }
      const dup = gradesStore.find((g) => g.admission_number === adm && g.course_code === course_code);
      if (dup) { fail(`Grade already exists for ${adm} in ${course_code}.`); continue; }
      const dupInBatch = results.some((r) => r.ok && r.admission_number === adm);
      if (dupInBatch) { fail(`Duplicate row for ${adm} in this upload.`); continue; }

      const total = cat + exam;
      const { letter, points } = calculateGradePoint(total);
      const newGrade = {
        id: `grd-${Date.now()}-${i}`,
        student_id: student.id,
        student_name: student.first_name + ' ' + student.last_name,
        admission_number: adm,
        course_code,
        course_title: course.title,
        credit_hours: course.credit_hours,
        cat_score: cat,
        exam_score: exam,
        total_score: total,
        letter_grade: letter,
        grade_point: points,
        is_submitted: true,
        is_approved: false,
        moderation_status: 'draft' as const,
      };
      gradesStore.push(newGrade);
      created++;
      results.push({ row: i + 1, admission_number: adm, ok: true, grade_id: newGrade.id });
    }

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'GRADES_BULK_IMPORTED',
      entity_type: 'student_grades',
      entity_id: course_code,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { course_code, rows: rows.length, created },
    });

    return NextResponse.json({ success: true, data: { course_code, created, total: rows.length, results } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Bulk import failed.' }, { status: 500 });
  }
}
