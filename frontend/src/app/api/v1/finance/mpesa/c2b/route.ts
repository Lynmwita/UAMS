import { NextResponse } from 'next/server';
import { verifyCallbackSecret } from '@/lib/finance/daraja';
import { postC2BPayment } from '@/lib/finance/c2b';

/**
 * Daraja C2B Confirmation callback (A2 remainder).
 *
 * Daraja calls this when a customer pays to the paybill. Register the
 * ConfirmationURL with Daraja as this route's URL plus ?token=<the same
 * MPESA_CALLBACK_SECRET used for STK callbacks> (server-side env only,
 * never NEXT_PUBLIC; sandbox first via MPESA_ENVIRONMENT).
 *
 * Expected JSON body (Daraja C2B Confirmation):
 *   { TransactionType, TransID, TransTime, TransAmount, BusinessShortCode,
 *     BillRefNumber, InvoiceNumber, OrgAccountBalance, ThirdPartyTransID,
 *     MSISDN, FirstName, MiddleName, LastName }
 *
 * ResultCode 0 is returned for posted, duplicate AND suspense outcomes:
 * the callback was received and recorded, so Daraja must not retry it.
 * ResultCode 1 is only for unauthorised or malformed callbacks.
 *
 * Institutional persistence: the posting engine is demo/in-memory (see
 * lib/finance/c2b.ts). Institutional records need matching uams_workflow
 * operations; until they exist this route still records the demo posting
 * and audit line, and the institutional caller must reconcile from the
 * audit trail — no success is claimed for a record that was not written.
 */
export async function POST(request: Request) {
  if (!verifyCallbackSecret(request)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Unauthorized callback.' }, { status: 401 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Invalid JSON.' }, { status: 400 });
  }
  const transId = typeof body?.TransID === 'string' ? body.TransID.trim() : '';
  const billRef = typeof body?.BillRefNumber === 'string' ? body.BillRefNumber.trim() : '';
  const amount = Number(body?.TransAmount);
  const phone = typeof body?.MSISDN === 'string' ? body.MSISDN : '';
  if (!transId || !billRef || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'TransID, BillRefNumber and a positive TransAmount are required.' }, { status: 400 });
  }
  try {
    const result = postC2BPayment({
      transId,
      billRef,
      amount,
      phone,
      postedBy: 'daraja-c2b@system',
    });
    if (result.status === 'duplicate') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed.', receipt: result.posting.receipt });
    }
    if (result.status === 'suspense') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Held in suspense queue.', suspense_id: result.suspense.id });
    }
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Payment posted.',
      receipt: result.posting.receipt,
      applied: result.posting.applied,
      credit_added: result.posting.creditAdded,
      balance_remaining: result.balanceRemaining,
    });
  } catch (e: any) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: e?.message || 'Unable to process payment.' }, { status: 400 });
  }
}
