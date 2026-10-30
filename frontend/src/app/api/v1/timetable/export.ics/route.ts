import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { canTeachCourse } from '@/lib/auth/scope';
import { timetableSlots, parseTimeInterval } from '@/lib/academic/timetable-store';

/**
 * GET /api/v1/timetable/export.ics
 * iCalendar feed of the weekly timetable. The timetable is a recurring weekly
 * template, so events are anchored to a documented reference week:
 * Monday 2026-11-02 through Friday 2026-11-06 (Africa/Nairobi).
 * Import into Google Calendar / Outlook; set to repeat weekly there.
 */

const REFERENCE_MONDAY = new Date('2026-11-02T00:00:00+03:00');
const DAY_OFFSET: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Date as ICS local floating time: 20261102T080000 */
function icsDateTime(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function GET(request: Request) {
  const auth = await requireServerAuth(request, ['student', 'lecturer', 'hod', 'registrar', 'admin', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const slots = timetableSlots.filter(
    (s) => canTeachCourse(auth.user, s.courseCode) && (auth.user.role !== 'hod' || s.courseCode.startsWith('BCS'))
  );

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UAMS//Timetable//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:UAMS Weekly Timetable',
    'X-WR-TIMEZONE:Africa/Nairobi',
  ];

  for (const s of slots) {
    const offset = DAY_OFFSET[s.day];
    if (offset === undefined) continue;
    const parsed = parseTimeInterval(s.time);
    if (!parsed) continue;
    const dayDate = new Date(REFERENCE_MONDAY);
    dayDate.setDate(dayDate.getDate() + offset);
    const start = new Date(dayDate);
    start.setHours(Math.floor(parsed.start / 60), parsed.start % 60, 0, 0);
    const end = new Date(dayDate);
    end.setHours(Math.floor(parsed.end / 60), parsed.end % 60, 0, 0);
    const uid = `${s.id}@uams.university.ac.ke`;
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:20261030T000000Z`);
    lines.push(`DTSTART;TZID=Africa/Nairobi:${icsDateTime(start)}`);
    lines.push(`DTEND;TZID=Africa/Nairobi:${icsDateTime(end)}`);
    lines.push(`SUMMARY:${escapeIcs(`${s.courseCode} — ${s.courseTitle}`)}`);
    lines.push(`LOCATION:${escapeIcs(s.room)}`);
    lines.push(`DESCRIPTION:${escapeIcs(`Lecturer: ${s.lecturer}\\nReference week of 2026-11-02 (recurring weekly template)`)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="uams-timetable.ics"',
    },
  });
}
