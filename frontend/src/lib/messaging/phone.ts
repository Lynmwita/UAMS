/**
 * Kenyan phone number normalization to E.164.
 *
 * Accepts the formats staff actually type:
 *   0712 345 678, 0712345678, 0112345678, 254712345678, +254 712 345 678
 * Returns +254XXXXXXXXX, or null when the number cannot be a Kenyan mobile.
 */
export function normalizeKenyanPhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith('254') && digits.length === 12) digits = digits;
  else if (digits.startsWith('0') && digits.length === 10) digits = '254' + digits.slice(1);
  else return null;
  const e164 = '+' + digits;
  // Kenyan mobiles start 254 1xx or 254 7xx.
  if (!/^\+254[17]\d{8}$/.test(e164)) return null;
  return e164;
}

export function isValidEmailAddress(input: unknown): input is string {
  return typeof input === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}
