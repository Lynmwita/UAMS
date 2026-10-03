export interface MpesaSTKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export function formatKenyanPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
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
  if (!payload.amount || payload.amount <= 0) {
    return { valid: false, error: 'Payment amount must be greater than zero.' };
  }
  if (!payload.accountReference || payload.accountReference.trim().length === 0) {
    return { valid: false, error: 'Account/Admission reference is required.' };
  }
  try {
    formatKenyanPhoneNumber(payload.phoneNumber);
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
  return { valid: true };
}
