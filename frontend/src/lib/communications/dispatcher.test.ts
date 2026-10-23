import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKenyanPhone } from './phone-sanitizer';
import { inspectMessageContent } from './content-guard';
import { sendSmsViaAfricasTalking } from './africas-talking';
import { executeDispatch, retryDispatch, MAX_RETRY_LIMIT, demoNotificationLogs } from './dispatcher-service';
import { GET, POST } from '@/app/api/v1/notifications/route';
import { POST as RETRY_POST } from '@/app/api/v1/notifications/[id]/retry/route';
import { createSignedToken } from '@/lib/auth/server-auth';
import { NextRequest } from 'next/server';

const originalFetch = globalThis.fetch;
const originalEnv = {
  AT_API_KEY: process.env.AT_API_KEY,
  AT_USERNAME: process.env.AT_USERNAME,
  AT_SENDER_ID: process.env.AT_SENDER_ID,
  ENABLE_LIVE_SMS: process.env.ENABLE_LIVE_SMS,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function createReq(role?: string, method = 'GET', body?: unknown, url = 'http://localhost:3000/api/v1/notifications') {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Origin', 'http://localhost:3000');
  if (role) {
    const token = createSignedToken({
      id: `usr-test-${role}`,
      email: `${role}@uams.ac.ke`,
      role,
    });
    headers.set('Authorization', `Bearer ${token}`);
  }
  return new NextRequest(new URL(url), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// =========================================================================
// 1. Phone Sanitizer & E.164 Tests (Catch 3)
// =========================================================================
test('phone sanitizer: normalizes Kenyan formats to E.164 and identifies carriers', () => {
  const safaricom1 = normalizeKenyanPhone('0712345678');
  assert.equal(safaricom1.valid, true);
  assert.equal(safaricom1.normalized, '+254712345678');
  assert.equal(safaricom1.carrierHint, 'Safaricom');

  const airtel1 = normalizeKenyanPhone('0733123456');
  assert.equal(airtel1.valid, true);
  assert.equal(airtel1.normalized, '+254733123456');
  assert.equal(airtel1.carrierHint, 'Airtel');

  const prefix254 = normalizeKenyanPhone('254712345678');
  assert.equal(prefix254.valid, true);
  assert.equal(prefix254.normalized, '+254712345678');

  const plus254 = normalizeKenyanPhone('+254 712 345 678');
  assert.equal(plus254.valid, true);
  assert.equal(plus254.normalized, '+254712345678');

  const badPhone = normalizeKenyanPhone('07123');
  assert.equal(badPhone.valid, false);
  assert.match(badPhone.error!, /Invalid phone number/);

  const lettersPhone = normalizeKenyanPhone('0712abc456');
  assert.equal(lettersPhone.valid, false);
});

// =========================================================================
// 2. Message Content Guard & Privacy Tests (Catch 3)
// =========================================================================
test('content guard: detects credential leaks and calculates segments accurately', () => {
  // Credential leak detection
  const leaked = inspectMessageContent('UAMS ALERT: Your password: Secret123! has been reset.');
  assert.equal(leaked.safe, false);
  assert.match(leaked.warnings[0], /cleartext credentials/);

  // Privacy protection for bank accounts
  const bankLeak = inspectMessageContent('Pay to bank account: 1234567890 immediately.');
  assert.equal(bankLeak.warnings.some(w => w.includes('bank account')), true);

  // Segment calculation for standard 160-char GSM message
  const normal = inspectMessageContent('UAMS NOTICE: Exam clearance card generated for Semester 1. Download from the portal.');
  assert.equal(normal.safe, true);
  assert.equal(normal.segmentCount, 1);
  assert.equal(normal.encoding, 'GSM-7');

  // Multi-segment message
  const longText = 'A'.repeat(200);
  const multiSegment = inspectMessageContent(longText);
  assert.equal(multiSegment.safe, true);
  assert.equal(multiSegment.segmentCount, 2);
});

// =========================================================================
// 3. Africa's Talking Gateway: Sandbox Default & Live Switches (Catch 1 & 2)
// =========================================================================
test('africas-talking: defaults to safe sandbox simulation with zero live airtime consumed', async () => {
  delete process.env.ENABLE_LIVE_SMS;
  process.env.AT_API_KEY = 'test_key_server_only';

  const res = await sendSmsViaAfricasTalking({
    to: '0712345678',
    message: 'UAMS NOTICE: Fee statement updated. Check portal.',
  });

  assert.equal(res.success, true);
  assert.equal(res.isLive, false);
  assert.equal(res.status, 'sent');
  assert.match(res.providerMessageId!, /^ATXid_sbx_/);
  assert.equal(res.cost, 0.80);
});

test('africas-talking: live mode requires explicit switch and server API key', async () => {
  process.env.ENABLE_LIVE_SMS = 'true';
  delete process.env.AT_API_KEY;

  const resNoKey = await sendSmsViaAfricasTalking({
    to: '0712345678',
    message: 'Live test message',
  });

  assert.equal(resNoKey.success, false);
  assert.equal(resNoKey.status, 'failed');
  assert.match(resNoKey.errorMessage!, /AT_API_KEY is not configured/);
});

// =========================================================================
// 4. Financial Brakes: Max 3 Retries Enforcement (Catch 2)
// =========================================================================
test('brakes: enforces max 3 retries per message and marks permanently failed', async () => {
  // Dispatch a message with an invalid phone format to create a failed record
  const dispatchRes = await executeDispatch({
    recipient_type: 'student',
    recipient_identifier: 'invalid_number',
    message_content: 'Test message for retry limits',
    channel: 'sms',
  }, true);

  assert.equal(dispatchRes.success, false);
  const logId = dispatchRes.log.id;
  assert.equal(dispatchRes.log.retry_count, 0);

  // Retry 1
  const r1 = await retryDispatch(logId, true);
  assert.equal(r1.log?.retry_count, 1);

  // Retry 2
  const r2 = await retryDispatch(logId, true);
  assert.equal(r2.log?.retry_count, 2);

  // Retry 3 (Reached limit)
  const r3 = await retryDispatch(logId, true);
  assert.equal(r3.log?.retry_count, 3);

  // Retry 4 (Must be blocked by financial brakes)
  const r4 = await retryDispatch(logId, true);
  assert.equal(r4.success, false);
  assert.match(r4.error!, /Maximum retry limit of 3 reached/);
});

// =========================================================================
// 5. Security & RBAC Checks: Server Route Protection (Catch 1 & 2)
// =========================================================================
test('api: unauthenticated requests are rejected with 401', async () => {
  const res = await GET(createReq(undefined, 'GET'));
  assert.equal(res.status, 401);
});

test('api: students cannot dispatch notifications or trigger retries (403)', async () => {
  const studentPost = await POST(createReq('student', 'POST', {
    recipient_type: 'student',
    recipient_identifier: '+254712345678',
    message_content: 'Student trying to broadcast',
  }));
  assert.equal(studentPost.status, 403);

  const studentRetry = await RETRY_POST(
    createReq('student', 'POST', undefined, 'http://localhost:3000/api/v1/notifications/ntf-01/retry'),
    { params: Promise.resolve({ id: 'ntf-01' }) }
  );
  assert.equal(studentRetry.status, 403);
});

test('api: authorized staff (registrar/finance_officer) can dispatch and view telemetry', async () => {
  const staffPost = await POST(createReq('registrar', 'POST', {
    recipient_type: 'student',
    recipient_identifier: '0712345678',
    message_content: 'UAMS NOTICE: Exam clearance approved. Download your card.',
    channel: 'sms',
  }));

  assert.equal(staffPost.status, 200);
  const postData = await staffPost.json();
  assert.equal(postData.success, true);
  assert.equal(postData.data.recipient_identifier, '+254712345678');
  assert.equal(postData.data.cost, 0.80);

  // Verify GET response telemetry
  const staffGet = await GET(createReq('finance_officer', 'GET'));
  assert.equal(staffGet.status, 200);
  const getData = await staffGet.json();
  assert.equal(getData.success, true);
  assert.equal(getData.meta.airtime_brakes_active, true);
  assert.equal(getData.meta.max_retries, 3);

  // Catch 1 Check: Verify NO API key is leaked in the response JSON or meta
  const jsonString = JSON.stringify(getData);
  assert.equal(jsonString.includes('AT_API_KEY'), false);
  assert.equal(jsonString.includes('test_key_server_only'), false);
});
