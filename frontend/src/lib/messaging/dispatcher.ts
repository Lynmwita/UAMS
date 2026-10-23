import { getAfricasTalkingConfig, sendSmsViaAfricasTalking } from './africas-talking';
import { getResendConfig, getSmtpConfig, sendEmailViaResend, sendEmailViaSmtp, SmtpSender } from './email';
import { isValidEmailAddress, normalizeKenyanPhone } from './phone';
import { DispatchResult, FetchFn } from './types';

/**
 * The UAMS notification dispatcher.
 *
 * One entry point - dispatchNotification() - used by the notifications API
 * for both first sends and retries. It picks a live provider when one is
 * configured, and otherwise runs in MOCK mode: the message is "sent" inside
 * UAMS only, clearly labelled mode:'mock', so demos and local development
 * never break and never pretend to be real delivery.
 *
 * Mock failures can be forced for testing by using a phone number ending in
 * 0000, or an email address containing "fail" (e.g. fail@university.ac.ke).
 */

export interface DispatchInput {
  channel: 'sms' | 'email' | string;
  recipientIdentifier: string;
  subject?: string;
  messageContent: string;
}

export interface DispatcherDeps {
  fetchFn?: FetchFn;
  smtpSender?: SmtpSender;
  env?: NodeJS.ProcessEnv;
}

function mockDispatch(input: DispatchInput, normalizedTo: string): DispatchResult {
  const shouldFail = normalizedTo.endsWith('0000') || normalizedTo.toLowerCase().includes('fail');
  if (shouldFail) {
    return {
      status: 'failed',
      provider: 'mock',
      mode: 'mock',
      error: 'Mock provider simulated a delivery failure for this recipient.',
    };
  }
  return {
    status: 'sent',
    provider: 'mock',
    mode: 'mock',
    providerMessageId: `mock-${Date.now()}`,
    cost: 'KES 0.00 (mock)',
    costAmount: 0,
  };
}

export async function dispatchNotification(input: DispatchInput, deps: DispatcherDeps = {}): Promise<{ result: DispatchResult; normalizedRecipient: string }> {
  const env = deps.env || process.env;
  const channel = String(input.channel || 'sms').toLowerCase();

  if (channel === 'sms') {
    const to = normalizeKenyanPhone(input.recipientIdentifier);
    if (!to) {
      return {
        normalizedRecipient: String(input.recipientIdentifier || ''),
        result: { status: 'failed', provider: 'africas_talking', mode: getAfricasTalkingConfig(env) ? 'live' : 'mock', error: 'Invalid Kenyan phone number. Use a format like 0712345678 or +254712345678.' },
      };
    }
    const config = getAfricasTalkingConfig(env);
    if (!config) return { normalizedRecipient: to, result: mockDispatch(input, to) };
    const result = await sendSmsViaAfricasTalking({ to, message: input.messageContent }, { config, fetchFn: deps.fetchFn });
    return { normalizedRecipient: to, result };
  }

  if (channel === 'email') {
    const to = String(input.recipientIdentifier || '').trim();
    if (!isValidEmailAddress(to)) {
      return {
        normalizedRecipient: to,
        result: { status: 'failed', provider: 'resend', mode: getResendConfig(env) || getSmtpConfig(env) ? 'live' : 'mock', error: 'Invalid email address.' },
      };
    }
    const mail = { to, subject: input.subject || 'UAMS Notification', text: input.messageContent };
    const resend = getResendConfig(env);
    if (resend) return { normalizedRecipient: to, result: await sendEmailViaResend(mail, { config: resend, fetchFn: deps.fetchFn }) };
    const smtp = getSmtpConfig(env);
    if (smtp) return { normalizedRecipient: to, result: await sendEmailViaSmtp(mail, { config: smtp, sender: deps.smtpSender }) };
    return { normalizedRecipient: to, result: mockDispatch(input, to) };
  }

  return {
    normalizedRecipient: String(input.recipientIdentifier || ''),
    result: { status: 'failed', provider: 'system', mode: 'mock', error: `Unsupported channel: ${channel}. Use sms or email.` },
  };
}

/** Which providers are live right now - shown honestly in the UI header. */
export function messagingProviderStatus(env: NodeJS.ProcessEnv = process.env) {
  const sms = getAfricasTalkingConfig(env);
  const resend = getResendConfig(env);
  const smtp = getSmtpConfig(env);
  return {
    sms: sms ? { configured: true, provider: 'africas_talking', sandbox: sms.sandbox, senderId: sms.senderId || null } : { configured: false, provider: null as string | null, sandbox: false, senderId: null },
    email: resend
      ? { configured: true, provider: 'resend' }
      : smtp
        ? { configured: true, provider: 'smtp' }
        : { configured: false, provider: null as string | null },
    mode: sms || resend || smtp ? ('live' as const) : ('mock' as const),
  };
}

export function isRetryableStatus(status: string): boolean {
  return status === 'failed' || status === 'queued';
}
