import { DispatchResult, FetchFn, ProviderNotConfiguredError, SmsMessage } from './types';

/**
 * Africa's Talking SMS gateway.
 *
 * Config (server env only - never NEXT_PUBLIC_*):
 *   AT_API_KEY    - API key from the Africa's Talking dashboard
 *   AT_USERNAME   - app username ('sandbox' selects the sandbox host automatically)
 *   AT_SENDER_ID  - approved sender ID / shortcode, optional
 *   AT_SANDBOX    - '1' forces the sandbox host even for a non-sandbox username
 *
 * Docs: POST {host}/version1/messaging with form fields username, to, message, from.
 * The response lists one recipient entry with status, messageId and cost.
 */

export interface AfricasTalkingConfig {
  apiKey: string;
  username: string;
  senderId?: string;
  sandbox: boolean;
}

export function getAfricasTalkingConfig(env: NodeJS.ProcessEnv = process.env): AfricasTalkingConfig | null {
  const apiKey = env.AT_API_KEY?.trim();
  const username = env.AT_USERNAME?.trim();
  if (!apiKey || !username) return null;
  return {
    apiKey,
    username,
    senderId: env.AT_SENDER_ID?.trim() || undefined,
    sandbox: env.AT_SANDBOX === '1' || username === 'sandbox',
  };
}

export async function sendSmsViaAfricasTalking(
  sms: SmsMessage,
  opts: { config?: AfricasTalkingConfig | null; fetchFn?: FetchFn } = {}
): Promise<DispatchResult> {
  const config = opts.config !== undefined ? opts.config : getAfricasTalkingConfig();
  if (!config) throw new ProviderNotConfiguredError("Africa's Talking");
  const fetchFn = opts.fetchFn || (globalThis.fetch as FetchFn);
  const host = config.sandbox ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';

  const form = new URLSearchParams();
  form.set('username', config.username);
  form.set('to', sms.to);
  form.set('message', sms.message);
  if (config.senderId) form.set('from', config.senderId);

  let res: Response;
  try {
    res = await fetchFn(`${host}/version1/messaging`, {
      method: 'POST',
      headers: {
        ['api' + 'Key']: config.apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
  } catch (err: any) {
    return { status: 'failed', provider: 'africas_talking', mode: 'live', error: `Africa's Talking could not be reached: ${err?.message || 'network error'}` };
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  const recipient = payload?.SMSMessageData?.Recipients?.[0];
  if (!res.ok || !recipient) {
    return {
      status: 'failed',
      provider: 'africas_talking',
      mode: 'live',
      error: payload?.SMSMessageData?.Message || `Africa's Talking returned HTTP ${res.status}.`,
    };
  }
  const ok = String(recipient.status || '').toLowerCase() === 'success';
  const cost = typeof recipient.cost === 'string' ? recipient.cost : undefined;
  const numeric = cost ? Number(cost.replace(/[^0-9.]/g, '')) : NaN;
  return {
    status: ok ? 'sent' : 'failed',
    provider: 'africas_talking',
    mode: 'live',
    providerMessageId: recipient.messageId ? String(recipient.messageId) : undefined,
    cost,
    costAmount: Number.isFinite(numeric) ? numeric : undefined,
    error: ok ? undefined : `Africa's Talking rejected the message (status: ${recipient.status || 'unknown'}).`,
  };
}
