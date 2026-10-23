/**
 * SMS content & privacy guard (KDPA safeguard).
 *
 * SMS is plain text on other people's phones and lock screens. Passwords,
 * PINs, one-time codes and bank account numbers must never travel over it -
 * students should be told to log into the portal instead. This guard scans
 * outgoing SMS text and BLOCKS dispatch when it finds cleartext secrets.
 * (Email is not blocked by this guard; the portal-first templates are the
 * recommended wording for both channels.)
 */

export interface ContentGuardFinding {
  kind: 'password' | 'pin' | 'token' | 'bank_account' | 'card_number';
  label: string;
}

const RULES: { kind: ContentGuardFinding['kind']; label: string; pattern: RegExp }[] = [
  { kind: 'password', label: 'a password written in clear text', pattern: /\b(password|passwd|pwd)\b\s*[:=]?\s*\S+/i },
  { kind: 'pin', label: 'a PIN written in clear text', pattern: /\bpin\b\s*[:=]?\s*\d{3,}/i },
  { kind: 'token', label: 'a token, OTP or secret code', pattern: /\b(otp|token|secret|api[-_ ]?key|verification code)\b\s*[:=]?\s*\S+/i },
  { kind: 'card_number', label: 'a bank card number', pattern: /\b(?:\d[ -]?){13,19}\b/ },
  { kind: 'bank_account', label: 'a raw bank account number', pattern: /\b(account|a\/c)\b[^.]{0,20}\b\d{9,}\b/i },
];

export function scanSmsContent(message: string): ContentGuardFinding[] {
  const findings: ContentGuardFinding[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(message)) findings.push({ kind: rule.kind, label: rule.label });
  }
  return findings;
}

export function contentGuardError(findings: ContentGuardFinding[]): string {
  return `Blocked by the SMS content guard: the message appears to contain ${findings.map((f) => f.label).join(' and ')}. Never send secrets over SMS - ask the student to log into the portal instead.`;
}

/** GSM-7 segment accounting: 160 chars for one segment, then 153 per part. */
export function smsSegments(message: string): number {
  const len = message.length;
  if (len <= 160) return 1;
  return Math.ceil(len / 153);
}

/** UAMS planning rate: KES 0.80 per SMS segment (matches the benchmark costing). */
export const SMS_SEGMENT_COST_KES = 0.8;

export function estimatedSmsCost(message: string): number {
  return smsSegments(message) * SMS_SEGMENT_COST_KES;
}
