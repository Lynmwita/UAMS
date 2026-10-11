export interface MpesaSTKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export function formatKenyanPhoneNumber(phone: string): string {
  if (typeof phone !== 'string' || !/^\+?[\d\s()-]+$/.test(phone)) throw new Error('Invalid Kenyan mobile number.');
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (/^254[17]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^0[17]\d{8}$/.test(cleaned)) {
    return `254${cleaned.substring(1)}`;
  }
  if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    if (cleaned.length === 9) {
      return `254${cleaned}`;
    }
  }
  throw new Error(`Invalid Kenyan phone number: ${phone}`);
}

export function validateSTKPushPayload(payload: MpesaSTKPushRequest): { valid: boolean; error?: string } {
  if (!payload || typeof payload.amount !== 'number' || !Number.isSafeInteger(payload.amount) || payload.amount <= 0 || payload.amount > 250000) {
    return { valid: false, error: 'Payment amount must be a whole number from KES 1 to 250,000.' };
  }
  if (typeof payload.accountReference !== 'string' || !/^[A-Za-z0-9/_-]{1,50}$/.test(payload.accountReference)) {
    return { valid: false, error: 'Account/Admission reference is required.' };
  }
  if (typeof payload.transactionDesc !== 'string' || !payload.transactionDesc.trim()) return { valid: false, error: 'Payment description is required.' };
  try {
    formatKenyanPhoneNumber(payload.phoneNumber);
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
  return { valid: true };
}
