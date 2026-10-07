import { NextResponse } from 'next/server';

/**
 * Destroys the authenticated session by expiring the httpOnly cookie.
 */
export async function POST() {
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

  return response;
}
