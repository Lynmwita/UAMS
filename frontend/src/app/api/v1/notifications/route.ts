import { NextResponse } from 'next/server';
import { NotificationLog } from '@/types';

let notificationLogs: NotificationLog[] = [
  {
    id: 'ntf-01',
    recipient_type: 'student',
    recipient_identifier: '+254712345678',
    recipient_name: 'Alex Kiptoo Kimutai',
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
    recipient_name: 'Faith Chebet Korir',
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

export async function GET() {
  return NextResponse.json({
    success: true,
    data: notificationLogs,
  });
}

export async function POST(req: Request) {
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
      provider: 'africas_talking',
      status: 'delivered',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    notificationLogs.unshift(newLog);

    return NextResponse.json({
      success: true,
      message: `SMS/Notification successfully dispatched to ${newLog.recipient_identifier}.`,
      data: newLog,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to dispatch notification.' }, { status: 500 });
  }
}
