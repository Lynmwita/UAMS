import crypto from 'crypto';
import type { MpesaSTKPushRequest } from './mpesa';

export function darajaConfig() {
  const required = ['MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET','MPESA_SHORTCODE','MPESA_PASSKEY','MPESA_CALLBACK_URL','MPESA_CALLBACK_SECRET'] as const;
  for (const key of required) if (!process.env[key] || /your[_-]|placeholder/.test(process.env[key]!)) throw new Error('M-Pesa is not configured. Contact the finance office.');
  if (!['sandbox','production'].includes(process.env.MPESA_ENVIRONMENT || 'sandbox')) throw new Error('Invalid M-Pesa environment.');
  const callback = new URL(process.env.MPESA_CALLBACK_URL!);
  if (callback.protocol !== 'https:' || process.env.MPESA_CALLBACK_SECRET!.length < 32) throw new Error('M-Pesa requires an HTTPS callback and a callback secret of at least 32 characters.');
  callback.searchParams.set('token', process.env.MPESA_CALLBACK_SECRET!);
  return {
    base: process.env.MPESA_ENVIRONMENT === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke',
    shortcode: process.env.MPESA_SHORTCODE!, passkey: process.env.MPESA_PASSKEY!, callback: callback.toString(),
    key: process.env.MPESA_CONSUMER_KEY!, secret: process.env.MPESA_CONSUMER_SECRET!,
  };
}

async function darajaRequest(endpoint: string, body: Record<string, unknown>) {
  const config = darajaConfig();
  const auth = await fetch(`${config.base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${config.key}:${config.secret}`).toString('base64')}` },
    cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const oauth = await auth.json();
  if (!auth.ok || typeof oauth.access_token !== 'string') throw new Error('M-Pesa authorization failed.');
  const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Nairobi' }).replace(/\D/g, '');
  const response = await fetch(`${config.base}${endpoint}`, {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${oauth.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ BusinessShortCode: config.shortcode, Password: Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString('base64'), Timestamp: timestamp, ...body }),
  });
  const result = await response.json();
  if (!response.ok || result.errorCode) throw new Error('M-Pesa could not process this request. Check your handset and contact finance before retrying.');
  return result;
}

export async function initiateSTK(payload: MpesaSTKPushRequest) {
  const config = darajaConfig();
  const result = await darajaRequest('/mpesa/stkpush/v1/processrequest', {
    TransactionType: 'CustomerPayBillOnline', Amount: payload.amount, PartyA: payload.phoneNumber,
    PartyB: config.shortcode, PhoneNumber: payload.phoneNumber, CallBackURL: config.callback,
    AccountReference: payload.accountReference.replace(/[^A-Za-z0-9]/g,'').slice(0,12), TransactionDesc: payload.transactionDesc.slice(0,13),
  });
  if (String(result.ResponseCode) !== '0' || !result.CheckoutRequestID || !result.MerchantRequestID) throw new Error('M-Pesa rejected the STK request.');
  return result;
}

export async function querySTK(checkoutRequestId: string) {
  return darajaRequest('/mpesa/stkpushquery/v1/query', { CheckoutRequestID: checkoutRequestId });
}

export function verifyCallbackSecret(request: Request): boolean {
  const expected = process.env.MPESA_CALLBACK_SECRET || '';
  const actual = new URL(request.url).searchParams.get('token') || '';
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return expected.length >= 32 && a.length === b.length && crypto.timingSafeEqual(a,b);
}
