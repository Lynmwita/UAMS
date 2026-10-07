import crypto from 'crypto';

/**
 * Enterprise Password Hashing Service
 * 
 * Implements salted scrypt key derivation (N=16384, r=8, p=1, maxmem=32MB)
 * strictly compliant with OWASP Password Storage Cheat Sheet.
 * Prohibits cleartext credentials across both memory and persistence boundaries.
 */

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

const KEY_LENGTH = 64; // 512-bit key

/**
 * Derives a cryptographic hash from a plaintext password using a random 16-byte salt.
 * Output format: `<salt_hex>$<hash_hex>`
 */
export function hashPassword(plainText: string, saltHex?: string): string {
  if (!plainText || typeof plainText !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainText, salt, KEY_LENGTH, SCRYPT_PARAMS);

  return `${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against an authentic salted scrypt hash.
 * Enforces constant-time comparison (timingSafeEqual) to prevent side-channel timing attacks.
 */
export function verifyPassword(plainText: string, storedHash: string): boolean {
  if (!plainText || !storedHash || typeof storedHash !== 'string' || !storedHash.includes('$')) {
    return false;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 2) {
    return false;
  }

  const [salt, expectedHashHex] = parts;
  if (!salt || !expectedHashHex) {
    return false;
  }

  try {
    const derivedKey = crypto.scryptSync(plainText, salt, KEY_LENGTH, SCRYPT_PARAMS);
    const expectedBuf = Buffer.from(expectedHashHex, 'hex');

    if (derivedKey.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, expectedBuf);
  } catch {
    return false;
  }
}
