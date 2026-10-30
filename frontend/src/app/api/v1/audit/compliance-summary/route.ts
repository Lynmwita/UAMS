import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { getAuditLogs } from '@/lib/audit/audit-logger';

/**
 * Compliance summary for the Audit & Compliance Officer's Risk & Compliance
 * Control Center. Read-only aggregation — no operational data is modified.
 *
 * Works on vanilla main AND on branches carrying the enterprise redesigns:
 * waiver/attendance modules are imported defensively and fall back to
 * honest zeros when the corresponding feature branch is not present.
 */
export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'audit_officer']);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active fee waivers (from the clearance redesign, if present)
    let pendingWaivers = 0;
    try {
      const clearance = await import('@/lib/academic/clearance');
      const store = (clearance as any).examWaiversStore as any[] | undefined;
      if (Array.isArray(store)) {
        pendingWaivers = store.filter(
          (w: any) => !w.is_revoked && new Date(w.valid_until) >= now
        ).length;
      }
    } catch {
      // Clearance redesign not present — honest zero, not fabricated.
    }

    // Grade modifications from the audit log (last 7 days)
    const auditLogs = getAuditLogs();
    const gradeModifications = auditLogs
      .filter(
        (log) =>
          (log.action === 'GRADE_APPROVED' ||
            log.action === 'GRADE_CORRECTION_REQUESTED' ||
            log.action === 'GRADE_MODIFIED') &&
          new Date(log.timestamp) >= weekAgo
      )
      .map((log) => ({
        id: log.id,
        course: (log.details as any)?.course_code || 'Unknown course',
        student: (log.details as any)?.student || 'Unknown student',
        at: log.timestamp,
        actor: log.actor_email,
        reason: (log.details as any)?.reason || (log.details as any)?.note || 'No reason recorded',
      }));

    // Attendance breaches (from the attendance redesign, if present)
    let attendanceBreaches = 0;
    try {
      const attStore = await import('@/lib/academic/attendance-store');
      const compute = (attStore as any).computeStudentAttendance as (() => any[]) | undefined;
      if (typeof compute === 'function') {
        attendanceBreaches = compute().filter((s: any) => s.is_blocked && !s.is_exempt).length;
      }
    } catch {
      // Attendance redesign not present — honest zero, not fabricated.
    }

    // Failed logins in the last 7 days
    const failedLogins = auditLogs.filter(
      (log) => log.action === 'USER_LOGIN_FAILED' && new Date(log.timestamp) >= weekAgo
    ).length;

    // Recent critical events (last 20)
    const criticalActions = new Set([
      'GRADE_APPROVED',
      'GRADE_CORRECTION_REQUESTED',
      'GRADE_MODIFIED',
      'STRUCTURE_BULK_IMPORT',
      'SCHOOL_UPDATED',
      'USER_LOGIN_FAILED',
      'EXAM_WAIVER_GRANTED',
      'EXAM_WAIVER_REVOKED',
      'FEE_OVERRIDE',
    ]);
    const recentActivity = auditLogs
      .filter((log) => criticalActions.has(log.action))
      .slice(0, 20)
      .map((log) => ({
        action: log.action,
        actor: log.actor_email,
        at: log.timestamp,
        detail: JSON.stringify(log.details || {}).slice(0, 120),
      }));

    return NextResponse.json({
      success: true,
      data: {
        pendingWaivers,
        gradeModifications,
        attendanceBreaches,
        failedLogins,
        recentActivity,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
