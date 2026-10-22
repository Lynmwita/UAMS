import { institutionalApi } from '@/lib/academic/institutional-api';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { departmentsStore } from '@/lib/academic/structure';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student', 'finance_officer']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'departments');

  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('school_id');
  const search = searchParams.get('search')?.toLowerCase();

  let results = [...departmentsStore];
  if (schoolId) results = results.filter((d) => d.school_id === schoolId);
  if (search) {
    results = results.filter(
      (d) => d.code.toLowerCase().includes(search) || d.name.toLowerCase().includes(search) || d.hod.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ success: true, total: results.length, data: results });
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'departments');
  try {
    const body = await request.json();
    if (
      typeof body?.code !== 'string' ||
      !body.code.trim() ||
      body.code.length > 20 ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 255 ||
      typeof body.school_id !== 'string' ||
      !body.school_id
    ) {
      return NextResponse.json({ success: false, error: 'code, name, and school_id are required' }, { status: 400 });
    }

    if (departmentsStore.some((d) => d.code.toUpperCase() === body.code.trim().toUpperCase() && d.school_id === body.school_id)) {
      return NextResponse.json({ success: false, error: 'Department code already exists for this school.' }, { status: 409 });
    }

    const newDepartment = {
      id: `dep-${Date.now()}`,
      school_id: body.school_id,
      code: body.code.trim().toUpperCase(),
      name: body.name,
      hod: body.hod || 'Pending Appointment',
      hod_email: body.hod_email || '',
      programs_count: 0,
      is_active: true,
    };

    departmentsStore.push(newDepartment);
    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'DEPARTMENT_CREATED',
      entity_type: 'departments',
      entity_id: newDepartment.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { code: newDepartment.code, school_id: newDepartment.school_id },
    });
    return NextResponse.json({ success: true, data: newDepartment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
