import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalDatabase } from '@/lib/academic/institutional';
import { staffStore } from '@/lib/hr/staff';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { dispatchNotification } from '@/lib/messaging/dispatcher';

export async function POST(request: Request) {
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

    // Registrars cannot manage administrator accounts
    if (auth.user.role === 'registrar') {
      const targetRole = String(staff?.role || body.role || '').toLowerCase();
      if (targetRole === 'admin' || targetRole === 'super_admin') {
        return NextResponse.json(
          { success: false, error: 'Registrars cannot modify administrative accounts.' },
          { status: 403 }
        );
      }
    }

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
        // 1. Check if user exists in Supabase Auth
        let identityId: string | null = null;
        const { data: listData } = await db.auth.admin.listUsers({ perPage: 1000 });
        const existingAuthUser = listData?.users?.find(
          (u: any) => u.email?.toLowerCase() === emailNorm
        );

        const targetRole = staff?.role || body.role || 'librarian';

        if (existingAuthUser) {
          identityId = existingAuthUser.id;
          const { error: updateError } = await db.auth.admin.updateUserById(identityId, {
            password,
            email_confirm: true,
            app_metadata: { role: targetRole },
          });
          if (updateError) throw new Error(updateError.message);
        } else {
          const { data: newUser, error: createError } = await db.auth.admin.createUser({
            email: emailNorm,
            password,
            email_confirm: true,
            app_metadata: { role: targetRole },
          });
          if (createError) throw new Error(createError.message);
          identityId = newUser.user?.id || null;
        }

        // Link in users table
        if (identityId) {
          try {
            await db
              .from('users')
              .upsert(
                {
                  email: emailNorm,
                  auth_user_id: identityId,
                  first_name: staff?.first_name || body.first_name || 'Staff',
                  last_name: staff?.last_name || body.last_name || 'Member',
                  is_active: true,
                },
                { onConflict: 'email' }
              );
          } catch {
            // Non-fatal
          }
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
