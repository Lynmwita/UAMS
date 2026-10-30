import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * POST /api/v1/audit/flags
 *
 * Allows the Audit & Compliance Officer to flag a suspicious record
 * (grade or clearance) for review. This is the ONLY write action available
 * to auditors — it writes to the audit log, never to operational data.
 *
 * Body: {
 *   entity_type: 'grade' | 'clearance',
 *   entity_id: string,
 *   student_name: string,
 *   admission_number: string,
 *   course_code?: string,
 *   reason?: string
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'audit:read');
  if ('errorResponse' in auth) return auth.errorResponse;

  // Only auditors (and admins) may raise flags. Operational roles cannot.
  if (!['audit_officer', 'super_admin', 'admin'].includes(auth.user.role)) {
    return NextResponse.json(
      { success: false, error: 'Only audit officers may raise compliance flags.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { entity_type, entity_id, student_name, admission_number, course_code, reason } = body;

    if (!entity_type || !entity_id || !student_name) {
      return NextResponse.json(
        { success: false, error: 'entity_type, entity_id, and student_name are required.' },
        { status: 400 }
      );
    }
    if (!['grade', 'clearance'].includes(entity_type)) {
      return NextResponse.json(
        { success: false, error: 'entity_type must be "grade" or "clearance".' },
        { status: 400 }
      );
    }

    const flag = recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'AUDIT_FLAG_RAISED',
      entity_type: entity_type === 'grade' ? 'student_grades' : 'exam_clearance',
      entity_id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: {
        student_name,
        admission_number,
        ...(course_code ? { course_code } : {}),
        reason: reason || 'Flagged for compliance review — no reason specified.',
      },
    });

    return NextResponse.json({ success: true, data: flag });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * GET /api/v1/audit/flags
 *
 * Returns all AUDIT_FLAG_RAISED events for the auditor's dashboard.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'audit:read');
  if ('errorResponse' in auth) return auth.errorResponse;

  const { getAuditLogs } = await import('@/lib/audit/audit-logger');
  const flags = getAuditLogs({ action: 'AUDIT_FLAG_RAISED', limit: 100 });

  return NextResponse.json({ success: true, data: flags });
}
