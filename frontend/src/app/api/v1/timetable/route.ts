import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { canTeachCourse } from '@/lib/auth/scope';
import { timetableSlots } from '@/lib/academic/timetable-store';

export async function GET(request: Request) {
  const auth = await requireServerAuth(request, ['student', 'lecturer', 'hod', 'registrar', 'admin', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'timetable');
  return NextResponse.json({
    success: true,
    data: timetableSlots.filter((s) => canTeachCourse(auth.user, s.courseCode) && (auth.user.role !== 'hod' || s.courseCode.startsWith('BCS'))),
  });
}

export async function POST(request: Request) {
  const auth = await requireServerAuth(request, ['registrar', 'admin', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'timetable');
  try {
    const body = await request.json();
    if (!['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(body.day) || ['time', 'courseCode', 'courseTitle', 'room', 'lecturer'].some((k) => typeof body[k] !== 'string' || !body[k].trim() || body[k].length > 200)) {
      return NextResponse.json({ success: false, error: 'Valid timetable fields are required.' }, { status: 400 });
    }
    if (timetableSlots.some((s) => s.day === body.day && s.time === body.time && (s.room === body.room || s.lecturer === body.lecturer || s.courseCode === body.courseCode))) {
      return NextResponse.json({ success: false, error: 'Room, lecturer or course already booked for this slot.' }, { status: 409 });
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
