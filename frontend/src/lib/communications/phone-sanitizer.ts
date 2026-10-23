/**
 * Phone number validation and E.164 normalization
 * Focused on Kenyan telecoms (Safaricom, Airtel, Telkom) and international E.164 standards.
 */

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  countryCode?: string;
  nationalNumber?: string;
  carrierHint?: 'Safaricom' | 'Airtel' | 'Telkom' | 'Other';
  error?: string;
}

export function normalizeKenyanPhone(input: string): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Phone number is required.' };
  }

  // Remove whitespace, hyphens, brackets, dots
  let cleaned = input.trim().replace(/[\s\-\(\)\.]+/g, '');

  // Handle leading double zeros e.g. 00254...
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // Handle 07... or 01... (standard 10-digit local Kenyan mobile)
  if (/^0[17]\d{8}$/.test(cleaned)) {
    cleaned = '+254' + cleaned.substring(1);
  } else if (/^254[17]\d{8}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  } else if (/^\+254[17]\d{8}$/.test(cleaned)) {
    // Already in correct format
  } else if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    // Valid international E.164 number outside Kenya
    return {
      valid: true,
      normalized: cleaned,
      carrierHint: 'Other',
    };
  } else {
    return {
      valid: false,
      error: 'Invalid phone number. Kenyan numbers must follow format: +254 7XX XXX XXX or +254 1XX XXX XXX (or international E.164).',
    };
  }

  // Determine carrier hint for Kenyan prefixes
  let carrierHint: PhoneValidationResult['carrierHint'] = 'Other';
  const prefix = cleaned.substring(4, 6); // digits after +254
  const prefixNum = parseInt(prefix, 10);

  // Safaricom: 0700-0729, 0740-0743, 0745-0746, 0748, 0757-0759, 0768-0769, 0790-0799, 0110-0115
  // Airtel: 0730-0739, 0750-0756, 0780-0789, 0100-0106
  // Telkom: 0770-0779
  if (cleaned.startsWith('+2547') || cleaned.startsWith('+2541')) {
    const fullPrefix = cleaned.substring(4, 7);
    if (['70', '71', '72', '74', '79'].some(p => cleaned.startsWith(`+254${p}`)) || ['110', '111', '112', '113', '114', '115'].some(p => cleaned.startsWith(`+254${p}`))) {
      carrierHint = 'Safaricom';
    } else if (['73', '75', '78'].some(p => cleaned.startsWith(`+254${p}`)) || ['100', '101', '102', '103', '104', '105', '106'].some(p => cleaned.startsWith(`+254${p}`))) {
      carrierHint = 'Airtel';
    } else if (cleaned.startsWith('+25477')) {
      carrierHint = 'Telkom';
    }
  }

  return {
    valid: true,
    normalized: cleaned,
    countryCode: '+254',
    nationalNumber: cleaned.substring(4),
    carrierHint,
  };
}
