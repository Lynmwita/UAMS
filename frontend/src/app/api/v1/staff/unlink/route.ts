import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalDatabase } from '@/lib/academic/institutional';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

/**
 * Remove a staff member's login only. The staff record stays and can be
 * re-invited later. Admin-only: removing logins is destructive and must
 * never be available to registrars or other staff roles.
 *
 * POST { email }
 */
export async function POST(request: Request) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    let db: any = null;
    try {
      db = institutionalDatabase();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Login removal requires an institutional database connection.' },
        { status: 503 }
      );
    }

    const { data: identity } = await db
      .from('users')
      .select('id,email,auth_user_id')
      .eq('email', email)
      .maybeSingle();

    let removed = false;
    // Delete the Supabase Auth user by email lookup, so no orphan login stays
    // behind after the link is cleared.
    try {
      const { data: listData } = await db.auth.admin.listUsers({ perPage: 1000 });
      const authUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === email);
      if (authUser) {
        const { error: deleteError } = await db.auth.admin.deleteUser(authUser.id);
        if (deleteError) throw new Error(deleteError.message);
        removed = true;
      }
    } catch (e: any) {
      // If the auth lookup itself fails, do not claim success.
      if (e?.message && !String(e.message).includes('not found')) throw e;
    }
    if (identity?.auth_user_id) {
      await db.from('users').update({ auth_user_id: null }).eq('id', identity.id);
      removed = true;
    }
    if (!removed && !identity) {
      return NextResponse.json(
        { success: false, error: 'No login account linked for this staff member.' },
        { status: 404 }
      );
    }

    const actorUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.user.id)
      ? auth.user.id
      : '00000000-0000-4000-8000-000000000001';
    try {
      await db.from('uams_operation_audit').insert({
        actor_id: actorUuid,
        operation: 'identity.unlink',
        entity_id: email,
        details: { email, actor: auth.user.email },
      });
    } catch {
      // Non-fatal
    }
    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'STAFF_LOGIN_REMOVED',
      entity_type: 'staff',
      entity_id: email,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { email },
    });

    return NextResponse.json({
      success: true,
      message: `Login removed for ${email}. The staff record remains and can be re-invited.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Login removal failed.' },
      { status: 500 }
    );
  }
}
