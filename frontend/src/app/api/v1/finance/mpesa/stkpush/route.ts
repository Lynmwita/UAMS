import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { checkRateLimit } from '@/lib/auth/rate-limiter';
import { validateSTKPushPayload, formatKenyanPhoneNumber } from '@/lib/finance/mpesa';
import { darajaConfig, initiateSTK } from '@/lib/finance/daraja';
import { checkLedger, savePayment } from '@/lib/finance/ledger';
import { studentIdentity, isDemoUser } from '@/lib/auth/scope';

export async function POST(request: Request) {
  const auth = await requireServerAuth(request, ['student','finance_officer']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (isDemoUser(auth.user) && process.env.MPESA_ENVIRONMENT === 'production') return NextResponse.json({success:false,error:'Live payments require an institutional account. Demo accounts can only use the Daraja sandbox.'},{status:403});
  const limit = checkRateLimit(`stk:${auth.user.id}`, 3, 60);
  if (!limit.allowed) return NextResponse.json({ success: false, error: 'Please wait before requesting another payment prompt.' }, { status: 429 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 }); }
  const validation = validateSTKPushPayload(body);
  if (!validation.valid) return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  if (auth.user.role === 'student') {
    const identity = await studentIdentity(auth.user);
    if (!identity || body.accountReference !== identity.admissionNumber) return NextResponse.json({ success: false, error: 'Students may only pay against their own admission number.' }, { status: 403 });
  }
  try {
    const config = darajaConfig();
    await checkLedger();
    const phoneNumber = formatKenyanPhoneNumber(body.phoneNumber);
    const result = await initiateSTK({ ...body, phoneNumber });
    await savePayment({ checkoutRequestId: result.CheckoutRequestID, merchantRequestId: result.MerchantRequestID, accountReference: body.accountReference, phoneNumber, amount: body.amount, userId: auth.user.id });
    return NextResponse.json({ success: true, CheckoutRequestID: result.CheckoutRequestID, status: 'pending', BusinessShortCode: config.shortcode, CustomerMessage: 'Payment prompt requested. Enter your PIN on your handset. Payment remains pending until confirmation.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Payment service is unavailable.' }, { status: 503 });
  }
}
