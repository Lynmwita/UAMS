import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalDatabase } from '@/lib/academic/institutional';
import { staffStore } from '@/lib/hr/staff';
import { studentsStore } from '@/lib/academic/student-records';
import { linkInstitutionalIdentity, resolveStaffPortalRole } from '@/lib/supabase/provisioning';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { dispatchNotification } from '@/lib/messaging/dispatcher';

export async function POST(request: Request) {
  // Admin tier on both the demo path and the institutional path:
  // setting or resetting another person's password must never be
  // available to registrars. (Admin tier, not super_admin-only: the
  // owner's own rule is "admin can reset password", and main already
  // gates this route to admin + super_admin.)
  const auth = await requireServerAuth(request, ['super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const { email, action, password } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'A valid email address is required.' }, { status: 400 });
    }

    const emailNorm = email.trim().toLowerCase();
    const staff = staffStore.find((s) => s.email.toLowerCase() === emailNorm);

    let db: any = null;
    try {
      db = institutionalDatabase();
    } catch {
      // Offline / demo fallback
    }

    if (action === 'set') {
      if (!password || typeof password !== 'string' || password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters.' },
          { status: 400 }
        );
      }

      if (db) {
        // Resolve the portal login role BEFORE creating or updating the
        // Auth identity. Staff records carry job titles (accountant,
        // cleaner, ...) that are not portal roles; writing one verbatim
        // into app_metadata.role used to create an account whose password
        // worked but which could never pass the login gate, while this
        // route still reported "now active and ready to log in". Staff
        // records whose job title has no portal role (cleaner, cook,
        // driver, ...) now map to the scoped 'support_staff' role, so
        // they can log in with the email + password assigned here. Only
        // an email with no staff/student record and no usable role
        // fails here, loudly, instead of producing another un-loggable
        // account.
        const student = studentsStore.find((s) => s.email.toLowerCase() === emailNorm);
        const targetRole = resolveStaffPortalRole(!!staff, staff?.role, body.role, student ? 'student' : null);
        if (!targetRole) {
          return NextResponse.json(
            { success: false, error: `No portal login role can be determined for ${emailNorm}. Invite from the person's staff or student record, or pass a portal role (Student, Lecturer, Librarian, Registrar, Finance Officer, HOD, Administrator, Support Staff) before setting a password.` },
            { status: 400 }
          );
        }
        const targetStaffRole = staff?.role || body.role || targetRole;

        // 1. Check if user exists in Supabase Auth
        let identityId: string | null = null;
        const { data: listData } = await db.auth.admin.listUsers({ perPage: 1000 });
        const existingAuthUser = listData?.users?.find(
          (u: any) => u.email?.toLowerCase() === emailNorm
        );

        if (existingAuthUser) {
          identityId = existingAuthUser.id;
          const { error: updateError } = await db.auth.admin.updateUserById(identityId, {
            password,
            email_confirm: true,
            app_metadata: { role: targetRole, staff_role: targetStaffRole },
          });
          if (updateError) throw new Error(updateError.message);
        } else {
          const { data: newUser, error: createError } = await db.auth.admin.createUser({
            email: emailNorm,
            password,
            email_confirm: true,
            app_metadata: { role: targetRole, staff_role: targetStaffRole },
          });
          if (createError) throw new Error(createError.message);
          identityId = newUser.user?.id || null;
        }

        // Link in users table: this write is what login looks up, so it
        // must carry the portal role_id and is_active=true, and a failure
        // here must fail the request rather than claim the account is
        // active. The old upsert wrote no role_id, leaving role-less rows
        // that the login gate's inner join dropped as "inactive".
        if (identityId) {
          await linkInstitutionalIdentity(db, {
            email: emailNorm,
            authUserId: identityId,
            role: targetRole,
            firstName: staff?.first_name || student?.first_name || body.first_name || null,
            lastName: staff?.last_name || student?.last_name || body.last_name || null,
          });
        }

        const actorUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.user.id)
          ? auth.user.id
          : '00000000-0000-4000-8000-000000000001';

        try {
          await db.from('uams_operation_audit').insert({
            actor_id: actorUuid,
            operation: 'identity.set_password',
            entity_id: emailNorm,
            details: { email: emailNorm, role: targetRole, actor: auth.user.email },
          });
        } catch {
          // Non-fatal
        }
      }

      recordAuditEvent({
        actor_email: auth.user.email,
        actor_role: auth.user.role,
        action: 'STAFF_PASSWORD_SET',
        entity_type: 'staff',
        entity_id: staff?.id || emailNorm,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        status: 'SUCCESS',
        details: { email: emailNorm },
      });

      return NextResponse.json({
        success: true,
        message: `Password set successfully for ${emailNorm}. The account is now active and ready to log in.`,
      });
    }

    if (action === 'reset_link') {
      // The old code generated a recovery link but never emailed it, while the
      // screen claimed it was sent — and it handed the live link back to the
      // caller's browser. A reset link must reach the staff member by email
      // only, never through the admin's response.
      if (!db) {
        return NextResponse.json(
          { success: false, error: 'Password reset requires an institutional database connection.' },
          { status: 503 }
        );
      }
      const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
        type: 'recovery',
        email: emailNorm,
      });
      if (linkErr) {
        // Fallback: Supabase sends the reset email itself.
        const { error: resetErr } = await db.auth.resetPasswordForEmail(emailNorm);
        if (resetErr) throw new Error(linkErr.message || resetErr.message);
      } else {
        const actionLink = linkData?.properties?.action_link || null;
        if (!actionLink) throw new Error('Reset link could not be generated.');
        const { result } = await dispatchNotification({
          channel: 'email',
          recipientIdentifier: emailNorm,
          subject: 'Set your UAMS password',
          messageContent: `Hello,\n\nA password reset was requested for your UAMS account. Use the link below to choose a new password. The link expires in 15 minutes.\n\n${actionLink}\n\nIf you did not request this, ignore this email and your password stays unchanged.`,
        });
        if (result.status !== 'sent' || result.mode === 'mock') {
          // The dispatcher could not really deliver (mock mode or failure):
          // fall back to Supabase's own reset email so the staff member still
          // receives a link, instead of claiming delivery that never happened.
          const { error: resetErr } = await db.auth.resetPasswordForEmail(emailNorm);
          if (resetErr) {
            throw new Error(
              result.error || resetErr.message || 'Reset link could not be emailed. Check email delivery configuration.'
            );
          }
        }
      }

      // Best-effort repair of the login link: a reset link used as the
      // first provisioning step used to leave the users row role-less, so
      // the person still could not log in after resetting. Repair only
      // when a portal role resolves and an Auth identity exists; the
      // helper never reactivates a deactivated row, and a repair failure
      // must not fail a reset email that already went out.
      try {
        const resetIdentityId = linkData?.user?.id || null;
        const resetStudent = studentsStore.find((s) => s.email.toLowerCase() === emailNorm);
        const resetRole = resolveStaffPortalRole(!!staff, staff?.role, body.role, resetStudent ? 'student' : null);
        if (resetIdentityId && resetRole) {
          await linkInstitutionalIdentity(db, {
            email: emailNorm,
            authUserId: resetIdentityId,
            role: resetRole,
          });
        }
      } catch {
        // Secondary repair only; the reset email itself already succeeded.
      }

      const actorUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.user.id)
        ? auth.user.id
        : '00000000-0000-4000-8000-000000000001';

      try {
        await db.from('uams_operation_audit').insert({
          actor_id: actorUuid,
          operation: 'identity.password_reset_dispatched',
          entity_id: emailNorm,
          details: { email: emailNorm, actor: auth.user.email },
        });
      } catch {
        // Non-fatal
      }

      recordAuditEvent({
        actor_email: auth.user.email,
        actor_role: auth.user.role,
        action: 'STAFF_PASSWORD_RESET_DISPATCHED',
        entity_type: 'staff',
        entity_id: staff?.id || emailNorm,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        status: 'SUCCESS',
        details: { email: emailNorm },
      });

      return NextResponse.json({
        success: true,
        message: `Password reset link has been emailed to ${emailNorm}.`,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action. Specify "set" or "reset_link".' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Password operation failed.' },
      { status: 500 }
    );
  }
}
