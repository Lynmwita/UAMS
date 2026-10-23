import { NotificationLog } from '@/types';

/**
 * Demo-mode notification log store (used when the actor is a demo `usr-`
 * account; institutional accounts read/write public.notification_logs).
 * Mirrors the studentsStore pattern so records survive across requests in
 * one server process. Extended fields (provider_message_id, delivery_error,
 * cost, attempts) are the dispatch telemetry added by the A3 dispatcher.
 */
export type StoredNotification = NotificationLog;

const seed: StoredNotification[] = [
  {
    id: 'ntf-01',
    recipient_type: 'student',
    recipient_identifier: '+254712345678',
    recipient_name: 'Faith Wanjiku',
    channel: 'sms',
    message_content: 'UAMS ALERT: Your M-Pesa fee payment of KES 35,000 (Ref: QHJ8829101) has been verified. Current balance: KES 0.',
    provider: 'africas_talking',
    status: 'delivered',
    created_at: '2026-10-03 14:32:00',
  },
  {
    id: 'ntf-02',
    recipient_type: 'student',
    recipient_identifier: '+254723456789',
    recipient_name: 'Kevin Otieno',
    channel: 'sms',
    message_content: 'UAMS NOTICE: Exam clearance card generated for Semester 1, 2026/2027. Download your clearance card from the student portal.',
    provider: 'africas_talking',
    status: 'delivered',
    created_at: '2026-10-04 09:15:00',
  },
  {
    id: 'ntf-03',
    recipient_type: 'broadcast',
    recipient_identifier: 'All Students & Staff',
    recipient_name: 'All University Community',
    channel: 'sms',
    subject: 'Mid-Semester Examinations Commencement',
    message_content: 'UAMS BROADCAST: Mid-Semester Examinations begin on 15th October 2026. Please check your personalized examination schedule online.',
    provider: 'africas_talking',
    status: 'sent',
    created_at: '2026-10-05 08:00:00',
  },
];

const runtime = globalThis as typeof globalThis & { __uams_notificationLogs?: StoredNotification[] };
export const notificationLogs: StoredNotification[] =
  runtime.__uams_notificationLogs || (runtime.__uams_notificationLogs = seed);
