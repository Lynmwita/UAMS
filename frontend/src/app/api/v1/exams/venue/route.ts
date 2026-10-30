import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { venueOverrides } from '@/lib/academic/exam-schedules';

/**
 * Set venue details for a scheduled exam paper.
 * PATCH /api/v1/exams/venue { schedule_id, venue?, building?, seat_range? }
 * Admin-tier only. Never invents venues — only stores what the admin types.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireServerAuth(req, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(req, auth.user, 'exams/venue');

  try {
    const body = await req.json();
    if (typeof body.schedule_id !== 'string' || !body.schedule_id) {
      return NextResponse.json({ success: false, error: 'schedule_id is required.' }, { status: 400 });
    }
    const current = venueOverrides[body.schedule_id] || {};
    venueOverrides[body.schedule_id] = {
      venue: typeof body.venue === 'string' && body.venue.trim() ? body.venue.trim() : current.venue,
      building: typeof body.building === 'string' ? body.building.trim() : current.building,
      seat_range: typeof body.seat_range === 'string' ? body.seat_range.trim() : current.seat_range,
    };
    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'EXAM_VENUE_ASSIGNED',
      entity_type: 'exam_schedules',
      entity_id: body.schedule_id,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: venueOverrides[body.schedule_id],
    });
    return NextResponse.json({ success: true, data: venueOverrides[body.schedule_id] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
