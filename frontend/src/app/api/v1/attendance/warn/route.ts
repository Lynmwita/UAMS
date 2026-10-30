import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalApi } from '@/lib/academic/institutional-api';
import { computeStudentAttendance, ATTENDANCE_THRESHOLD } from '@/lib/academic/attendance-store';
import { notificationLogs } from '@/lib/messaging/notification-store';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import type { NotificationLog } from '@/types';

/**
 * Bulk academic warning notices for at-risk students (attendance below threshold).
 * Creates in-app notification records addressed to each student — honest about
 * delivery: in_app channel means the notice appears in the student's portal inbox,
 * not as an SMS/email, unless a provider is configured.
 * Admin/registrar/HOD only, audit-logged.
 */

function nowStamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'attendance/warn');
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.student_ids) ? body.student_ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No students selected.' }, { status: 400 });
    }
    const stats = computeStudentAttendance();
    const issued: string[] = [];
    const skipped: string[] = [];

    for (const id of ids) {
      const stat = stats.find((s) => s.student_id === id);
      if (!stat || !stat.is_at_risk || stat.is_exempt) {
        skipped.push(id);
        continue;
      }
      const log: NotificationLog = {
        id: `ntf-warn-${Date.now()}-${id}`,
        recipient_type: 'student',
        recipient_identifier: stat.adm,
        recipient_name: stat.name,
        channel: 'in_app',
        subject: 'Academic Warning: Low Class Attendance',
        message_content:
          `Dear ${stat.name}, your recorded class attendance is ${stat.percentage}% ` +
          `(${stat.sessions_attended} of ${stat.sessions_total} sessions attended), below the Senate ` +
          `minimum of ${ATTENDANCE_THRESHOLD}% for exam sitting. Please consult your Head of Department ` +
          `immediately. Continued shortfall will block your Exam Clearance Card.`,
        provider: 'system',
        status: 'queued',
        attempts: 0,
        created_at: nowStamp(),
      };
      notificationLogs.unshift(log);
      issued.push(id);
    }

    recordAuditEvent({
      actor_email: auth.user.email, actor_role: auth.user.role, action: 'ATTENDANCE_WARNINGS_ISSUED',
      entity_type: 'attendance_warning', entity_id: 'bulk',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS', details: { issued: issued.length, skipped: skipped.length },
    });

    return NextResponse.json({
      success: true,
      data: { issued: issued.length, skipped: skipped.length, issued_ids: issued },
      message: `${issued.length} warning notice${issued.length === 1 ? '' : 's'} issued to student inboxes.${skipped.length ? ` ${skipped.length} skipped (not at-risk or exempt).` : ''}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
