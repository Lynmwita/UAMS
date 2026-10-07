import { NextResponse } from 'next/server';
import { DEMO_USERS, isValidDemoCredentials, normalizeRole } from '@/lib/auth/session';
import { createSignedToken } from '@/lib/auth/server-auth';
import { checkRateLimit } from '@/lib/auth/rate-limiter';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function POST(request: Request) {
  try {
    // Brute-force & rate-limiting protection (OWASP defense against credential stuffing)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rateLimit = checkRateLimit(`login:${ip}`, 10, 60);
    if (!rateLimit.allowed) {
      recordAuditEvent({
        actor_email: 'throttled-ip',
        actor_role: 'unauthenticated',
        action: 'LOGIN_RATE_LIMITED',
        entity_type: 'security_telemetry',
        entity_id: ip,
        ip_address: ip,
        status: 'BLOCKED',
        details: { resetSeconds: rateLimit.resetSeconds },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Too many authentication attempts. Please retry in ${rateLimit.resetSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const role = normalizeRole(body?.role);

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Production environment separation: Block demo authentication in production mode
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_AUTH !== 'true') {
      recordAuditEvent({
        actor_email: email,
        actor_role: role,
        action: 'PROD_DEMO_LOGIN_BLOCKED',
        entity_type: 'auth_security',
        entity_id: email,
        ip_address: ip,
        status: 'BLOCKED',
        details: { reason: 'Demo accounts prohibited in production' },
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Demo accounts are disabled in production environment. Please authenticate via institutional directory or Supabase Auth.',
        },
        { status: 403 }
      );
    }

    if (!isValidDemoCredentials(email, password, role)) {
      recordAuditEvent({
        actor_email: email,
        actor_role: role,
        action: 'LOGIN_FAILED',
        entity_type: 'auth_session',
        entity_id: email,
        ip_address: ip,
        status: 'FAILURE',
        details: { reason: 'Invalid credentials supplied' },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Invalid credentials for ${DEMO_USERS[role].email.split('@')[0].replace('_', ' ')}. Please use the matching demo account.`,
        },
        { status: 401 }
      );
    }

    const userId = `usr-${role}-${Date.now().toString().slice(-4)}`;
    const signedToken = createSignedToken({
      id: userId,
      email,
      role,
    });

    recordAuditEvent({
      actor_email: email,
      actor_role: role,
      action: 'LOGIN_SUCCESS',
      entity_type: 'auth_session',
      entity_id: userId,
      ip_address: ip,
      status: 'SUCCESS',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token: signedToken,
      user: {
        id: userId,
        email,
        role,
        firstName: role === 'student' ? 'Faith' : 'Authorized',
        lastName: role === 'student' ? 'Wanjiku' : 'Staff',
      },
    });

    // Set secure HTTP cookie for browser session handling
    response.cookies.set('uams_auth_token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 24 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Invalid request payload.' },
      { status: 400 }
    );
  }
}

