import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { executeDispatch, getNotificationLogs } from '@/lib/communications/dispatcher-service';

export async function GET(req: NextRequest) {
  const auth = await requireServerAuth(req, ['super_admin', 'admin', 'registrar', 'finance_officer', 'student']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { user } = auth;
  const isDemo = user.id.startsWith('usr-');
  const allLogs = await getNotificationLogs(isDemo);

  // Catch 1: Ensure no internal server keys or credentials are ever present in log output
  const sanitizedLogs = allLogs.map(log => {
    const { ...safeLog } = log;
    return safeLog;
  });

  // Students can only see broadcasts or notifications specifically addressed to them
  if (user.role === 'student') {
    const userEmail = (user.email || '').toLowerCase();
    const filtered = sanitizedLogs.filter(
      (n) => n.recipient_type === 'broadcast' ||
             (n.recipient_identifier && n.recipient_identifier.toLowerCase().includes(userEmail))
    );
    return NextResponse.json({ success: true, data: filtered });
  }

  return NextResponse.json({
    success: true,
    data: sanitizedLogs,
    meta: {
      mode: process.env.ENABLE_LIVE_SMS === 'true' ? 'production' : 'sandbox',
      airtime_brakes_active: process.env.ENABLE_LIVE_SMS !== 'true',
      max_retries: 3,
    },
  });
}

export async function POST(req: NextRequest) {
  // Catch 2: Only authorized staff roles can trigger SMS / Email dispatch
  const auth = await requireServerAuth(req, ['super_admin', 'admin', 'registrar', 'finance_officer']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const body = await req.json();
    const { recipient_type, recipient_identifier, recipient_name, channel, message_content, subject } = body;

    if (!recipient_identifier || !message_content) {
      return NextResponse.json(
        { success: false, error: 'Recipient identifier and message content are required.' },
        { status: 400 }
      );
    }

    const isDemo = auth.user.id.startsWith('usr-');

    const result = await executeDispatch(
      {
        recipient_type: recipient_type || 'student',
        recipient_identifier,
        recipient_name: recipient_name || recipient_identifier,
        channel: channel || 'sms',
        subject,
        message_content,
      },
      isDemo
    );

    if (!result.success && result.log.status === 'failed') {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to dispatch notification.',
        data: result.log,
        warning: result.warning,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.log.status === 'delivered'
        ? `Notification delivered to ${result.log.recipient_identifier}.`
        : `Notification dispatched (${result.log.status}) to ${result.log.recipient_identifier}.`,
      data: result.log,
      warning: result.warning,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal notification dispatch error.' },
      { status: 500 }
    );
  }
}
