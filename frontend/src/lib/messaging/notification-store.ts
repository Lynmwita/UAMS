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
    recipient_identifier: '+254700000001',
    recipient_name: 'Faith Wanjiku',
    channel: 'sms',
    message_content: 'UAMS ALERT: Your Semester 1 fee payment of KES 52,500 (Invoice INV-2026-0001) has been verified. Current balance: KES 0.',
    provider: 'mock',
    dispatch_mode: 'mock',
    status: 'delivered',
    created_at: '2026-10-03 14:32:00',
  },
  {
    id: 'ntf-02',
    recipient_type: 'student',
    recipient_identifier: '+254700000002',
    recipient_name: 'Kevin Otieno',
    channel: 'sms',
    message_content: 'UAMS NOTICE: Your Semester 2 fee balance is KES 18,500 (Invoice INV-2026-0002). Please clear it before exam clearance.',
    provider: 'mock',
    dispatch_mode: 'mock',
    status: 'delivered',
    created_at: '2026-10-04 09:15:00',
  },
  {
    id: 'ntf-03',
    recipient_type: 'broadcast',
    recipient_identifier: 'All Students & Staff',
    recipient_name: 'All University Community',
    channel: 'sms',
    subject: 'End-of-Semester Examination Timetable Available',
    message_content: 'UAMS BROADCAST: The end-of-semester examination timetable is now available in the student portal. Check your personal schedule and clear any outstanding fee balance before your first paper.',
    provider: 'mock',
    dispatch_mode: 'mock',
    status: 'sent',
    created_at: '2026-10-27 08:00:00',
  },
];

const runtime = globalThis as typeof globalThis & { __uams_notificationLogs?: StoredNotification[] };
export const notificationLogs: StoredNotification[] =
  runtime.__uams_notificationLogs || (runtime.__uams_notificationLogs = seed);
