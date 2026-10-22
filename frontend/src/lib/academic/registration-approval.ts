import { institutionalApi } from './institutional-api';
import { NextRequest, NextResponse } from 'next/server';
import { registrationsStore } from './registrations';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { canReviewCourse } from '@/lib/auth/scope';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

const failure = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

export async function approveCourseRegistrations(request: NextRequest, mode: 'single' | 'bulk') {
  const auth = await requireServerAuth(request, ['registrar', 'admin', 'super_admin', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'courses/approve');

  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return failure('Provide an approval object.', 400);
    body = value as Record<string, unknown>;
  } catch {
    return failure('Provide valid JSON.', 400);
  }

  const rawIds = mode === 'single' ? [body.registration_id] : body.registration_ids;
  let ids: string[] | undefined;
  if (rawIds !== undefined) {
    if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 200 ||
      rawIds.some(id => typeof id !== 'string' || !id.trim() || id.length > 200)) {
      return failure('Select between 1 and 200 registration IDs.', 400);
    }
    ids = [...new Set((rawIds as string[]).map(id => id.trim()))];
  }
  let courseCode: string | undefined;
  if (mode === 'bulk' && body.course_code !== undefined) {
    if (typeof body.course_code !== 'string' || !body.course_code.trim() || body.course_code.length > 100) {
      return failure('course_code must be a non-empty string of at most 100 characters.', 400);
    }
    courseCode = body.course_code.trim();
  }
  if (!ids && !courseCode) return failure('Provide registration_ids or course_code.', 400);

  // Validate the whole selection before mutating any record.
  const selected = registrationsStore.filter(r => (!ids || ids.includes(r.id)) && (!courseCode || r.course_code === courseCode));
  if (ids?.some(id => !selected.some(r => r.id === id))) return failure('One or more selected registrations were not found.', 404);
  if (selected.some(r => !canReviewCourse(auth.user, r.course_code))) {
    return failure('You may only approve registrations within your course scope.', 403);
  }
  const pending = selected.filter(r => r.status === 'pending');
  if (pending.length === 0) return failure('No pending registrations found for this selection.', 404);

  const approvedAt = new Date().toISOString();
  for (const registration of pending) {
    registration.status = 'approved';
    registration.approved_by = auth.user.email;
    registration.approved_at = approvedAt;
  }
  recordAuditEvent({
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: mode === 'bulk' ? 'REGISTRATION_BULK_APPROVED' : 'REGISTRATION_APPROVED',
    entity_type: 'course_registrations',
    entity_id: pending.map(r => r.id).join(',').slice(0, 200),
    ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
    status: 'SUCCESS',
    details: { approved_count: pending.length, registration_ids: pending.map(r => r.id), course_code: courseCode || 'multi' },
  });
  return NextResponse.json({
    success: true,
    message: `${pending.length} registration(s) approved.`,
    data: mode === 'single' ? pending[0] : { approved_count: pending.length, approved: pending },
  });
}
