import { NextResponse } from 'next/server';
import { DEMO_USERS, isValidDemoCredentials, normalizeRole } from '@/lib/auth/session';
import { createSignedToken } from '@/lib/auth/server-auth';

export async function POST(request: Request) {
  try {
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

    if (!isValidDemoCredentials(email, password, role)) {
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

