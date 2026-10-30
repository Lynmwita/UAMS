import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { canTeachCourse } from '@/lib/auth/scope';
import {
  timetableSlots,
  venuesStore,
  parseTimeInterval,
  findClashes,
  clashMessage,
  findVenueByName,
} from '@/lib/academic/timetable-store';

export async function GET(request: Request) {
  const auth = await requireServerAuth(request, ['student', 'lecturer', 'hod', 'registrar', 'admin', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'timetable');
  return NextResponse.json({
    success: true,
    data: timetableSlots.filter((s) => canTeachCourse(auth.user, s.courseCode) && (auth.user.role !== 'hod' || s.courseCode.startsWith('BCS'))),
    venues: venuesStore,
  });
}

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export async function POST(request: Request) {
  const auth = await requireServerAuth(request, ['registrar', 'admin', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'timetable');
  try {
    const body = await request.json();
    // Strict field validation
    if (!VALID_DAYS.includes(body.day)) {
      return NextResponse.json({ success: false, error: 'Day must be Monday–Friday.' }, { status: 400 });
    }
    if (['time', 'courseCode', 'courseTitle', 'room', 'lecturer'].some((k) => typeof body[k] !== 'string' || !body[k].trim() || body[k].length > 200)) {
      return NextResponse.json({ success: false, error: 'Valid timetable fields are required.' }, { status: 400 });
    }
    // Strict time validation: must parse and start < end. Fail closed.
    const parsed = parseTimeInterval(body.time);
    if (!parsed) {
      return NextResponse.json({ success: false, error: 'Time must be a valid interval like "08:00 AM – 11:00 AM" with start before end.' }, { status: 400 });
    }
    // Venue must exist in the venue list
    if (!findVenueByName(body.room)) {
      return NextResponse.json({ success: false, error: `Venue "${body.room}" is not a recognized venue.` }, { status: 400 });
    }
    // Automated clash detection: lecturer and venue double-booking
    const clashes = findClashes(body.day, body.time, body.lecturer, body.room);
    if (clashes.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Scheduling clash detected: ' + clashes.map(clashMessage).join('; ') },
        { status: 409 }
      );
    }
    const slot = {
      id: crypto.randomUUID(),
      day: body.day,
      time: body.time,
      courseCode: body.courseCode,
      courseTitle: body.courseTitle,
      room: body.room,
      lecturer: body.lecturer,
    };
    timetableSlots.push(slot);
    return NextResponse.json({ success: true, data: slot }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid timetable request.' }, { status: 400 });
  }
}
