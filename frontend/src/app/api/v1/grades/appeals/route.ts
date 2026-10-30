import { institutionalApi } from '@/lib/academic/institutional-api';
import { gradesStore, gradeAppealsStore, type GradeAppeal } from '@/lib/academic/grades';
import { canTeachCourse, canReviewCourse } from '@/lib/auth/scope';
import { NextRequest, NextResponse } from 'next/server';
import { calculateGradePoint } from '@/lib/academic/gpa';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * Grade change / appeal desk.
 * GET  /api/v1/grades/appeals          — list appeals (hod/admin/registrar see all; lecturers see their own)
 * POST /api/v1/grades/appeals          — lecturer submits: grade_id, new_cat_score, new_exam_score, reason (min 20 chars)
 * PATCH /api/v1/grades/appeals         — hod/admin: { appeal_id, decision: 'approved'|'rejected', decision_note? }
 * Approved appeals update the grade (back to draft for re-moderation) and are
 * permanently audit-logged with the reason.
 */
export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['lecturer', 'hod', 'registrar', 'admin', 'super_admin', 'audit_officer']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'grades/appeals');

  const results = ['hod', 'registrar', 'admin', 'super_admin', 'audit_officer'].includes(auth.user.role)
    ? [...gradeAppealsStore]
    : gradeAppealsStore.filter((a) => a.submitted_by === auth.user.email);
  return NextResponse.json({ success: true, total: results.length, data: results });
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['lecturer', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'grades/appeals');

  try {
    const body = await request.json();
    const grade = gradesStore.find((g) => g.id === body.grade_id);
    if (!grade || !canTeachCourse(auth.user, grade.course_code)) {
      return NextResponse.json({ success: false, error: 'Grade not found in your scope.' }, { status: 404 });
    }
    const reason: string = (body.reason || '').trim();
    if (reason.length < 20) {
      return NextResponse.json({ success: false, error: 'A reason of at least 20 characters is required (e.g. "Missing script found during re-marking").' }, { status: 400 });
    }
    const newCat = Number(body.new_cat_score);
    const newExam = Number(body.new_exam_score);
    if (!Number.isFinite(newCat) || newCat < 0 || newCat > 30 || !Number.isFinite(newExam) || newExam < 0 || newExam > 70) {
      return NextResponse.json({ success: false, error: 'CAT must be 0-30 and exam must be 0-70.' }, { status: 400 });
    }
    const pending = gradeAppealsStore.find((a) => a.grade_id === grade.id && a.status === 'pending');
    if (pending) return NextResponse.json({ success: false, error: 'A pending appeal already exists for this grade.' }, { status: 409 });

    const newTotal = newCat + newExam;
    const { letter } = calculateGradePoint(newTotal);
    const appeal: GradeAppeal = {
      id: `apl-${Date.now()}`,
      grade_id: grade.id,
      student_id: grade.student_id,
      student_name: grade.student_name,
      admission_number: grade.admission_number,
      course_code: grade.course_code,
      course_title: grade.course_title,
      old_total: grade.total_score,
      old_letter: grade.letter_grade,
      new_cat_score: newCat,
      new_exam_score: newExam,
      new_total: newTotal,
      new_letter: letter,
      reason,
      status: 'pending',
      submitted_by: auth.user.email,
      submitted_at: new Date().toISOString(),
    };
    gradeAppealsStore.unshift(appeal);
    recordAuditEvent({
      actor_email: auth.user.email, actor_role: auth.user.role, action: 'GRADE_APPEAL_SUBMITTED',
      entity_type: 'grade_appeals', entity_id: appeal.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { grade_id: grade.id, course_code: grade.course_code, reason },
    });
    return NextResponse.json({ success: true, data: appeal }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Appeal submission failed.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireServerAuth(request, ['hod', 'admin', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'grades/appeals');

  try {
    const body = await request.json();
    const appeal = gradeAppealsStore.find((a) => a.id === body.appeal_id);
    if (!appeal) return NextResponse.json({ success: false, error: 'Appeal not found.' }, { status: 404 });
    if (appeal.status !== 'pending') return NextResponse.json({ success: false, error: 'Appeal already decided.' }, { status: 400 });
    const decision: string = body.decision;
    if (decision !== 'approved' && decision !== 'rejected') {
      return NextResponse.json({ success: false, error: "decision must be 'approved' or 'rejected'." }, { status: 400 });
    }

    appeal.status = decision;
    appeal.decided_by = auth.user.email;
    appeal.decided_at = new Date().toISOString();
    appeal.decision_note = (body.decision_note || '').trim();

    if (decision === 'approved') {
      // Apply the corrected marks; grade returns to draft for re-moderation.
      const grade = gradesStore.find((g) => g.id === appeal.grade_id);
      if (grade) {
        grade.cat_score = appeal.new_cat_score;
        grade.exam_score = appeal.new_exam_score;
        grade.total_score = appeal.new_total;
        grade.letter_grade = appeal.new_letter;
        const { points } = calculateGradePoint(appeal.new_total);
        grade.grade_point = points;
        grade.moderation_status = 'draft';
        grade.is_approved = false;
      }
    }

    recordAuditEvent({
      actor_email: auth.user.email, actor_role: auth.user.role,
      action: decision === 'approved' ? 'GRADE_APPEAL_APPROVED' : 'GRADE_APPEAL_REJECTED',
      entity_type: 'grade_appeals', entity_id: appeal.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { grade_id: appeal.grade_id, reason: appeal.reason, decision_note: appeal.decision_note },
    });
    return NextResponse.json({ success: true, data: appeal });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Appeal decision failed.' }, { status: 500 });
  }
}
