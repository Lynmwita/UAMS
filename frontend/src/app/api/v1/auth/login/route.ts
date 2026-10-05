import { NextResponse } from 'next/server';
import { DEMO_USERS, isValidDemoCredentials, normalizeRole } from '@/lib/auth/session';

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

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token: 'jwt_mock_token_uams_2026',
      user: {
        id: `usr-demo-${role}`,
        email,
        role,
        firstName: 'Authorized',
        lastName: 'User',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Invalid request payload.' },
      { status: 400 }
    );
  }
}
