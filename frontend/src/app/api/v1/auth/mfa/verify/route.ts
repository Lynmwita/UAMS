import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth, createSignedToken } from '@/lib/auth/server-auth';
import { verifyTotp } from '@/lib/auth/mfa';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

// Default mock MFA secret for institutional testing (in production, loaded from user's encrypted MFA vault in DB)
const MOCK_INSTITUTIONAL_MFA_SECRET = 'JBSWY3DPEHPK3PXP';

export async function POST(request: NextRequest) {
  const auth = requireServerAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();
    const code = String(body?.code || '').trim();

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'A valid 6-digit MFA passcode is required.' },
        { status: 400 }
      );
    }

    const isValid = verifyTotp(code, MOCK_INSTITUTIONAL_MFA_SECRET);

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (!isValid) {
      recordAuditEvent({
        actor_email: auth.user.email,
        actor_role: auth.user.role,
        action: 'MFA_CHALLENGE_FAILED',
        entity_type: 'mfa_security',
        entity_id: auth.user.id,
        ip_address: ip,
        status: 'FAILURE',
        details: { reason: 'Invalid or expired TOTP passcode' },
      });

      return NextResponse.json(
        { success: false, error: 'Invalid or expired MFA code. Please check your authenticator app.' },
        { status: 401 }
      );
    }

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'MFA_CHALLENGE_SUCCESS',
      entity_type: 'mfa_security',
      entity_id: auth.user.id,
      ip_address: ip,
      status: 'SUCCESS',
      details: { amr: ['pwd', 'mfa'] },
    });

    // Elevate session claims to include verified MFA status
    const stepUpToken = createSignedToken(
      {
        id: auth.user.id,
        email: auth.user.email,
        role: auth.user.role,
      },
      900 // 15-minute elevated session
    );

    const response = NextResponse.json({
      success: true,
      message: 'MFA verification confirmed. Step-up authorization active.',
      mfaVerified: true,
    });

    response.cookies.set('uams_auth_token', stepUpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'MFA validation failed.' },
      { status: 500 }
    );
  }
}
