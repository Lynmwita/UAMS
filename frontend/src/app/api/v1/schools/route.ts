import { institutionalApi } from '@/lib/academic/institutional-api';
import { requireServerAuth, requirePermission } from '@/lib/auth/server-auth';
import { NextRequest, NextResponse } from 'next/server';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

import { schoolsStore } from '@/lib/academic/structure';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin','admin','registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'schools');
  return NextResponse.json({
    success: true,
    total: schoolsStore.length,
    data: schoolsStore,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin','admin','registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'schools');
  try {
    const body = await request.json();
    if (typeof body?.code !== 'string' || !body.code.trim() || body.code.length > 20 || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 255) {
      return NextResponse.json({ success: false, error: 'code and name are required' }, { status: 400 });
    }

    if (schoolsStore.some(s=>s.code.toUpperCase()===body.code.trim().toUpperCase())) return NextResponse.json({success:false,error:'School code already exists.'},{status:409});
    const newSchool = {
      id: `sch-${Date.now()}`,
      code: body.code.trim().toUpperCase(),
      name: body.name,
      dean: body.dean || 'Pending Appointment',
      dean_email: body.dean_email || '',
      departments_count: 0,
      programs_count: 0,
      is_active: true,
    };

    schoolsStore.push(newSchool);
    return NextResponse.json({ success: true, data: newSchool }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Update a school: rename, reassign dean, or suspend/archive (is_active).
  // Admin-tier only; audit-logged.
  const auth = await requireServerAuth(request, ['super_admin','admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'schools');
  try {
    const body = await request.json();
    const school = schoolsStore.find((s) => s.id === body.id);
    if (!school) return NextResponse.json({ success: false, error: 'School not found.' }, { status: 404 });
    if (typeof body.name === 'string' && body.name.trim()) school.name = body.name.trim();
    if (typeof body.dean === 'string') school.dean = body.dean.trim() || 'Pending Appointment';
    if (typeof body.dean_email === 'string') school.dean_email = body.dean_email.trim();
    if (typeof body.is_active === 'boolean') school.is_active = body.is_active;
    recordAuditEvent({
      actor_email: auth.user.email, actor_role: auth.user.role, action: 'SCHOOL_UPDATED',
      entity_type: 'schools', entity_id: school.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS', details: { code: school.code },
    });
    return NextResponse.json({ success: true, data: school });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
