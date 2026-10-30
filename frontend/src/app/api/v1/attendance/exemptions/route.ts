import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalApi } from '@/lib/academic/institutional-api';
import { attendanceExemptions, computeStudentAttendance, type AttendanceExemption } from '@/lib/academic/attendance-store';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * Attendance exemptions: special Senate-approved exemptions from the 75%
 * exam-sitting attendance threshold (medical, bereavement, official duty).
 * Admin-tier only, audit-logged. An exempt student is NOT blocked from
 * exam clearance even when their attendance is below threshold.
 */

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod', 'lecturer']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'attendance/exemptions');
  return NextResponse.json({ success: true, data: attendanceExemptions });
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'attendance/exemptions');
  try {
    const body = await request.json();
    const { student_id, adm, name, reason } = body ?? {};
    if (typeof student_id !== 'string' || !student_id.trim() || typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
      return NextResponse.json({ success: false, error: 'student_id and a reason (max 500 chars) are required.' }, { status: 400 });
    }
    if (attendanceExemptions.some((e) => e.student_id === student_id)) {
      return NextResponse.json({ success: false, error: 'This student already has an active exemption.' }, { status: 409 });
    }
    const exemption: AttendanceExemption = {
      student_id: student_id.trim(),
      adm: typeof adm === 'string' ? adm : '',
      name: typeof name === 'string' ? name : '',
      reason: reason.trim(),
      granted_by: auth.user.email,
      granted_at: new Date().toISOString(),
    };
    attendanceExemptions.push(exemption);
    recordAuditEvent({
      actor_email: auth.user.email, actor_role: auth.user.role, action: 'ATTENDANCE_EXEMPTION_GRANTED',
      entity_type: 'attendance_exemption', entity_id: student_id.trim(),
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS', details: { adm: exemption.adm, reason: exemption.reason },
    });
    return NextResponse.json({ success: true, data: exemption }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'attendance/exemptions');
  try {
    const { searchParams } = new URL(request.url);
    const student_id = searchParams.get('student_id');
    if (!student_id) return NextResponse.json({ success: false, error: 'student_id is required.' }, { status: 400 });
    const idx = attendanceExemptions.findIndex((e) => e.student_id === student_id);
    if (idx === -1) return NextResponse.json({ success: false, error: 'No active exemption found.' }, { status: 404 });
    const [removed] = attendanceExemptions.splice(idx, 1);
    recordAuditEvent({
      actor_email: auth.user.email, actor_role: auth.user.role, action: 'ATTENDANCE_EXEMPTION_REVOKED',
      entity_type: 'attendance_exemption', entity_id: student_id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS', details: { adm: removed.adm },
    });
    return NextResponse.json({ success: true, data: { revoked: student_id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
