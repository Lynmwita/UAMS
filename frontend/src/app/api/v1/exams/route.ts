import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { ExamSchedule } from '@/types';
import { requireServerAuth, requirePermission } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { inDepartment } from '@/lib/auth/scope';
import { buildExamClearanceCards, EXAM_CARD_CLEARANCE_THRESHOLD } from '@/lib/academic/clearance';
import { coursesStore } from '@/lib/academic/course-catalog';
import { registrationsStore } from '@/lib/academic/registrations';
import { studentsStore } from '@/lib/academic/student-records';

/** Planned exam dates for the one 5-unit catalogue. Dates are in the future
 * relative to the demo term and move with the catalogue: a course removed
 * from the catalogue drops out of the timetable instead of lingering as a
 * ghost code. Candidate counts are live registration counts on record. */
const PLANNED_EXAM_DATES: Record<string, { date: string; venue: string }> = {
  'BCS 311': { date: '2026-12-07', venue: 'Multi-Purpose Hall A' },
  'BIT 312': { date: '2026-12-09', venue: 'Main Auditorium' },
  'BCS 314': { date: '2026-12-11', venue: 'Science Complex Lab 3' },
  'BCS 316': { date: '2026-12-14', venue: 'Multi-Purpose Hall A' },
  'BBA 201': { date: '2026-12-16', venue: 'Main Auditorium' },
};

export function buildExamSchedules(): ExamSchedule[] {
  return coursesStore.map((course, index) => {
    const planned = PLANNED_EXAM_DATES[course.code] || { date: '2026-12-18', venue: 'Multi-Purpose Hall A' };
    return {
      id: `exm-${course.id}`,
      course_code: course.code,
      course_title: course.title,
      exam_date: planned.date,
      start_time: index % 2 === 0 ? '09:00 AM' : '02:00 PM',
      end_time: index % 2 === 0 ? '12:00 PM' : '05:00 PM',
      venue: planned.venue,
      chief_invigilator: course.lecturer,
      total_candidates: registrationsStore.filter((r) => r.course_code === course.code).length,
      status: 'scheduled',
    };
  });
}

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
