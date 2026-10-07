import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UserRole } from '@/types';
import { normalizeRole } from './session';

const JWT_SECRET = process.env.JWT_SECRET || 'uams-enterprise-secure-jwt-signing-key-2026';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  exp: number; // Unix timestamp in seconds
  iat: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 JWT-like token.
 */
export function createSignedToken(payload: Omit<TokenPayload, 'exp' | 'iat'>, expiresInSeconds = 86400): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const fullPayload: TokenPayload = { ...payload, iat, exp };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verifies a cryptographically signed token and returns the payload if valid.
 */
export function verifySignedToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  // Timing-safe signature comparison
  if (signature.length !== expectedSig.length) return null;
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and authenticates user from Authorization header or cookie.
 */
export function getAuthenticatedUser(request: Request | NextRequest): TokenPayload | null {
  let token: string | null = null;

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if ('cookies' in request && typeof (request as any).cookies?.get === 'function') {
    token = (request as any).cookies.get('uams_auth_token')?.value || null;
  }

  // Also check standard cookie header
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/uams_auth_token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) return null;
  return verifySignedToken(token);
}

/**
 * Guard helper: verifies request has a valid token and optionally checks role authorization.
 */
export function requireServerAuth(
  request: Request | NextRequest,
  allowedRoles?: UserRole[]
): { user: TokenPayload } | { errorResponse: NextResponse } {
  const user = getAuthenticatedUser(request);

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to access this resource.' },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const canonicalRole = normalizeRole(user.role);
    const hasRole = allowedRoles.some((r) => normalizeRole(r) === canonicalRole || canonicalRole === 'super_admin');
    if (!hasRole) {
      return {
        errorResponse: NextResponse.json(
          { success: false, error: `Forbidden: User role '${user.role}' lacks sufficient privileges for this operation.` },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}
