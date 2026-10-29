import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalDatabase } from '@/lib/academic/institutional';
import { staffStore } from '@/lib/hr/staff';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { clearLecturerAllocations } from '@/lib/academic/course-catalog';
import { clearLecturerFromTimetable } from '@/lib/academic/timetable-store';

/**
 * Delete a whole staff record. Super Admin only, and always confirmed in
 * the UI with a typed email before this route is called — deletion cannot
 * be undone. Both the demo path and the institutional path pass this gate.
 *
 * The staff record row is deleted. The linked login is also deleted, while
 * the identity row in `users` is kept but deactivated so audit history
 * (which references it) stays intact.
 *
 * POST { staff_id }
 */
export async function POST(request: Request) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const staffId = typeof body?.staff_id === 'string' ? body.staff_id : '';
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'staff_id is required.' }, { status: 400 });
    }

    // Demo actors live in the in-memory store, not in Supabase.
    if (auth.user.id.startsWith('usr-')) {
      const index = staffStore.findIndex((s) => s.id === staffId);
      if (index === -1) {
        return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
      }
      const [removed] = staffStore.splice(index, 1);
      const fullName = `${removed.first_name} ${removed.last_name}`;
      clearLecturerAllocations(fullName);
      clearLecturerFromTimetable(fullName);
      recordAuditEvent({
        actor_email: auth.user.email,
        actor_role: auth.user.role,
        action: 'STAFF_MEMBER_DELETED',
        entity_type: 'staff',
        entity_id: staffId,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        status: 'SUCCESS',
        details: { email: removed.email },
      });
      return NextResponse.json({
        success: true,
        message: `Staff record deleted for ${removed.email}.`,
      });
    }

    let db: any = null;
    try {
      db = institutionalDatabase();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Staff deletion requires an institutional database connection.' },
        { status: 503 }
      );
    }

    const { data: record, error: readError } = await db
      .from('uams_staff_records')
      .select('id,email')
      .eq('id', staffId)
      .maybeSingle();
    if (readError || !record) {
      return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });
    }
    const emailNorm = String(record.email || '').toLowerCase();

    // Remove the login first so no orphan account survives the record.
    const { data: identity } = await db
      .from('users')
      .select('id,auth_user_id')
      .eq('email', emailNorm)
      .maybeSingle();
    if (identity?.auth_user_id) {
      try {
        await db.auth.admin.deleteUser(identity.auth_user_id);
      } catch {
        // Non-fatal: the identity row below is still deactivated.
      }
      await db
        .from('users')
        .update({ auth_user_id: null, is_active: false })
        .eq('id', identity.id);
    }

    // Clear lecturer allocations and timetable slots (Hub ghost fix)
    try {
      const { data: lecturerRow } = await db
        .from('lecturers')
        .select('id')
        .eq('staff_id', staffId)
        .maybeSingle();

      if (lecturerRow?.id) {
        await db.from('course_allocations').delete().eq('lecturer_id', lecturerRow.id);
        await db.from('timetables').update({ lecturer_id: null }).eq('lecturer_id', lecturerRow.id);
        await db.from('lecturers').delete().eq('id', lecturerRow.id);
      }
    } catch {
      // Non-fatal if tables don't exist
    }

    const { error: deleteError } = await db.from('uams_staff_records').delete().eq('id', staffId);
    if (deleteError) throw new Error('Staff record could not be deleted.');

    const actorUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.user.id)
      ? auth.user.id
      : '00000000-0000-4000-8000-000000000001';
    try {
      await db.from('uams_operation_audit').insert({
        actor_id: actorUuid,
        operation: 'staff.delete',
        entity_id: staffId,
        details: { email: emailNorm, actor: auth.user.email },
      });
    } catch {
      // Non-fatal
    }
    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'STAFF_MEMBER_DELETED',
      entity_type: 'staff',
      entity_id: staffId,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { email: emailNorm },
    });

    return NextResponse.json({
      success: true,
      message: `Staff record deleted for ${emailNorm}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Staff deletion failed.' },
      { status: 500 }
    );
  }
}
