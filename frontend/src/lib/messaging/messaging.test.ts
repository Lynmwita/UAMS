import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKenyanPhone, isValidEmailAddress } from './phone';
import { sendSmsViaAfricasTalking, getAfricasTalkingConfig } from './africas-talking';
import { sendEmailViaResend, sendEmailViaSmtp } from './email';
import { dispatchNotification, messagingProviderStatus } from './dispatcher';

test('phone normalization: common Kenyan formats become E.164', () => {
  assert.equal(normalizeKenyanPhone('0712345678'), '+254712345678');
  assert.equal(normalizeKenyanPhone('0712 345 678'), '+254712345678');
  assert.equal(normalizeKenyanPhone('+254 712 345 678'), '+254712345678');
  assert.equal(normalizeKenyanPhone('254712345678'), '+254712345678');
  assert.equal(normalizeKenyanPhone('0112345678'), '+254112345678');
  assert.equal(normalizeKenyanPhone('12345'), null);
  assert.equal(normalizeKenyanPhone('+15551234567'), null);
  assert.equal(normalizeKenyanPhone('0812345678'), null);
  assert.equal(normalizeKenyanPhone(712345678), null);
  assert.equal(isValidEmailAddress('student@university.ac.ke'), true);
  assert.equal(isValidEmailAddress('not-an-email'), false);
});

function fakeFetch(payload: unknown, ok = true, status = 200) {
  return async () => ({ ok, status, json: async () => payload }) as Response;
}

test("africa's talking: sandbox config detection and a successful send", async () => {
  const config = getAfricasTalkingConfig({ AT_API_KEY: 'test', AT_USERNAME: 'sandbox' } as unknown as NodeJS.ProcessEnv);
  assert.ok(config);
  assert.equal(config!.sandbox, true);
  assert.equal(getAfricasTalkingConfig({} as unknown as NodeJS.ProcessEnv), null);

  const result = await sendSmsViaAfricasTalking(
    { to: '+254712345678', message: 'Hello' },
    {
      config,
      fetchFn: fakeFetch({ SMSMessageData: { Message: 'Sent', Recipients: [{ number: '+254712345678', status: 'Success', messageId: 'AT-123', cost: 'KES 0.8000' }] } }) as any,
    }
  );
  assert.equal(result.status, 'sent');
  assert.equal(result.providerMessageId, 'AT-123');
  assert.equal(result.costAmount, 0.8);
  assert.equal(result.mode, 'live');
});

test("africa's talking: provider rejection becomes a failed result with a reason", async () => {
  const result = await sendSmsViaAfricasTalking(
    { to: '+254712345678', message: 'Hello' },
    {
      config: { apiKey: 'x', username: 'sandbox', sandbox: true },
      fetchFn: fakeFetch({ SMSMessageData: { Message: 'Sent', Recipients: [{ number: '+254712345678', status: 'InsufficientBalance', messageId: 'AT-9', cost: 'KES 0.0000' }] } }) as any,
    }
  );
  assert.equal(result.status, 'failed');
  assert.match(result.error || '', /InsufficientBalance/);
});

test('resend email: success returns the provider id; smtp sender is used when injected', async () => {
  const sent = await sendEmailViaResend(
    { to: 'a@university.ac.ke', subject: 'Hi', text: 'Body' },
    { config: { key: 'rk', from: 'UAMS <no-reply@university.ac.ke>' }, fetchFn: fakeFetch({ id: 'email-1' }) as any }
  );
  assert.equal(sent.status, 'sent');
  assert.equal(sent.providerMessageId, 'email-1');

  const smtp = await sendEmailViaSmtp(
    { to: 'a@university.ac.ke', subject: 'Hi', text: 'Body' },
    {
      config: { host: 'mail.example', port: 587, from: 'UAMS <no-reply@university.ac.ke>', secure: false },
      sender: async () => ({ messageId: 'smtp-1' }),
    }
  );
  assert.equal(smtp.status, 'sent');
  assert.equal(smtp.provider, 'smtp');
});

test('dispatcher: mock mode is honest, normalizes phones, and can simulate failure', async () => {
  const env = {} as unknown as NodeJS.ProcessEnv;
  assert.equal(messagingProviderStatus(env).mode, 'mock');

  const ok = await dispatchNotification({ channel: 'sms', recipientIdentifier: '0712 345 678', messageContent: 'Fee reminder' }, { env });
  assert.equal(ok.normalizedRecipient, '+254712345678');
  assert.equal(ok.result.status, 'sent');
  assert.equal(ok.result.mode, 'mock');
  assert.equal(ok.result.provider, 'mock');

  const bad = await dispatchNotification({ channel: 'sms', recipientIdentifier: '123', messageContent: 'x' }, { env });
  assert.equal(bad.result.status, 'failed');
  assert.match(bad.result.error || '', /Invalid Kenyan phone/);

  const forcedFail = await dispatchNotification({ channel: 'sms', recipientIdentifier: '0700000000', messageContent: 'x' }, { env });
  assert.equal(forcedFail.result.status, 'failed');
  assert.equal(forcedFail.result.mode, 'mock');

  const badEmail = await dispatchNotification({ channel: 'email', recipientIdentifier: 'nope', messageContent: 'x' }, { env });
  assert.equal(badEmail.result.status, 'failed');
});

test('dispatcher: live env routes SMS through the injected transport', async () => {
  const env = { AT_API_KEY: 'k', AT_USERNAME: 'sandbox' } as unknown as NodeJS.ProcessEnv;
  assert.equal(messagingProviderStatus(env).sms.configured, true);
  const res = await dispatchNotification(
    { channel: 'sms', recipientIdentifier: '0712345678', messageContent: 'Exam card ready' },
    { env, fetchFn: fakeFetch({ SMSMessageData: { Recipients: [{ status: 'Success', messageId: 'AT-77', cost: 'KES 0.8000' }] } }) as any }
  );
  assert.equal(res.result.provider, 'africas_talking');
  assert.equal(res.result.providerMessageId, 'AT-77');
  assert.equal(res.result.mode, 'live');
});
