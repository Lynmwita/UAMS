/**
 * Central Notification Dispatcher Service
 * Coordinates SMS, Email, In-App notifications with retry limits,
 * airtime expenditure controls, and database persistence.
 */

import { NotificationLog } from '@/types';
import { sendSmsViaAfricasTalking } from './africas-talking';
import { sendEmailNotice } from './email-dispatcher';
import { normalizeKenyanPhone } from './phone-sanitizer';
import { inspectMessageContent } from './content-guard';
import { createClient } from '@supabase/supabase-js';

export const MAX_RETRY_LIMIT = 3;

export interface DispatchInput {
  recipient_type: 'student' | 'guardian' | 'lecturer' | 'staff' | 'broadcast';
  recipient_identifier: string;
  recipient_name?: string;
  channel: 'sms' | 'email' | 'in_app';
  subject?: string;
  message_content: string;
}

// In-memory runtime store for isolated demo accounts and testing environments
const runtime = globalThis as typeof globalThis & { __uamsNotificationLogs?: NotificationLog[] };
export const demoNotificationLogs: NotificationLog[] = (runtime.__uamsNotificationLogs ??= [
  {
    id: 'ntf-01',
    recipient_type: 'student',
    recipient_identifier: '+254712345678',
    recipient_name: 'Faith Wanjiku',
    channel: 'sms',
    message_content: 'UAMS NOTICE: Fee payment verified. Your examination clearance status is active. Check portal for card.',
    provider: 'africas_talking',
    provider_message_id: 'ATXid_sbx_mock1',
    status: 'delivered',
    cost: 0.80,
    retry_count: 0,
    created_at: '2026-10-03 14:32:00',
  },
  {
    id: 'ntf-02',
    recipient_type: 'student',
    recipient_identifier: '+254723456789',
    recipient_name: 'Kevin Otieno',
    channel: 'sms',
    message_content: 'UAMS NOTICE: Exam clearance card generated for Semester 1, 2026/2027. Log in to your student portal.',
    provider: 'africas_talking',
    provider_message_id: 'ATXid_sbx_mock2',
    status: 'delivered',
    cost: 0.80,
    retry_count: 0,
    created_at: '2026-10-04 09:15:00',
  },
  {
    id: 'ntf-03',
    recipient_type: 'broadcast',
    recipient_identifier: 'All Students & Staff',
    recipient_name: 'All University Community',
    channel: 'sms',
    subject: 'Mid-Semester Examinations Commencement',
    message_content: 'UAMS BROADCAST: Mid-Semester Examinations begin on 15th October 2026. Check personalized schedules online.',
    provider: 'africas_talking',
    provider_message_id: 'ATXid_sbx_mock3',
    status: 'sent',
    cost: 0.80,
    retry_count: 0,
    created_at: '2026-10-05 08:00:00',
  },
]);

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('your-') || key.includes('your-')) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Dispatches a notification across configured providers (SMS / Email)
 */
export async function executeDispatch(input: DispatchInput, isDemoAccount: boolean = false): Promise<{
  success: boolean;
  log: NotificationLog;
  warning?: string;
  error?: string;
}> {
  const channel = input.channel || 'sms';
  let targetIdentifier = input.recipient_identifier.trim();
  let warningMessage: string | undefined;

  // E.164 normalization for SMS
  if (channel === 'sms' && input.recipient_type !== 'broadcast') {
    const phoneCheck = normalizeKenyanPhone(targetIdentifier);
    if (!phoneCheck.valid || !phoneCheck.normalized) {
      const failedLog: NotificationLog = {
        id: `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipient_type: input.recipient_type,
        recipient_identifier: targetIdentifier,
        recipient_name: input.recipient_name || targetIdentifier,
        channel: 'sms',
        subject: input.subject,
        message_content: input.message_content,
        provider: 'africas_talking',
        status: 'failed',
        error_message: phoneCheck.error || 'Invalid phone number format.',
        cost: 0,
        retry_count: 0,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      await persistLog(failedLog, isDemoAccount);
      return {
        success: false,
        log: failedLog,
        error: failedLog.error_message,
      };
    }
    targetIdentifier = phoneCheck.normalized;
  }

  // Inspect message content for privacy safeguards
  const contentInspection = inspectMessageContent(input.message_content);
  if (contentInspection.warnings.length > 0) {
    warningMessage = contentInspection.warnings.join('; ');
  }

  // Initialize queued log
  const newLog: NotificationLog = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    recipient_type: input.recipient_type,
    recipient_identifier: targetIdentifier,
    recipient_name: input.recipient_name || targetIdentifier,
    channel,
    subject: input.subject,
    message_content: input.message_content,
    provider: channel === 'sms' ? 'africas_talking' : 'smtp_relay',
    status: 'queued',
    cost: 0,
    retry_count: 0,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };

  // Perform delivery dispatch
  if (channel === 'sms') {
    const smsResult = await sendSmsViaAfricasTalking({
      to: targetIdentifier,
      message: input.message_content,
    });

    newLog.status = smsResult.status;
    newLog.provider_message_id = smsResult.providerMessageId;
    newLog.cost = smsResult.cost;
    newLog.error_message = smsResult.errorMessage;
  } else if (channel === 'email') {
    const emailResult = await sendEmailNotice({
      to: targetIdentifier,
      subject: input.subject || 'Institutional University Notification',
      htmlContent: `<p>${input.message_content.replace(/\n/g, '<br/>')}</p>`,
      textContent: input.message_content,
    });

    newLog.status = emailResult.status;
    newLog.provider_message_id = emailResult.providerMessageId;
    newLog.cost = emailResult.cost;
    newLog.error_message = emailResult.errorMessage;
  } else {
    // In-app
    newLog.status = 'delivered';
    newLog.cost = 0;
  }

  await persistLog(newLog, isDemoAccount);

  return {
    success: newLog.status !== 'failed',
    log: newLog,
    warning: warningMessage,
    error: newLog.error_message,
  };
}

/**
 * Retries a failed or queued notification (Brakes: Max 3 attempts)
 */
export async function retryDispatch(
  notificationId: string,
  isDemoAccount: boolean = false
): Promise<{ success: boolean; log?: NotificationLog; error?: string }> {
  const currentLog = await findLogById(notificationId, isDemoAccount);
  if (!currentLog) {
    return { success: false, error: 'Notification record not found.' };
  }

  if (currentLog.status === 'delivered') {
    return { success: false, error: 'Message has already been delivered.' };
  }

  const currentRetries = currentLog.retry_count ?? 0;
  if (currentRetries >= MAX_RETRY_LIMIT) {
    return {
      success: false,
      error: `Maximum retry limit of ${MAX_RETRY_LIMIT} reached. Marked as permanently failed to prevent airtime exhaustion.`,
    };
  }

  // Increment retry count
  const nextRetryCount = currentRetries + 1;
  currentLog.retry_count = nextRetryCount;

  // Re-dispatch
  if (currentLog.channel === 'sms') {
    const smsResult = await sendSmsViaAfricasTalking({
      to: currentLog.recipient_identifier,
      message: currentLog.message_content,
    });

    currentLog.status = smsResult.status;
    currentLog.cost = smsResult.cost;
    currentLog.provider_message_id = smsResult.providerMessageId || currentLog.provider_message_id;
    currentLog.error_message = smsResult.errorMessage;
  } else if (currentLog.channel === 'email') {
    const emailResult = await sendEmailNotice({
      to: currentLog.recipient_identifier,
      subject: currentLog.subject || 'Institutional University Notification',
      htmlContent: `<p>${currentLog.message_content}</p>`,
    });

    currentLog.status = emailResult.status;
    currentLog.provider_message_id = emailResult.providerMessageId || currentLog.provider_message_id;
    currentLog.error_message = emailResult.errorMessage;
  }

  await updateLog(currentLog, isDemoAccount);

  return {
    success: currentLog.status !== 'failed',
    log: currentLog,
    error: currentLog.error_message,
  };
}

/**
 * Retrieve notification logs
 */
export async function getNotificationLogs(isDemoAccount: boolean = false): Promise<NotificationLog[]> {
  const db = getSupabaseClient();
  if (db && !isDemoAccount) {
    try {
      const { data, error } = await db
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapDbRowToLog);
      }
    } catch {
      // Fallback to runtime logs
    }
  }

  return [...demoNotificationLogs].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Helpers
async function persistLog(log: NotificationLog, isDemoAccount: boolean): Promise<void> {
  const db = getSupabaseClient();
  if (db && !isDemoAccount) {
    try {
      await db.from('notification_logs').insert({
        recipient_type: log.recipient_type,
        recipient_identifier: log.recipient_identifier,
        channel: log.channel,
        subject: log.subject,
        message_content: log.message_content,
        provider: log.provider,
        provider_message_id: log.provider_message_id,
        status: log.status,
        error_message: log.error_message,
        cost: log.cost,
        retry_count: log.retry_count ?? 0,
      });
    } catch {
      // Keep in runtime memory
    }
  }

  // Prepend to runtime memory
  const idx = demoNotificationLogs.findIndex(l => l.id === log.id);
  if (idx >= 0) {
    demoNotificationLogs[idx] = log;
  } else {
    demoNotificationLogs.unshift(log);
  }
}

async function findLogById(id: string, isDemoAccount: boolean): Promise<NotificationLog | null> {
  const db = getSupabaseClient();
  if (db && !isDemoAccount) {
    try {
      const { data, error } = await db.from('notification_logs').select('*').eq('id', id).single();
      if (!error && data) {
        return mapDbRowToLog(data);
      }
    } catch {}
  }

  const found = demoNotificationLogs.find(l => l.id === id);
  return found ? { ...found } : null;
}

async function updateLog(log: NotificationLog, isDemoAccount: boolean): Promise<void> {
  const db = getSupabaseClient();
  if (db && !isDemoAccount) {
    try {
      await db
        .from('notification_logs')
        .update({
          status: log.status,
          cost: log.cost,
          provider_message_id: log.provider_message_id,
          error_message: log.error_message,
          retry_count: log.retry_count,
        })
        .eq('id', log.id);
    } catch {}
  }

  const idx = demoNotificationLogs.findIndex(l => l.id === log.id);
  if (idx >= 0) {
    demoNotificationLogs[idx] = { ...log };
  }
}

function mapDbRowToLog(row: any): NotificationLog {
  return {
    id: String(row.id),
    recipient_type: row.recipient_type || 'student',
    recipient_identifier: row.recipient_identifier,
    recipient_name: row.recipient_name || row.recipient_identifier,
    channel: row.channel || 'sms',
    subject: row.subject,
    message_content: row.message_content,
    provider: row.provider || 'africas_talking',
    provider_message_id: row.provider_message_id,
    status: row.status || 'queued',
    error_message: row.error_message,
    cost: typeof row.cost === 'number' ? row.cost : parseFloat(row.cost || '0'),
    retry_count: typeof row.retry_count === 'number' ? row.retry_count : 0,
    created_at: row.created_at || new Date().toISOString(),
  };
}
