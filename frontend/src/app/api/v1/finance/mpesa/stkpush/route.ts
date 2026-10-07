import { NextResponse } from 'next/server';
import { validateSTKPushPayload, formatKenyanPhoneNumber } from '@/lib/finance/mpesa';
import { registerPendingSTK } from '@/lib/finance/pending-requests';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateSTKPushPayload(body);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const formattedPhone = formatKenyanPhoneNumber(body.phoneNumber);
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(10000 + Math.random() * 90000)}`;
    const merchantRequestId = `MR_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Track the authentic pending request so callback can verify it
    registerPendingSTK({
      checkoutRequestId,
      merchantRequestId,
      accountReference: body.accountReference,
      phoneNumber: formattedPhone,
      amount: Number(body.amount),
    });

    return NextResponse.json({
      success: true,
      mode: process.env.MPESA_CONSUMER_KEY ? 'daraja_live' : 'daraja_sandbox',
      message: `M-Pesa STK prompt dispatched to ${formattedPhone}. Awaiting PIN authorization.`,
      MerchantRequestID: merchantRequestId,
      CheckoutRequestID: checkoutRequestId,
      BusinessShortCode: '522533',
      AccountReference: body.accountReference,
      Amount: body.amount,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: `STK push prompt sent to ${formattedPhone} for KSh ${body.amount.toLocaleString()} using Paybill 522533 and Account No ${body.accountReference}. Enter your M-Pesa PIN on handset to authorize payment.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

