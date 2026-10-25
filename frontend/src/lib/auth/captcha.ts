/**
 * Anti-Bot & Proof-of-Human Security Challenge (CAPTCHA)
 * Provides cryptographically signed, stateless challenge tokens for public endpoints.
 * Protects SMS dispatcher and application pipelines against automated abuse and airtime drain.
 */

import crypto from 'crypto';
import { getJwtSecret } from './server-auth';

export interface CaptchaChallenge {
  question: string;
  challenge_token: string;
  expires_in_seconds: number;
}

interface ChallengePayload {
  answer: number;
  exp: number; // Unix timestamp in seconds
  nonce: string;
}

/**
 * Generates a fresh arithmetic security challenge with a signed HMAC token.
 * Valid for 10 minutes.
 */
export function generateCaptchaChallenge(): CaptchaChallenge {
  const a = Math.floor(Math.random() * 8) + 2; // 2 to 9
  const b = Math.floor(Math.random() * 8) + 2; // 2 to 9
  const answer = a + b;
  const exp = Math.floor(Date.now() / 1000) + 600; // 10 minutes expiry
  const nonce = crypto.randomBytes(8).toString('hex');

  const payload: ChallengePayload = { answer, exp, nonce };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(payloadBase64)
    .digest('base64url');

  const challenge_token = `${payloadBase64}.${signature}`;

  return {
    question: `Security Verification: What is ${a} + ${b}?`,
    challenge_token,
    expires_in_seconds: 600,
  };
}

/**
 * Verifies the user's submitted challenge answer against the signed token.
 */
export function verifyCaptchaChallenge(
  token: unknown,
  userAnswer: unknown
): { valid: boolean; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Security challenge token is missing.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed security challenge token.' };
  }

  const [payloadBase64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(payloadBase64)
    .digest('base64url');

  if (signature.length !== expectedSig.length) {
    return { valid: false, error: 'Invalid challenge signature length.' };
  }

  const isValidSig = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );

  if (!isValidSig) {
    return { valid: false, error: 'Security challenge signature verification failed.' };
  }

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload: ChallengePayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return { valid: false, error: 'Security challenge has expired. Please refresh the page.' };
    }

    const numericAnswer = Number(userAnswer);
    if (!Number.isFinite(numericAnswer) || numericAnswer !== payload.answer) {
      return { valid: false, error: 'Incorrect answer to security verification question.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Failed to decode challenge payload.' };
  }
}
