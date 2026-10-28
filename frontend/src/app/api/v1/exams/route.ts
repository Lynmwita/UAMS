import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { ExamSchedule } from '@/types';
import { requireServerAuth, requirePermission } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { inDepartment } from '@/lib/auth/scope';
import { buildExamClearanceCards, EXAM_CARD_CLEARANCE_THRESHOLD } from '@/lib/academic/clearance';
import { buildExamSchedules } from '@/lib/academic/exam-schedules';
import { coursesStore } from '@/lib/academic/course-catalog';
import { studentsStore } from '@/lib/academic/student-records';

/** Exams scheduled through the UI, kept apart from the catalogue-derived rows. */
let customSchedules: ExamSchedule[] = [];

export async function GET(req: NextRequest) {
  const auth = await requireServerAuth(req, ['student', 'admin', 'super_admin', 'registrar', 'hod', 'lecturer']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'exams');

  const { user } = auth;
  let filteredCards = buildExamClearanceCards().filter((c) => inDepartment(user, c.admission_number));
  if (user.role === 'lecturer') filteredCards = [];

  if (user.role === 'student') {
    const self = studentsStore.find((s) => s.user_id === user.id) || (user.email === 'student@university.ac.ke' ? studentsStore.find((s) => s.id === 'stu-1') : undefined);
    filteredCards = self ? filteredCards.filter((c) => c.student_id === self.id) : [];
  }

  return NextResponse.json({
    success: true,
    data: {
      schedules: [...buildExamSchedules(), ...customSchedules],
      cards: filteredCards,
      clearance_threshold_percentage: EXAM_CARD_CLEARANCE_THRESHOLD,
    },
  });
}

export async function POST(req: NextRequest) {
  // Permission guard: strictly requires exams:schedule permission
  const auth = await requirePermission(req, 'exams:schedule');
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'exams');

  const { user } = auth;

  try {
    const body = await req.json();
    const { action, course_code, course_title, exam_date, start_time, end_time, venue, chief_invigilator, total_candidates } = body;

    if (action === 'schedule_exam') {
      const catalogCourse = coursesStore.find((c) => c.code === course_code);
      if (!catalogCourse) {
        return NextResponse.json({ success: false, error: 'Choose a course from the catalogue.' }, { status: 400 });
      }
      const newSchedule: ExamSchedule = {
        id: `exm-${Date.now()}`,
        course_code,
        course_title: course_title || catalogCourse.title,
        exam_date,
        start_time,
        end_time,
        venue,
        chief_invigilator: chief_invigilator || 'Appointed Invigilator',
        total_candidates: Number(total_candidates || 0),
        status: 'scheduled',
      };

      customSchedules.push(newSchedule);

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
