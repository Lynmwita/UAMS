import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { readPayment } from '@/lib/finance/ledger';
import { isDemoUser } from '@/lib/auth/scope';

export async function GET(request: Request) {
  const auth = await requireServerAuth(request, ['student','finance_officer']);
  if ('errorResponse' in auth) return auth.errorResponse;
  const id = new URL(request.url).searchParams.get('checkoutRequestId');
  if (!id || id.length > 150) return NextResponse.json({ success: false, error: 'Checkout request ID required.' }, { status: 400 });
  try {
    const payment = await readPayment(id);
    if (!payment || ((auth.user.role === 'student' || isDemoUser(auth.user)) && payment.userId !== auth.user.id)) return NextResponse.json({ success: false, error: 'Payment not found.' }, { status: 404 });
    return NextResponse.json({ success: true, status: payment.status, amount: payment.amount, receipt: payment.mpesaReceiptNumber, accountReference: payment.accountReference }, { headers: { 'Cache-Control':'no-store' } });
  } catch { return NextResponse.json({ success: false, error: 'Payment status is temporarily unavailable.' }, { status: 503 }); }
}
