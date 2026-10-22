import { NextResponse } from 'next/server';
import { DEMO_USERS, isValidDemoCredentials } from '@/lib/auth/session';
import { isUserRole } from '@/lib/auth/roles';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { UserRole } from '@/types';
import { createSignedToken } from '@/lib/auth/server-auth';
import { issueRefreshToken } from '@/lib/auth/refresh-token';
import { checkRateLimit } from '@/lib/auth/rate-limiter';
import { validateCsrf } from '@/lib/auth/csrf';
import { authClient, activeInstitutionalUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!validateCsrf(request).valid) {
    return NextResponse.json({ success: false, error: 'Invalid request origin.' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const limit = checkRateLimit(`login:${ip}`, 10, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many login attempts. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.resetSeconds) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed JSON payload.' }, { status: 400 });
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const requestedRole = body?.role;

  // Specific validation checks for missing inputs
  if (!email) {
    return NextResponse.json({ success: false, error: 'Please enter your institutional email address.' }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ success: false, error: 'Please enter your account password.' }, { status: 400 });
  }
  if (!requestedRole || !isUserRole(requestedRole)) {
    return NextResponse.json({ success: false, error: 'Please select a valid Portal Role (e.g. Student, Lecturer, Administrator).' }, { status: 400 });
  }
  if (email.length > 254 || password.length > 1024) {
    return NextResponse.json({ success: false, error: 'Email or password exceeds maximum allowable length.' }, { status: 400 });
  }

  const demoRoleEntry = Object.entries(DEMO_USERS).find(([, account]) => account.email.toLowerCase() === email);
  const demoRole = demoRoleEntry ? (demoRoleEntry[0] as UserRole) : null;
  const isDemoAuthEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO_AUTH === 'true';

  let user;
  let accessToken: string;
  let refreshToken: string;
  let expiresIn = 900;

  if (demoRole && isDemoAuthEnabled) {
    // Check 1: Did the user pick the wrong role for this demo email?
    if (requestedRole && requestedRole !== demoRole) {
      const expectedLabel = ROLE_LABELS[demoRole] || demoRole;
      const selectedLabel = ROLE_LABELS[requestedRole as UserRole] || requestedRole;
      return NextResponse.json({
        success: false,
        error: `Portal Role mismatch: '${email}' is registered as ${expectedLabel}, but '${selectedLabel}' was selected. Please select '${expectedLabel}' in the Portal Role dropdown.`
      }, { status: 401 });
    }

    // Check 2: Did the user enter the wrong password?
    if (!isValidDemoCredentials(email, password, demoRole)) {
      return NextResponse.json({
        success: false,
        error: `Incorrect password for '${email}'. For demo accounts, use password 'DemoPassword2026!' or click a quick sandbox button below.`
      }, { status: 401 });
    }

    user = { id: demoRole === 'student' ? 'usr-student-01' : `usr-demo-${demoRole}`, email, role: demoRole };
    accessToken = createSignedToken(user, expiresIn);
    refreshToken = issueRefreshToken(user);
  } else {
    try {
      const { data, error } = await authClient().auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) {
        const isDemoDomain = email.includes('@university.ac.ke');
        const looksLikeDemoRole = email.includes('student') || email.includes('lecturer') || email.includes('admin') || email.includes('hod') || email.includes('registrar') || email.includes('finance');

        if (looksLikeDemoRole || isDemoDomain) {
          return NextResponse.json({
            success: false,
            error: `No demo account found matching '${email}'. Demonstration accounts use '[role]@university.ac.ke' (e.g. student@university.ac.ke, lecturer@university.ac.ke) with password 'DemoPassword2026!'. Or click a demo button below to autofill.`
          }, { status: 401 });
        }

        return NextResponse.json({
          success: false,
          error: `Invalid credentials for '${email}'. Check your email spelling and password, or use a demo account below.`
        }, { status: 401 });
      }

      user = await activeInstitutionalUser(data.user);
      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'Your institutional account is currently inactive. Please contact the university administrator.'
        }, { status: 403 });
      }

      if (requestedRole && requestedRole !== user.role) {
        const expectedLabel = ROLE_LABELS[user.role as UserRole] || user.role;
        const selectedLabel = ROLE_LABELS[requestedRole as UserRole] || requestedRole;
        return NextResponse.json({
          success: false,
          error: `Portal Role mismatch: Your institutional account is assigned to '${expectedLabel}', but '${selectedLabel}' was selected. Please choose '${expectedLabel}' in the Portal Role dropdown.`
        }, { status: 403 });
      }

      accessToken = data.session.access_token;
      refreshToken = data.session.refresh_token;
      expiresIn = data.session.expires_in;
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Institutional authentication service is temporarily unavailable. If evaluating, please use one of the demonstration accounts below.'
      }, { status: 503 });
    }
  }

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, role: user.role }
  });

  response.cookies.set('uams_auth_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: expiresIn
  });

  response.cookies.set('uams_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 86400
  });

  response.headers.set('Cache-Control', 'no-store');
  return response;
}
