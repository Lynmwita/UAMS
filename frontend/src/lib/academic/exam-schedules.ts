import { ExamSchedule } from '@/types';
import { coursesStore } from '@/lib/academic/course-catalog';
import { registrationsStore } from '@/lib/academic/registrations';

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
