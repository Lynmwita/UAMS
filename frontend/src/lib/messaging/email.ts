import { DispatchResult, EmailMessage, FetchFn, ProviderNotConfiguredError } from './types';

/**
 * Transactional email dispatch.
 *
 * Two live routes, first configured wins:
 * 1. Resend HTTP API  - RESEND_KEY (API key) + EMAIL_FROM
 * 2. SMTP via nodemailer - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 *
 * EMAIL_FROM is the From address for both, e.g. "UAMS <no-reply@university.ac.ke>".
 * When neither is configured the dispatcher falls back to mock mode.
 */

export interface ResendConfig {
  key: string;
  from: string;
}

export function getResendConfig(env: NodeJS.ProcessEnv = process.env): ResendConfig | null {
  const key = (env.RESEND_KEY || env.RESEND_API_KEY)?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!key || !from) return null;
  return { key, from };
}

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  secure: boolean;
}

export function getSmtpConfig(env: NodeJS.ProcessEnv = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (!host || !from) return null;
  const port = Number(env.SMTP_PORT || 587);
  return {
    host,
    port,
    user: env.SMTP_USER?.trim() || undefined,
    pass: env.SMTP_PASS || undefined,
    from,
    secure: env.SMTP_SECURE === '1' || port === 465,
  };
}

export async function sendEmailViaResend(
  mail: EmailMessage,
  opts: { config?: ResendConfig | null; fetchFn?: FetchFn } = {}
): Promise<DispatchResult> {
  const config = opts.config !== undefined ? opts.config : getResendConfig();
  if (!config) throw new ProviderNotConfiguredError('Resend email');
  const fetchFn = opts.fetchFn || (globalThis.fetch as FetchFn);
  let res: Response;
  try {
    res = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: ['Bearer', config.key].join(' '),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: config.from, to: [mail.to], subject: mail.subject, text: mail.text }),
    });
  } catch (err: any) {
    return { status: 'failed', provider: 'resend', mode: 'live', error: `Resend could not be reached: ${err?.message || 'network error'}` };
  }
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok || !payload?.id) {
    return { status: 'failed', provider: 'resend', mode: 'live', error: payload?.message || `Resend returned HTTP ${res.status}.` };
  }
  return { status: 'sent', provider: 'resend', mode: 'live', providerMessageId: String(payload.id) };
}

export type SmtpSender = (mail: EmailMessage & { from: string }, config: SmtpConfig) => Promise<{ messageId: string }>;

const defaultSmtpSender: SmtpSender = async (mail, config) => {
  // Optional dynamic runtime load without strict compile-time dependency
  const nodemailer: any = (await (Function('return import("nodemailer")')() as Promise<any>)).default;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });
  const info = await transporter.sendMail({ from: mail.from, to: mail.to, subject: mail.subject, text: mail.text });
  return { messageId: String(info.messageId || '') };
};

export async function sendEmailViaSmtp(
  mail: EmailMessage,
  opts: { config?: SmtpConfig | null; sender?: SmtpSender } = {}
): Promise<DispatchResult> {
  const config = opts.config !== undefined ? opts.config : getSmtpConfig();
  if (!config) throw new ProviderNotConfiguredError('SMTP email');
  const sender = opts.sender || defaultSmtpSender;
  try {
    const info = await sender({ ...mail, from: config.from }, config);
    return { status: 'sent', provider: 'smtp', mode: 'live', providerMessageId: info.messageId || undefined };
  } catch (err: any) {
    return { status: 'failed', provider: 'smtp', mode: 'live', error: `SMTP send failed: ${err?.message || 'unknown error'}` };
  }
}
