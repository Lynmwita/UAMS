import { createClient } from '@supabase/supabase-js';
import { registerPendingSTK, getPendingSTK, settleSTKPayment, type PendingSTKRequest } from './pending-requests';

export type Payment = PendingSTKRequest & { userId: string };
function ledgerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function checkLedger() {
  const client = ledgerClient();
  if (!client) {
    if (process.env.NODE_ENV === 'production') throw new Error('Persistent payment ledger is required.');
    return;
  }
  const { error } = await client.from('uams_stk_requests').select('checkoutRequestId').limit(1);
  if (error) throw new Error('Payment ledger is unavailable. Apply the payment ledger setup SQL before taking payments.');
}
export async function savePayment(payment: Omit<Payment, 'status' | 'createdAt'>) {
  const client = ledgerClient();
  if (!client) { const pending = registerPendingSTK(payment); Object.assign(pending, { userId: payment.userId }); return; }
  const { error } = await client.from('uams_stk_requests').insert({ ...payment, status: 'pending', createdAt: Date.now() });
  if (error) throw new Error('Could not record the pending payment. Contact finance before retrying.');
}
export async function readPayment(id: string): Promise<Payment | null> {
  const client = ledgerClient();
  if (!client) {
    if (process.env.NODE_ENV === 'production') throw new Error('Persistent payment ledger is required.');
    return getPendingSTK(id) as Payment || null;
  }
  const { data, error } = await client.from('uams_stk_requests').select('*').eq('checkoutRequestId', id).maybeSingle();
  if (error) throw new Error('Payment ledger is unavailable.');
  return data as Payment | null;
}
export async function completePayment(payment: Payment, receipt: string) {
  const client = ledgerClient();
  if (!client) {
    const result = settleSTKPayment(payment.checkoutRequestId, receipt, payment.amount);
    if (!result.success) throw new Error(result.error);
    return;
  }
  // Conditional transition and a UNIQUE receipt prevent replay and concurrent double settlement.
  const { data, error } = await client.from('uams_stk_requests').update({ status: 'settled', mpesaReceiptNumber: receipt, settledAt: new Date().toISOString() }).eq('checkoutRequestId', payment.checkoutRequestId).eq('status','pending').select('status');
  if (error || !data?.length) throw new Error('Payment was already processed or could not be settled.');
}
export async function failPayment(payment: Payment) {
  const client = ledgerClient();
  if (!client) { payment.status = 'failed'; return; }
  const { error } = await client.from('uams_stk_requests').update({status:'failed'}).eq('checkoutRequestId',payment.checkoutRequestId).eq('status','pending');
  if (error) throw new Error('Could not update payment status.');
}
