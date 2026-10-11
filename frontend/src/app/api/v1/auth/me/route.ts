import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/server-auth';

/**
 * Server-side session verification endpoint.
 * Reads the secure httpOnly cookie and returns authenticated user metadata.
 * Completely eliminates reliance on browser localStorage for authentication state.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: No active session.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.id === 'usr-student-01' ? 'Faith' : user.email.split('@')[0],
      lastName: user.id === 'usr-student-01' ? 'Wanjiku' : '',
    },
  });
}
