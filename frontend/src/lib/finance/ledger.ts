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
  if(payment.userId.startsWith('usr-')){const pending=registerPendingSTK(payment);Object.assign(pending,{userId:payment.userId});return;}
  const client = ledgerClient();
  if (!client) throw new Error('Persistent payment ledger is required.');
  const { error } = await client.from('uams_stk_requests').insert({ ...payment, status: 'pending', createdAt: Date.now() });
  if (error) throw new Error('Could not record the pending payment. Contact finance before retrying.');
}
export async function readPayment(id: string): Promise<Payment | null> {
  const demo=getPendingSTK(id) as Payment|undefined;
  if(demo?.userId?.startsWith('usr-'))return demo;
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
  if (payment.userId.startsWith('usr-')) {
    const result = settleSTKPayment(payment.checkoutRequestId, receipt, payment.amount);
    if (!result.success) throw new Error(result.error);
    return;
  }
  if(!client)throw new Error('Persistent payment ledger is required.');
  // Receipt, authoritative transaction and invoice allocation commit together.
  const { data, error } = await client.rpc('uams_settle_stk', {p_checkout:payment.checkoutRequestId,p_receipt:receipt});
  if (error || data?.status!=='settled') throw new Error('Payment could not be allocated to the institutional ledger. Retry the provider callback.');
}
export async function failPayment(payment: Payment) {
  if(payment.userId.startsWith('usr-')){payment.status='failed';return;}
  const client = ledgerClient();
  if (!client) throw new Error('Persistent payment ledger is required.');
  const { error } = await client.from('uams_stk_requests').update({status:'failed'}).eq('checkoutRequestId',payment.checkoutRequestId).eq('status','pending');
  if (error) throw new Error('Could not update payment status.');
}
