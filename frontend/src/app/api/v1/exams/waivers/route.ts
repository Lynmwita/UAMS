import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import {
  examWaiversStore,
  WAIVER_TYPES,
  getActiveWaiver,
} from '@/lib/academic/clearance';
import { studentsStore } from '@/lib/academic/student-records';
import type { ExamWaiver, UserRole } from '@/types';

const GRANT_ROLES: UserRole[] = ['super_admin', 'admin', 'finance_officer', 'hod'];
const READ_ROLES: UserRole[] = ['super_admin', 'admin', 'finance_officer', 'hod', 'registrar', 'audit_officer'];

function audit(req: NextRequest, auth: any, action: string, waiver: ExamWaiver) {
  recordAuditEvent({
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action,
    entity_type: 'exam_waivers',
    entity_id: waiver.id,
    ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
    status: 'SUCCESS',
    details: {
      student_id: waiver.student_id,
      admission_number: waiver.admission_number,
      waiver_type: waiver.waiver_type,
      valid_until: waiver.valid_until,
      reason: waiver.reason,
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireServerAuth(req, READ_ROLES);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'exams/waivers');

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope'); // 'active' | 'expired' | 'revoked' | null (all)
  const now = new Date();
  let list = [...examWaiversStore].sort((a, b) => b.granted_at.localeCompare(a.granted_at));
  if (scope === 'active') list = list.filter((w) => !w.is_revoked && new Date(w.valid_until) >= now);
  else if (scope === 'expired') list = list.filter((w) => !w.is_revoked && new Date(w.valid_until) < now);
  else if (scope === 'revoked') list = list.filter((w) => w.is_revoked);

  return NextResponse.json({ success: true, total: list.length, data: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireServerAuth(req, GRANT_ROLES);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'exams/waivers');

  try {
    const body = await req.json();
    const student = studentsStore.find(
      (s) => s.id === body.student_id || s.admission_number === body.admission_number
    );
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 });
    }
    if (!WAIVER_TYPES.includes(body.waiver_type)) {
      return NextResponse.json(
        { success: false, error: `waiver_type must be one of: ${WAIVER_TYPES.join(', ')}.` },
        { status: 400 }
      );
    }
    const reason = (body.reason || '').trim();
    if (reason.length < 20) {
      return NextResponse.json(
        { success: false, error: 'A reason of at least 20 characters is required for every waiver.' },
        { status: 400 }
      );
    }
    const validUntil = new Date(body.valid_until);
    if (isNaN(validUntil.getTime()) || validUntil <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'valid_until must be a future date.' },
        { status: 400 }
      );
    }
    const existing = getActiveWaiver(student.id);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Student already has an active waiver until ${existing.valid_until}. Revoke it first.` },
        { status: 409 }
      );
    }

    const waiver: ExamWaiver = {
      id: `wvr-${Date.now()}`,
      student_id: student.id,
      admission_number: student.admission_number,
      student_name: `${student.first_name} ${student.last_name}`,
      waiver_type: body.waiver_type,
      reason,
      granted_by_email: auth.user.email,
      granted_by_role: auth.user.role,
      granted_at: new Date().toISOString(),
      valid_until: validUntil.toISOString().slice(0, 10),
      is_revoked: false,
    };
    examWaiversStore.push(waiver);
    audit(req, auth, 'EXAM_WAIVER_GRANTED', waiver);
    return NextResponse.json({ success: true, data: waiver }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireServerAuth(req, GRANT_ROLES);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'exams/waivers');

  try {
    const body = await req.json();
    const waiver = examWaiversStore.find((w) => w.id === body.id);
    if (!waiver) {
      return NextResponse.json({ success: false, error: 'Waiver not found.' }, { status: 404 });
    }
    if (body.action !== 'revoke') {
      return NextResponse.json({ success: false, error: "action must be 'revoke'." }, { status: 400 });
    }
    if (waiver.is_revoked) {
      return NextResponse.json({ success: false, error: 'Waiver is already revoked.' }, { status: 409 });
    }
    waiver.is_revoked = true;
    waiver.revoked_at = new Date().toISOString();
    waiver.revoked_by_email = auth.user.email;
    audit(req, auth, 'EXAM_WAIVER_REVOKED', waiver);
    return NextResponse.json({ success: true, data: waiver });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
