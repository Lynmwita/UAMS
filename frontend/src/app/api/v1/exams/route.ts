import { NextRequest, NextResponse } from 'next/server';
import { ExamSchedule, ExamClearanceCard } from '@/types';
import { requireServerAuth, requirePermission } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

let examSchedules: ExamSchedule[] = [
  { id: 'exm-01', course_code: 'BCS 2101', course_title: 'Database Systems & Architecture', exam_date: '2026-10-15', start_time: '09:00 AM', end_time: '12:00 PM', venue: 'Multi-Purpose Hall A', chief_invigilator: 'Dr. Evans Kiprop', total_candidates: 120, status: 'scheduled' },
  { id: 'exm-02', course_code: 'BCS 2102', course_title: 'Operating Systems Design', exam_date: '2026-10-17', start_time: '02:00 PM', end_time: '05:00 PM', venue: 'Main Auditorium', chief_invigilator: 'Prof. Alice Nyambura', total_candidates: 95, status: 'scheduled' },
  { id: 'exm-03', course_code: 'MAT 1101', course_title: 'Discrete Mathematics & Logic', exam_date: '2026-10-20', start_time: '09:00 AM', end_time: '12:00 PM', venue: 'Science Complex Lab 3', chief_invigilator: 'Dr. Samuel Ndegwa', total_candidates: 150, status: 'scheduled' },
];

let clearanceCards: ExamClearanceCard[] = [
  {
    id: 'clr-01',
    student_id: 'std-01',
    student_name: 'Alex Kiptoo Kimutai',
    admission_number: 'BIT/2023/8849',
    program_name: 'Bachelor of Information Technology',
    semester_name: 'Sept-Dec 2026',
    card_serial_number: 'EXAM-2026-SEP-8849',
    fee_balance: 0,
    fee_paid_percentage: 100,
    is_cleared: true,
    security_qr_token: 'UAMS-SEC-CLR-BIT-2023-8849-VALID-2026',
    registered_units: 6,
  },
  {
    id: 'clr-02',
    student_id: 'std-02',
    student_name: 'Faith Chebet Korir',
    admission_number: 'BCS/2023/9102',
    program_name: 'Bachelor of Science in Computer Science',
    semester_name: 'Sept-Dec 2026',
    card_serial_number: 'EXAM-2026-SEP-9102',
    fee_balance: 5000,
    fee_paid_percentage: 92,
    is_cleared: true,
    security_qr_token: 'UAMS-SEC-CLR-BCS-2023-9102-VALID-2026',
    registered_units: 6,
  },
];

export async function GET(req: NextRequest) {
  const auth = requireServerAuth(req);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { user } = auth;
  let filteredCards = [...clearanceCards];

  if (user.role === 'student') {
    filteredCards = filteredCards.filter(
      (c) =>
        c.student_id === user.id ||
        (user.email === 'student@university.ac.ke' && c.admission_number === 'BIT/2023/8849')
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      schedules: examSchedules,
      cards: filteredCards,
    },
  });
}

export async function POST(req: NextRequest) {
  // Permission guard: strictly requires exams:schedule permission
  const auth = requirePermission(req, 'exams:schedule');
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const { user } = auth;

  try {
    const body = await req.json();
    const { action, course_code, course_title, exam_date, start_time, end_time, venue, chief_invigilator, total_candidates } = body;

    if (action === 'schedule_exam') {
      const newSchedule: ExamSchedule = {
        id: `exm-${Date.now()}`,
        course_code,
        course_title,
        exam_date,
        start_time,
        end_time,
        venue,
        chief_invigilator: chief_invigilator || 'Appointed Invigilator',
        total_candidates: Number(total_candidates || 50),
        status: 'scheduled',
      };

      examSchedules.push(newSchedule);

      recordAuditEvent({
        actor_email: user.email,
        actor_role: user.role,
        action: 'EXAM_SCHEDULED',
        entity_type: 'exam_schedules',
        entity_id: newSchedule.id,
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        status: 'SUCCESS',
        details: { course_code: newSchedule.course_code, venue: newSchedule.venue, date: newSchedule.exam_date },
      });

      return NextResponse.json({ success: true, message: `Exam scheduled for ${course_code}.`, data: newSchedule });
    }

    return NextResponse.json({ success: false, error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Exam operation failed.' }, { status: 500 });
  }
}
