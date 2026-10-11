import { NextResponse } from 'next/server';
import { verifyCallbackSecret, querySTK } from '@/lib/finance/daraja';
import { readPayment, completePayment, failPayment } from '@/lib/finance/ledger';

export async function POST(request: Request) {
  if (!verifyCallbackSecret(request)) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unauthorized callback.' }, { status: 401 });
  let callback;
  try { callback = (await request.json())?.Body?.stkCallback; } catch { /* Invalid JSON */ }
  if (!callback || typeof callback.CheckoutRequestID !== 'string' || !Number.isInteger(callback.ResultCode)) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid callback.' }, { status: 400 });
  try {
    const payment = await readPayment(callback.CheckoutRequestID);
    if (!payment || payment.merchantRequestId !== callback.MerchantRequestID) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unknown transaction.' }, { status: 400 });
    if (payment.status === 'settled' || payment.status === 'failed') return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed.' });
    if (callback.ResultCode !== 0) { await failPayment(payment); return NextResponse.json({ ResultCode: 0, ResultDesc: 'Failure recorded.' }); }
    const items = callback.CallbackMetadata?.Item;
    if (!Array.isArray(items)) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Missing metadata.' }, { status: 400 });
    const value = (name: string) => items.find((item: any) => item.Name === name)?.Value;
    const receipt = value('MpesaReceiptNumber');
    if (Number(value('Amount')) !== payment.amount || String(value('PhoneNumber')) !== payment.phoneNumber || typeof receipt !== 'string' || !/^[A-Z0-9]{8,20}$/.test(receipt)) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment metadata mismatch.' }, { status: 409 });
    const confirmation = await querySTK(payment.checkoutRequestId);
    if (String(confirmation.ResultCode) !== '0') return NextResponse.json({ ResultCode: 1, ResultDesc: 'Provider confirmation unavailable.' }, { status: 503 });
    await completePayment(payment, receipt);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Payment receipt recorded.' });
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unable to process payment. Retry callback.' }, { status: 503 });
  }
}
