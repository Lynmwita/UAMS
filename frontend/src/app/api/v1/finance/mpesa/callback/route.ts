import { NextRequest, NextResponse } from 'next/server';

/**
 * Safaricom Daraja STK Push Webhook / Callback Handler
 * Receives result payload upon M-Pesa pin entry on mobile device
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('[Daraja Webhook] Received STK Callback Payload:', JSON.stringify(payload, null, 2));

    const stkCallback = payload?.Body?.stkCallback;
    if (!stkCallback) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid payload structure' }, { status: 400 });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    if (ResultCode === 0) {
      // Payment Successful
      let mpesaReceiptNumber = '';
      let amount = 0;
      let transactionDate = '';
      let phoneNumber = '';

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
          if (item.Name === 'Amount') amount = item.Value;
          if (item.Name === 'TransactionDate') transactionDate = item.Value?.toString();
          if (item.Name === 'PhoneNumber') phoneNumber = item.Value?.toString();
        }
      }

      console.log(`[Daraja Webhook] SUCCESSFUL PAYMENT: KES ${amount} | Receipt: ${mpesaReceiptNumber} | Phone: ${phoneNumber}`);

      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Payment settled and student account credited successfully',
        data: {
          mpesaReceiptNumber,
          amount,
          transactionDate,
          phoneNumber,
          merchantRequestId: MerchantRequestID,
          checkoutRequestId: CheckoutRequestID,
        },
      });
    } else {
      // Payment Cancelled or Insufficient Funds (ResultCode 1032, 1, etc.)
      console.warn(`[Daraja Webhook] FAILED / CANCELLED PAYMENT: Code ${ResultCode} - ${ResultDesc}`);
      return NextResponse.json({
        ResultCode,
        ResultDesc: ResultDesc || 'Payment transaction failed or cancelled by user',
      });
    }
  } catch (err: any) {
    console.error('[Daraja Webhook] Exception:', err);
    return NextResponse.json({ ResultCode: 1, ResultDesc: err.message }, { status: 500 });
  }
}
