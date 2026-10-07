import { NextRequest, NextResponse } from 'next/server';
import { getPendingSTK, settleSTKPayment } from '@/lib/finance/pending-requests';

/**
 * Safaricom Daraja STK Push Webhook / Callback Handler
 * Receives result payload upon M-Pesa pin entry on mobile device
 * Enforces origin verification against initiated CheckoutRequestIDs
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

    if (!CheckoutRequestID) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: 'Missing CheckoutRequestID' }, { status: 400 });
    }

    // Origin verification: check if this checkout was initiated by UAMS
    const pending = getPendingSTK(CheckoutRequestID);
    if (!pending) {
      console.warn(`[Daraja Webhook] Rejected unauthorized callback for uninitiated CheckoutRequestID: ${CheckoutRequestID}`);
      return NextResponse.json(
        {
          ResultCode: 1,
          ResultDesc: 'Rejected: Unrecognized or expired CheckoutRequestID. Callback origin verification failed.',
        },
        { status: 400 }
      );
    }

    if (ResultCode === 0) {
      // Payment Successful
      let mpesaReceiptNumber = '';
      let amount = 0;
      let transactionDate = '';
      let phoneNumber = '';

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = String(item.Value || '');
          if (item.Name === 'Amount') amount = Number(item.Value) || 0;
          if (item.Name === 'TransactionDate') transactionDate = item.Value?.toString() || '';
          if (item.Name === 'PhoneNumber') phoneNumber = item.Value?.toString() || '';
        }
      }

      if (!mpesaReceiptNumber) {
        return NextResponse.json(
          { ResultCode: 1, ResultDesc: 'Rejected: Missing authentic MpesaReceiptNumber in successful payload.' },
          { status: 400 }
        );
      }

      // Settle against pending ledger with strict amount matching & idempotency check
      const settlement = settleSTKPayment(CheckoutRequestID, mpesaReceiptNumber, amount);
      if (!settlement.success) {
        console.warn(`[Daraja Webhook] Settlement failed for ${CheckoutRequestID}: ${settlement.error}`);
        return NextResponse.json({
          ResultCode: 1,
          ResultDesc: settlement.error || 'Payment settlement validation failed',
        }, { status: 409 });
      }

      console.log(`[Daraja Webhook] VERIFIED SETTLED PAYMENT: KES ${amount} | Receipt: ${mpesaReceiptNumber} | Student: ${pending.accountReference}`);

      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Payment settled and student account credited successfully',
        data: {
          mpesaReceiptNumber,
          amount,
          accountReference: pending.accountReference,
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

