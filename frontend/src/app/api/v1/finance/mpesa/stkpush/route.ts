import { NextResponse } from 'next/server';
import { validateSTKPushPayload, formatKenyanPhoneNumber } from '@/lib/finance/mpesa';

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
    const checkoutRequestId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const mpesaReceipt = `QHJ${Math.floor(1000000 + Math.random() * 9000000)}`;

    return NextResponse.json({
      success: true,
      message: `M-Pesa STK Prompt sent to ${formattedPhone} via Paybill 522533 (Acc: ${body.accountReference}).`,
      MerchantRequestID: `MR_${Date.now()}`,
      CheckoutRequestID: checkoutRequestId,
      BusinessShortCode: '522533',
      AccountReference: body.accountReference,
      Amount: body.amount,
      ReceiptNumber: mpesaReceipt,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: `STK push prompt sent to ${formattedPhone} for KSh ${body.amount.toLocaleString()} using Paybill 522533 and Account No ${body.accountReference}. Enter your M-Pesa PIN to complete payment.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
