/**
 * Message Content Guard & Privacy Sanitizer
 * Implements KDPA & Data Protection safeguards:
 * - Detects sensitive data leaks (PINs, passwords, raw tokens, full financial sheets)
 * - Calculates SMS segment length and cost factors
 * - Suggests privacy-preserving minimal wording
 */

export interface ContentAuditResult {
  safe: boolean;
  warnings: string[];
  segmentCount: number;
  characterCount: number;
  encoding: 'GSM-7' | 'Unicode';
  suggestedAction?: string;
}

export function inspectMessageContent(content: string): ContentAuditResult {
  const warnings: string[] = [];
  const text = (content || '').trim();
  const characterCount = text.length;

  if (!text) {
    return {
      safe: false,
      warnings: ['Message content cannot be empty.'],
      segmentCount: 0,
      characterCount: 0,
      encoding: 'GSM-7',
    };
  }

  // 1. Check for password / credentials leakage
  if (/(?:password|passwd|pwd|pin|secret|bearer\s+|jwt)\s*[:=]\s*\S+/i.test(text)) {
    warnings.push('CRITICAL: Message appears to expose cleartext credentials (password, PIN, or auth token). Never send credentials over plain SMS.');
  }

  // 2. Check for detailed banking / financial statements in SMS
  // KDPA best practice: notify student of changes and instruct them to log into secure portal
  if (/(?:account\s*(?:number)?|bank\s*acc(?:ount)?|iban|swift)\s*[:=]?\s*\d{6,}/i.test(text)) {
    warnings.push('PRIVACY WARNING: Full bank account numbers detected. Under KDPA 2019, advise student to check the portal rather than exposing financial details over plain text.');
  }

  // 3. Detect non-GSM characters (forces Unicode 70 chars per segment)
  // Standard GSM-7 characters check
  const gsm7Regex = /^[\u000A\u000D\u0020-\u007E\u00A1\u00A3\u00A4\u00A5\u00A7\u00BF\u00C4\u00C5\u00C6\u00C7\u00C9\u00D1\u00D6\u00D8\u00DC\u00DF\u00E0\u00E4\u00E5\u00E6\u00E7\u00E8\u00E9\u00EC\u00F1\u00F2\u00F6\u00F8\u00F9\u00FC\u0393\u0394\u0398\u039B\u039E\u03A0\u03A3\u03A6\u03A8\u03A9]*$/;
  const isGsm7 = gsm7Regex.test(text);
  const encoding = isGsm7 ? 'GSM-7' : 'Unicode';

  // SMS segment calculation
  let segmentCount = 1;
  if (encoding === 'GSM-7') {
    if (characterCount > 160) {
      segmentCount = Math.ceil(characterCount / 153);
    }
  } else {
    // Unicode (e.g. emojis)
    if (characterCount > 70) {
      segmentCount = Math.ceil(characterCount / 67);
    }
  }

  if (segmentCount > 3) {
    warnings.push(`Length notice: This message requires ${segmentCount} SMS segments (${characterCount} characters), which may increase dispatch costs.`);
  }

  const safe = warnings.filter(w => w.startsWith('CRITICAL')).length === 0;

  return {
    safe,
    warnings,
    segmentCount,
    characterCount,
    encoding,
    suggestedAction: warnings.length > 0 ? 'Review sensitive data and shorten to protect student privacy.' : undefined,
  };
}
