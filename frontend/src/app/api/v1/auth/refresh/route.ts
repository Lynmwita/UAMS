import { NextRequest, NextResponse } from 'next/server';
import { rotateRefreshToken } from '@/lib/auth/refresh-token';
import { createSignedToken } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Retrieve refresh token from httpOnly cookie
    let refreshToken: string | null = null;
    if (typeof request.cookies?.get === 'function') {
      refreshToken = request.cookies.get('uams_refresh_token')?.value || null;
    }

    if (!refreshToken) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/uams_refresh_token=([^;]+)/);
      if (match) {
        refreshToken = match[1];
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token provided.' },
        { status: 401 }
      );
    }

    const rotationResult = rotateRefreshToken(refreshToken, ip);

    if (!rotationResult.success) {
      const response = NextResponse.json(
        {
          success: false,
          error: rotationResult.error,
          breachDetected: Boolean(rotationResult.breachDetected),
        },
        { status: 401 }
      );

      // On breach or invalid token, terminate all cookies immediately
      response.cookies.set('uams_auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      response.cookies.set('uams_refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    // Issue fresh short-lived access token (15 mins = 900s)
    const newAccessToken = createSignedToken(
      {
        id: rotationResult.user.id,
        email: rotationResult.user.email,
        role: rotationResult.user.role,
      },
      900 // 15 minutes lifetime
    );

    recordAuditEvent({
      actor_email: rotationResult.user.email,
      actor_role: rotationResult.user.role,
      action: 'TOKEN_REFRESH_SUCCESS',
      entity_type: 'auth_session',
      entity_id: rotationResult.user.id,
      ip_address: ip,
      status: 'SUCCESS',
      details: { mechanism: 'OWASP_REFRESH_TOKEN_ROTATION' },
    });

    const response = NextResponse.json({
      success: true,
      user: rotationResult.user,
    });

    // Update short-lived access token cookie
    response.cookies.set('uams_auth_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 900, // 15 minutes
      path: '/',
    });

    // Update rotated refresh token cookie
    response.cookies.set('uams_refresh_token', rotationResult.newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Token refresh failed.' },
      { status: 500 }
    );
  }
}
