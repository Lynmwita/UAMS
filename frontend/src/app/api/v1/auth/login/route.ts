import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // Role-based mock credential validator
    const userRole = role || 'student';
    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      token: 'jwt_mock_token_uams_2026',
      user: {
        id: 'usr-demo-001',
        email,
        role: userRole,
        firstName: 'Authorized',
        lastName: 'User',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Invalid request payload.' },
      { status: 400 }
    );
  }
}
