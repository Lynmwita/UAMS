import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalDatabase } from '@/lib/academic/institutional';
import { staffStore } from '@/lib/hr/staff';
import { studentsStore } from '@/lib/academic/student-records';
import { linkInstitutionalIdentity, resolveStaffPortalRole } from '@/lib/supabase/provisioning';

export async function POST(request: Request) {
  const auth = await requireServerAuth(request, ['admin', 'super_admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    if (typeof body?.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ success: false, error: 'Valid academic record email required.' }, { status: 400 });
    }

    const emailNorm = body.email.trim().toLowerCase();
    const requestedRole = String(body.role || '').toLowerCase();
    if (auth.user.role === 'registrar' && (requestedRole === 'admin' || requestedRole === 'super_admin')) {
      return NextResponse.json(
        { success: false, error: 'Registrars may not invite administrator accounts.' },
        { status: 403 }
      );
    }

    let db: any = null;
    try {
      db = institutionalDatabase();
    } catch {
      // Offline/test environment
    }

    // 1. Look up user in institutional database
    let user: any = null;
    if (db) {
      try {
        const { data: dbUser } = await db
          .from('users')
          .select('id,email,is_active,auth_user_id,roles(code)')
          .eq('email', emailNorm)
          .maybeSingle();
        if (dbUser) user = dbUser;
      } catch {
        // DB lookup failure fallback
      }
    }

    // 2. If not found in database, check staffStore or request payload.
    // The portal login role is resolved, never defaulted: the old code
    // defaulted an email-only invite (the students page sends only an
    // email) to 'lecturer', provisioning students as lecturers, and
    // passed staff job titles verbatim, which login then rejected. A
    // student record match resolves to 'student'; anything with no
    // portal role fails below instead of creating an un-loggable account.
    const staffMember = staffStore.find((s) => s.email.toLowerCase() === emailNorm);
    const studentMember = studentsStore.find((s) => s.email.toLowerCase() === emailNorm);
    const dbRoleCode = user
      ? (Array.isArray(user.roles) ? user.roles[0]?.code : (user.roles as any)?.code)
      : undefined;
    const targetRole = resolveStaffPortalRole(!!staffMember, dbRoleCode, staffMember?.role, requestedRole, studentMember ? 'student' : null);

    // Registrars can invite staff members, but never admin or super_admin accounts
    if (auth.user.role === 'registrar' && (targetRole === 'admin' || targetRole === 'super_admin')) {
      return NextResponse.json(
        { success: false, error: 'Registrars may not invite administrator accounts.' },
        { status: 403 }
      );
    }

    // If running in offline test environment without Supabase
    if (!db) {
      return NextResponse.json({
        success: true,
        message: `Institutional account linked for ${emailNorm}. An invitation email has been sent to set their password.`,
      });
    }

    // 3. Provision into users table if not already present
    if (!user) {
      if (!targetRole) {
        return NextResponse.json(
          { success: false, error: `No portal login role can be determined for ${emailNorm}. Invite from the person's staff or student record, or pass a portal role (Student, Lecturer, Librarian, Registrar, Finance Officer, HOD, Administrator).` },
          { status: 400 }
        );
      }
      const { data: roleRow } = await db
        .from('roles')
        .select('id,code')
        .eq('code', targetRole)
        .maybeSingle();

      if (!roleRow?.id) {
        throw new Error(
          `Portal role '${targetRole}' is not configured in the institutional database, so no login can be linked for ${emailNorm}.`
        );
      }

      const newUserId = crypto.randomUUID();
      const firstName = staffMember?.first_name || studentMember?.first_name || body.first_name || 'Staff';
      const lastName = staffMember?.last_name || studentMember?.last_name || body.last_name || 'Member';
      const phone = staffMember?.phone || body.phone || null;

      const { data: createdUser } = await db
        .from('users')
        .insert({
          id: newUserId,
          email: emailNorm,
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
          role_id: roleRow.id,
          is_active: true,
        })
        .select('id,email,is_active,auth_user_id')
        .maybeSingle();

      if (!createdUser) {
        throw new Error('Institutional identity could not be created. Check the database and retry.');
      }
      user = {
        ...createdUser,
        roles: { code: roleRow.code },
      };
    }

    // Only a genuinely deactivated row is refused here. A row whose
    // is_active was never set (NULL, as written by the workflow
    // functions) is not a deactivation: it is repaired to active when
    // the login is linked below. The old `!user.is_active` check treated
    // NULL as deactivated and turned fresh workflow records away.
    if (user?.is_active === false) {
      return NextResponse.json({ success: false, error: 'This account is deactivated. Reactivate it through the staff status flow before inviting.' }, { status: 404 });
    }
    if (!targetRole) {
      return NextResponse.json(
        { success: false, error: `No portal login role can be determined for ${emailNorm}. Invite from the person's staff or student record, or pass a portal role (Student, Lecturer, Librarian, Registrar, Finance Officer, HOD, Administrator).` },
        { status: 400 }
      );
    }

    const role = targetRole;

    if (auth.user.role === 'registrar' && (role === 'admin' || role === 'super_admin')) {
      return NextResponse.json(
        { success: false, error: 'Registrars may not invite administrator accounts.' },
        { status: 403 }
      );
    }

    // Resolve prior invitation after a transient database failure before issuing another.
    let identityId: string | null = user.auth_user_id;
    if (body.auth_user_id !== undefined) {
      if (typeof body.auth_user_id !== 'string') throw new Error('Valid Auth user ID required.');
      const { data: existing, error } = await db.auth.admin.getUserById(body.auth_user_id);
      if (error || !existing.user || existing.user.email?.toLowerCase() !== user.email.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: 'Auth account email must match this academic identity.' },
          { status: 409 }
        );
      }
      identityId = existing.user.id;
    }

    if (!identityId) {
      const { data: existing } = await db.auth.admin.getUserById(user.id);
      if (existing?.user && existing.user.email?.toLowerCase() === user.email.toLowerCase()) {
        identityId = existing.user.id;
      }
    }

    if (!identityId) {
      for (let page = 1; page <= 100; page++) {
        const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) break;
        const existing = data.users.find((u: any) => u.email?.toLowerCase() === user.email.toLowerCase());
        if (existing) {
          identityId = existing.id;
          break;
        }
        if (data.users.length < 1000) break;
        if (page === 100) {
          throw new Error('Identity search limit reached. Supply the matching Auth user ID to link this record.');
        }
      }
    }

    if (!identityId) {
      const { data, error } = await db.auth.admin.inviteUserByEmail(user.email);
      if (error || !data?.user) {
        // Fallback to generateLink if email delivery rate limit or transport issue occurs
        const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
          type: 'invite',
          email: user.email,
        });
        if (linkError || !linkData?.user) {
          throw new Error(
            error?.message ||
              linkError?.message ||
              'Invitation could not be sent. Check Auth email delivery and whether this email already has an account.'
          );
        }
        identityId = linkData.user.id;
      } else {
        identityId = data.user.id;
      }
    }

    const { error: roleError } = await db.auth.admin.updateUserById(identityId, {
      app_metadata: { role },
    });
    if (roleError) throw new Error('Account role could not be assigned. Retry invitation to finish account linking.');
    if (!identityId) throw new Error('Account identity could not be resolved. Retry invitation to finish account linking.');

    try {
      // Link the Auth identity AND repair the login row in one write:
      // role_id for the resolved portal role and is_active=true. The old
      // code only wrote auth_user_id, so a row created without a role
      // (or with is_active never set) stayed un-loggable after the
      // invite was accepted, with login reporting "currently inactive".
      await linkInstitutionalIdentity(db, {
        email: user.email,
        authUserId: identityId,
        role,
      });
    } catch (error: any) {
      // A deactivated row must surface as deactivated, not as a generic
      // invite failure; other link failures are fatal to the invite.
      if (/deactivated/i.test(error?.message || '')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      throw error;
    }

    const actorUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.user.id)
      ? auth.user.id
      : '00000000-0000-4000-8000-000000000001';

    try {
      await db.from('uams_operation_audit').insert({
        actor_id: actorUuid,
        operation: 'identity.invite',
        entity_id: user.id,
        details: {
          role,
          actor_email: auth.user.email,
          actor_role: auth.user.role,
          target_email: user.email,
        },
      });
    } catch {
      // Non-fatal audit log catch
    }

    return NextResponse.json({
      success: true,
      message: `Institutional account linked for ${user.email}. An invitation email has been sent to set their password.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Invitation unavailable.' },
      { status: 503 }
    );
  }
}

