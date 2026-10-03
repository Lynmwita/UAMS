import test from 'node:test';
import assert from 'node:assert';

function formatKenyanPhoneNumber(phone) {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('254') && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 10) return `254${cleaned.substring(1)}`;
  if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) return `254${cleaned}`;
  throw new Error(`Invalid Kenyan phone number: ${phone}`);
}

function validateSTKPushPayload(payload) {
  if (!payload.amount || payload.amount <= 0) {
    return { valid: false, error: 'Payment amount must be greater than zero.' };
  }
  if (!payload.accountReference || payload.accountReference.trim().length === 0) {
    return { valid: false, error: 'Account/Admission reference is required.' };
  }
  try {
    formatKenyanPhoneNumber(payload.phoneNumber);
  } catch (err) {
    return { valid: false, error: err.message };
  }
  return { valid: true };
}

test('M-Pesa STK Validator - Formats numbers to 254 standard format', () => {
  assert.strictEqual(formatKenyanPhoneNumber('0712345678'), '254712345678');
  assert.strictEqual(formatKenyanPhoneNumber('+254712345678'), '254712345678');
  assert.strictEqual(formatKenyanPhoneNumber('712345678'), '254712345678');
});

test('M-Pesa STK Validator - Validates payment payloads correctly', () => {
  const valid = validateSTKPushPayload({
    phoneNumber: '0712345678',
    amount: 15000,
    accountReference: 'STU/2026/001',
    transactionDesc: 'Semester 1 Tuition Fee',
  });
  assert.strictEqual(valid.valid, true);

  const invalidAmount = validateSTKPushPayload({
    phoneNumber: '0712345678',
    amount: 0,
    accountReference: 'STU/2026/001',
    transactionDesc: 'Fee',
  });
  assert.strictEqual(invalidAmount.valid, false);
});
