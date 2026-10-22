import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { isDemoUser } from '@/lib/auth/scope';
import { listNotices, parseNotice, saveNotice } from '@/lib/communications/announcements';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

export async function GET(request: Request) {
  const auth = await requireServerAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;
  try {
    const notices = await listNotices(isDemoUser(auth.user));
    const reviewer = ['super_admin', 'admin', 'registrar'].includes(auth.user.role);
    const audience = auth.user.role === 'student' ? 'Students' : 'Faculty & Lecturers';
    const now = Date.now();
    return NextResponse.json({ success: true, data: reviewer ? notices : notices.filter(n =>
      n.is_published && (!n.expires_at || Date.parse(n.expires_at) > now) && (n.audience === 'All Campus' || n.audience === audience)) },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'Announcements are temporarily unavailable.' }, { status: 503 });
  }
}

async function writeNotice(request: Request, update: boolean) {
  const auth = await requireServerAuth(request, ['admin', 'registrar', 'super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Provide valid JSON.' }, { status: 400 });
  }
  const input = parseNotice(body);
  const id = (body as { id?: unknown } | null)?.id;
  if (!input || (update && (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,200}$/.test(id)))) {
    return NextResponse.json({ success: false, error: 'Valid notice details and audience are required.' }, { status: 400 });
  }
  try {
    const notice = await saveNotice(input, auth.user.email, isDemoUser(auth.user), update ? id as string : undefined);
    if (!notice) return NextResponse.json({ success: false, error: 'Notice not found.' }, { status: 404 });
    recordAuditEvent({ actor_email: auth.user.email, actor_role: auth.user.role, action: update ? 'ANNOUNCEMENT_UPDATED' : 'ANNOUNCEMENT_CREATED',
      entity_type: 'announcements', entity_id: notice.id, status: 'SUCCESS',
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1' });
    return NextResponse.json({ success: true, data: notice }, { status: update ? 200 : 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'The notice could not be saved. Please retry.' }, { status: 503 });
  }
}

export async function POST(request: Request) { return writeNotice(request, false); }
export async function PATCH(request: Request) { return writeNotice(request, true); }
