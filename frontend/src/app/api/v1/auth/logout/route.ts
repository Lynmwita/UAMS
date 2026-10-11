import { NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/auth/csrf';
import { verifyRefreshToken, revokeTokenFamily } from '@/lib/auth/refresh-token';
import { authClient } from '@/lib/supabase/server';
import { revokeAccessToken } from '@/lib/auth/server-auth';

/**
 * Destroys the authenticated session by expiring the httpOnly cookie.
 */
export async function POST(request: Request) {
  if (!validateCsrf(request).valid) return NextResponse.json({ success: false, error: 'Invalid request origin.' }, { status: 403 });
  const cookie = request.headers.get('cookie') || '';
  const accessToken = cookie.match(/(?:^|;\s*)uams_auth_token=([^;]+)/)?.[1];
  if (accessToken && (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_AUTH !== 'false')) revokeAccessToken(accessToken);
  const refresh = cookie.match(/(?:^|;\s*)uams_refresh_token=([^;]+)/)?.[1];
  if (refresh?.includes('.')) {
    const payload = verifyRefreshToken(refresh);
    if (payload) revokeTokenFamily(payload.fid);
  } else if (refresh) {
    const access = cookie.match(/(?:^|;\s*)uams_auth_token=([^;]+)/)?.[1];
    if (access) {
      try {
        const client = authClient();
        await client.auth.setSession({ access_token: access, refresh_token: refresh });
        await client.auth.signOut({ scope:'local' });
      } catch { /* Always clear the browser session. */ }
    }
  }
  const response = NextResponse.json({
    success: true,
    message: 'Session terminated successfully.',
  });

  response.cookies.set('uams_auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('uams_refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
