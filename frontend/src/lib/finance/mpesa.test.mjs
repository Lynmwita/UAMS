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

// Import pending STK ledger logic
import { registerPendingSTK, getPendingSTK, settleSTKPayment } from './pending-requests.ts';

test('M-Pesa Callback - Rejects settlement for uninitiated CheckoutRequestID', () => {
  const result = settleSTKPayment('ws_CO_FAKE_UNINITIATED_ID', 'QHJ9999999', 5000);
  assert.strictEqual(result.success, false);
  assert.match(result.error, /Unregistered or expired CheckoutRequestID/);
});

test('M-Pesa Callback - Successfully settles authentic initiated transaction', () => {
  const checkoutId = 'ws_CO_TEST_AUTHENTIC_01';
  registerPendingSTK({
    checkoutRequestId: checkoutId,
    merchantRequestId: 'MR_TEST_01',
    accountReference: 'BIT/2023/8849',
    phoneNumber: '254712345678',
    amount: 25000,
  });

  const pending = getPendingSTK(checkoutId);
  assert.strictEqual(pending?.status, 'pending');

  const settlement = settleSTKPayment(checkoutId, 'QHJ11223344', 25000);
  assert.strictEqual(settlement.success, true);
  assert.strictEqual(settlement.request?.status, 'settled');
});

test('M-Pesa Callback - Rejects duplicate receipt submission and amount mismatch', () => {
  const checkoutId = 'ws_CO_TEST_MISMATCH_02';
  registerPendingSTK({
    checkoutRequestId: checkoutId,
    merchantRequestId: 'MR_TEST_02',
    accountReference: 'BIT/2023/8849',
    phoneNumber: '254712345678',
    amount: 30000,
  });

  // Amount mismatch
  const mismatch = settleSTKPayment(checkoutId, 'QHJ99887766', 15000);
  assert.strictEqual(mismatch.success, false);
  assert.match(mismatch.error, /Amount mismatch/);

  // Duplicate receipt reuse
  const checkoutId2 = 'ws_CO_TEST_DUP_03';
  registerPendingSTK({
    checkoutRequestId: checkoutId2,
    merchantRequestId: 'MR_TEST_03',
    accountReference: 'BIT/2023/8849',
    phoneNumber: '254712345678',
    amount: 25000,
  });
  const dup = settleSTKPayment(checkoutId2, 'QHJ11223344', 25000); // reuse receipt from earlier test
  assert.strictEqual(dup.success, false);
  assert.match(dup.error, /Duplicate M-Pesa receipt/);
});

