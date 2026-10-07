import crypto from 'crypto';
import { UserRole } from '@/types';
import { getJwtSecret } from './server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export interface RefreshTokenPayload {
  jti: string; // Unique Token Identifier
  fid: string; // Token Family Identifier (for rotation & breach invalidation)
  id: string; // User ID
  email: string;
  role: UserRole;
  exp: number; // Expiration timestamp (seconds)
  iat: number;
}

interface StoredTokenMetadata {
  jti: string;
  familyId: string;
  userId: string;
  status: 'active' | 'rotated' | 'revoked';
  issuedAt: number;
  expiresAt: number;
}

// In-memory token family registry (in enterprise prod, backed by Redis or PostgreSQL)
const tokenRegistry = new Map<string, StoredTokenMetadata>();

/**
 * Signs a refresh token with cryptographic HMAC-SHA256 and records it in the registry.
 */
export function issueRefreshToken(user: { id: string; email: string; role: UserRole }, existingFamilyId?: string): string {
  const jti = `jti-${crypto.randomBytes(16).toString('hex')}`;
  const fid = existingFamilyId || `fam-${crypto.randomBytes(16).toString('hex')}`;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60; // 7 days lifetime

  const payload: RefreshTokenPayload = {
    jti,
    fid,
    id: user.id,
    email: user.email,
    role: user.role,
    iat: now,
    exp,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${body}`)
    .digest('base64url');

  tokenRegistry.set(jti, {
    jti,
    familyId: fid,
    userId: user.id,
    status: 'active',
    issuedAt: now,
    expiresAt: exp,
  });

  return `${header}.${body}.${signature}`;
}

/**
 * Validates a refresh token signature and expiry.
 */
export function verifyRefreshToken(rawToken: string): RefreshTokenPayload | null {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const parts = rawToken.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${body}`)
    .digest('base64url');

  if (signature.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload: RefreshTokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Rotates an active refresh token.
 * 
 * Enforces OWASP Refresh Token Rotation & Replay Detection:
 * - If the token is 'active': marks it 'rotated', creates a new token in the same family, returns new token.
 * - If the token is ALREADY 'rotated': an adversary or compromised client has attempted to replay an old token!
 *   Immediately revokes ALL tokens in that family (breach containment).
 */
export function rotateRefreshToken(
  rawToken: string,
  ipAddress = '127.0.0.1'
): { success: true; user: { id: string; email: string; role: UserRole }; newRefreshToken: string } | { success: false; error: string; breachDetected?: boolean } {
  const payload = verifyRefreshToken(rawToken);
  if (!payload) {
    return { success: false, error: 'Invalid or expired refresh token.' };
  }

  const record = tokenRegistry.get(payload.jti);

  // If no registry record or revoked
  if (!record || record.status === 'revoked') {
    return { success: false, error: 'Token has been revoked.' };
  }

  // REPLAY DETECTION: Token was already rotated! Potential token theft.
  if (record.status === 'rotated') {
    // Invalidate entire token family immediately
    revokeTokenFamily(payload.fid);

    recordAuditEvent({
      actor_email: payload.email,
      actor_role: payload.role,
      action: 'SECURITY_ALERT',
      entity_type: 'refresh_token_family',
      entity_id: payload.fid,
      ip_address: ipAddress,
      status: 'BLOCKED',
      details: {
        reason: 'Refresh token replay detected. Revoked all tokens in family.',
        compromisedJti: payload.jti,
      },
    });

    return {
      success: false,
      error: 'Security breach detected: Attempted reuse of a rotated refresh token. All active sessions have been terminated.',
      breachDetected: true,
    };
  }

  // Mark current token as rotated
  record.status = 'rotated';

  // Issue new refresh token within the same family
  const newRefreshToken = issueRefreshToken(
    { id: payload.id, email: payload.email, role: payload.role },
    payload.fid
  );

  return {
    success: true,
    user: { id: payload.id, email: payload.email, role: payload.role },
    newRefreshToken,
  };
}

/**
 * Revokes all tokens associated with a given family ID.
 */
export function revokeTokenFamily(familyId: string): void {
  for (const [_, record] of tokenRegistry.entries()) {
    if (record.familyId === familyId) {
      record.status = 'revoked';
    }
  }
}

/**
 * Revokes all tokens for a given user ID (global logout across all devices).
 */
export function revokeAllUserTokens(userId: string): void {
  for (const [_, record] of tokenRegistry.entries()) {
    if (record.userId === userId) {
      record.status = 'revoked';
    }
  }
}
