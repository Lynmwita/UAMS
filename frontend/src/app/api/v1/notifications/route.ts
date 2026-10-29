import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { NotificationLog } from '@/types';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { notificationLogs } from '@/lib/messaging/notification-store';
import { dispatchNotification, isRetryableStatus, MAX_DISPATCH_ATTEMPTS, messagingProviderStatus } from '@/lib/messaging/dispatcher';

const STAFF_ROLES = ['super_admin', 'admin', 'registrar', 'finance_officer'] as const;

function nowStamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function applyDispatch(log: NotificationLog, result: Awaited<ReturnType<typeof dispatchNotification>>['result']) {
  log.status = result.status;
  log.provider = result.provider;
  log.provider_message_id = result.providerMessageId;
  log.delivery_error = result.error;
  log.cost = result.cost;
  log.dispatch_mode = result.mode;
  log.attempts = (log.attempts || 0) + 1;
  log.updated_at = nowStamp();
}

function outcomeMessage(log: NotificationLog): string {
  const target = log.recipient_identifier;
  if (log.status === 'failed') return `Notification to ${target} FAILED: ${log.delivery_error || 'provider error'}`;
  if (log.dispatch_mode === 'mock') return `Notification mock-sent to ${target} (no live provider configured - nothing left UAMS). Configure Africa's Talking / email env keys for real delivery.`;
  return `Notification ${log.status} via ${log.provider} to ${target}.`;
}

export async function GET(req: NextRequest) {
  const auth = await requireServerAuth(req, ['super_admin', 'admin', 'registrar', 'finance_officer']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'notifications');

  const { user } = auth;
  if (user.role === 'student') {
    // Only return broadcast or personal alerts
    const filtered = notificationLogs.filter(
      (n) => n.recipient_type === 'broadcast' || n.recipient_name.toLowerCase().includes('faith')
    );
    return NextResponse.json({ success: true, data: filtered });
  }

  return NextResponse.json({
    success: true,
    data: notificationLogs,
    meta: { providers: messagingProviderStatus() },
  });
}

export async function POST(req: NextRequest) {
  // Staff authorization required for sending notifications
  const auth = await requireServerAuth(req, [...STAFF_ROLES]);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'notifications');
  try {
    const body = await req.json();
    const { recipient_type, recipient_identifier, recipient_name, channel, message_content, subject } = body;

    if (!recipient_identifier || !message_content) {
      return NextResponse.json({ success: false, error: 'Recipient identifier and message content are required.' }, { status: 400 });
    }

    const newLog: NotificationLog = {
      id: `ntf-${Date.now()}`,
      recipient_type: recipient_type || 'student',
      recipient_identifier,
      recipient_name: recipient_name || recipient_identifier,
      channel: channel || 'sms',
      subject,
      message_content,
      provider: 'system',
      status: 'queued',
      attempts: 0,
      created_at: nowStamp(),
    };
    notificationLogs.unshift(newLog);

    // A3: actually dispatch (live provider when configured, mock otherwise).
    const { result, normalizedRecipient } = await dispatchNotification({
      channel: newLog.channel,
      recipientIdentifier: recipient_identifier,
      subject,
      messageContent: message_content,
    });
    newLog.recipient_identifier = normalizedRecipient || recipient_identifier;
    applyDispatch(newLog, result);

    return NextResponse.json({
      success: true,
      message: outcomeMessage(newLog),
      data: newLog,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to dispatch notification.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Retry a failed (or stuck queued) notification.
  const auth = await requireServerAuth(req, [...STAFF_ROLES]);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'notifications');
  try {
    const body = await req.json();
    if (body?.action !== 'retry' || !body?.id) {
      return NextResponse.json({ success: false, error: 'Provide { id, action: "retry" }.' }, { status: 400 });
    }
    const log = notificationLogs.find((n) => n.id === body.id);
    if (!log) return NextResponse.json({ success: false, error: 'Notification not found.' }, { status: 404 });
    if ((log.attempts || 0) >= MAX_DISPATCH_ATTEMPTS) {
      log.delivery_error = 'Maximum retry limit of 3 reached. Marked as permanently failed to prevent airtime exhaustion.';
      return NextResponse.json({ success: false, error: 'Maximum retry limit of 3 reached. Marked as permanently failed to prevent airtime exhaustion.', data: log }, { status: 400 });
    }
    if (!isRetryableStatus(log.status, log.attempts || 0)) {
      return NextResponse.json({ success: false, error: `Only failed or queued notifications can be retried (this one is ${log.status}).` }, { status: 409 });
    }
    const { result, normalizedRecipient } = await dispatchNotification({
      channel: log.channel,
      recipientIdentifier: log.recipient_identifier,
      subject: log.subject,
      messageContent: log.message_content,
    });
    if (normalizedRecipient) log.recipient_identifier = normalizedRecipient;
    applyDispatch(log, result);
    return NextResponse.json({ success: true, message: outcomeMessage(log), data: log });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to retry notification.' }, { status: 500 });
  }
}
