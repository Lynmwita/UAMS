import { NextResponse } from 'next/server';
import { DEMO_USERS, isValidDemoCredentials } from '@/lib/auth/session';
import { isUserRole } from '@/lib/auth/roles';
import { createSignedToken } from '@/lib/auth/server-auth';
import { issueRefreshToken } from '@/lib/auth/refresh-token';
import { checkRateLimit } from '@/lib/auth/rate-limiter';
import { validateCsrf } from '@/lib/auth/csrf';
import { authClient, trustedUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!validateCsrf(request).valid) return NextResponse.json({ success: false, error: 'Invalid request origin.' }, { status: 403 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const limit = checkRateLimit(`login:${ip}`, 10, 60);
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'Too many login attempts. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(limit.resetSeconds) } });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password || email.length > 254 || password.length > 1024 || (body?.role !== undefined && !isUserRole(body.role))) {
    return NextResponse.json({ success: false, error: 'Valid email, password and portal role are required.' }, { status: 400 });
  }
  const demoRole = Object.entries(DEMO_USERS).find(([, account]) => account.email === email)?.[0];
  let user;
  let accessToken: string;
  let refreshToken: string;
  let expiresIn = 900;
  if (demoRole && (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_AUTH !== 'false')) {
    if (!isUserRole(demoRole) || (body.role && body.role !== demoRole) || !isValidDemoCredentials(email, password, demoRole)) {
      return NextResponse.json({ success: false, error: 'Invalid credentials or portal role.' }, { status: 401 });
    }
    user = { id: demoRole === 'student' ? 'usr-student-01' : `usr-demo-${demoRole}`, email, role: demoRole };
    accessToken = createSignedToken(user, expiresIn);
    refreshToken = issueRefreshToken(user);
  } else {
    try {
      const { data, error } = await authClient().auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) return NextResponse.json({ success: false, error: 'Invalid credentials.' }, { status: 401 });
      user = trustedUser(data.user);
      if (!user || (body.role && body.role !== user.role)) return NextResponse.json({ success: false, error: 'Account is inactive or not assigned to this portal role. Contact your administrator.' }, { status: 403 });
      accessToken = data.session.access_token;
      refreshToken = data.session.refresh_token;
      expiresIn = data.session.expires_in;
    } catch {
      return NextResponse.json({ success: false, error: 'Institutional authentication is unavailable. Contact your administrator.' }, { status: 503 });
    }
  }
  const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
  response.cookies.set('uams_auth_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: expiresIn });
  response.cookies.set('uams_refresh_token', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 7 * 86400 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
