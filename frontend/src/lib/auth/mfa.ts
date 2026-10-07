import crypto from 'crypto';

/**
 * Enterprise Multi-Factor Authentication (MFA) Engine
 * Implements RFC 6238 Time-Based One-Time Password (TOTP) algorithm
 * using HMAC-SHA1 with 30-second time steps and 6-digit passcode.
 */

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;

/**
 * Generates a cryptographically random base32 MFA secret key (160-bit key).
 */
export function generateMfaSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(20);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += chars[bytes[i] % chars.length];
  }
  return secret;
}

/**
 * Decodes a base32 string into a Buffer.
 */
function base32ToBuffer(base32: string): Buffer {
  const cleanBase32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';

  for (let i = 0; i < cleanBase32.length; i++) {
    const val = alphabet.indexOf(cleanBase32.charAt(i));
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generates the current TOTP token for a given base32 secret and timestamp.
 */
export function generateTotp(secret: string, timestamp: number = Date.now()): string {
  const timeStep = Math.floor(timestamp / 1000 / TOTP_PERIOD);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const keyBuffer = base32ToBuffer(secret);
  const hmac = crypto.createHmac('sha1', keyBuffer).update(timeBuffer).digest();

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Validates a submitted TOTP passcode against the secret.
 * Allows a +/- 1 step window (skew allowance) to tolerate slight client/server clock drifts.
 */
export function verifyTotp(
  submittedCode: string,
  secret: string,
  timestamp: number = Date.now(),
  windowSteps = 1
): boolean {
  if (!submittedCode || submittedCode.length !== TOTP_DIGITS) {
    return false;
  }

  for (let i = -windowSteps; i <= windowSteps; i++) {
    const checkTime = timestamp + i * TOTP_PERIOD * 1000;
    const expected = generateTotp(secret, checkTime);
    if (crypto.timingSafeEqual(Buffer.from(submittedCode), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}
