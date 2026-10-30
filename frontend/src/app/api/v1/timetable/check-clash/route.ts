import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { findClashes, clashMessage, parseTimeInterval } from '@/lib/academic/timetable-store';

/**
 * GET /api/v1/timetable/check-clash?day=Monday&time=08:00 AM – 11:00 AM&lecturer=...&room=...&excludeId=...
 * Pre-flight clash check for the scheduling form. Returns { clashes: [{type, message, slot}] }.
 * Fails closed: unparseable time is reported as a blocking clash.
 */
export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['registrar', 'admin', 'super_admin', 'lecturer', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const day = searchParams.get('day') || '';
  const time = searchParams.get('time') || '';
  const lecturer = searchParams.get('lecturer') || '';
  const room = searchParams.get('room') || '';
  const excludeId = searchParams.get('excludeId') || undefined;

  if (!day || !time) {
    return NextResponse.json({ success: false, error: 'day and time are required.' }, { status: 400 });
  }

  const clashes = findClashes(day, time, lecturer, room, excludeId);
  return NextResponse.json({
    success: true,
    data: {
      hasClash: clashes.length > 0,
      clashes: clashes.map((c) => ({
        type: c.type,
        message: clashMessage(c),
        slot: { id: c.slot.id, day: c.slot.day, time: c.slot.time, courseCode: c.slot.courseCode, room: c.slot.room, lecturer: c.slot.lecturer },
      })),
      timeValid: parseTimeInterval(time) !== null,
    },
  });
}
