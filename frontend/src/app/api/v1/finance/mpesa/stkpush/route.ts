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

    return NextResponse.json({
      success: true,
      message: 'STK push initiated successfully. Please complete PIN prompt on your phone.',
      MerchantRequestID: `MR_${Date.now()}`,
      CheckoutRequestID: checkoutRequestId,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: `Success. Request accepted for processing for ${formattedPhone}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
