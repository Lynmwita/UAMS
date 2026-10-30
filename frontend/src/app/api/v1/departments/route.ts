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
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.toLowerCase();

  let results = [...departmentsStore];
  if (schoolId) results = results.filter((d) => d.school_id === schoolId);
  if (category) results = results.filter((d) => (d.category || (d.school_id === 'central' ? 'non_academic' : 'academic')) === category);
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
    const isNonAcademic =
      body.category === 'non_academic' ||
      body.school_id === 'central' ||
      body.school_id === 'sch-central' ||
      !body.school_id;
    const resolvedSchoolId = isNonAcademic ? (body.school_id || 'central') : body.school_id;

    if (
      typeof body?.code !== 'string' ||
      !body.code.trim() ||
      body.code.length > 20 ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 255 ||
      (!isNonAcademic && (!resolvedSchoolId || typeof resolvedSchoolId !== 'string'))
    ) {
      return NextResponse.json(
        { success: false, error: 'code and name are required (and school_id for academic departments)' },
        { status: 400 }
      );
    }

    if (
      departmentsStore.some(
        (d) =>
          d.code.toUpperCase() === body.code.trim().toUpperCase() &&
          (d.school_id === resolvedSchoolId || (!d.school_id && !resolvedSchoolId))
      )
    ) {
      return NextResponse.json({ success: false, error: 'Department code already exists.' }, { status: 409 });
    }

    const newDepartment = {
      id: `dep-${Date.now()}`,
      school_id: resolvedSchoolId,
      code: body.code.trim().toUpperCase(),
      name: body.name.trim(),
      hod: body.hod || 'Pending Appointment',
      hod_email: body.hod_email || '',
      programs_count: 0,
      is_active: true,
      category: isNonAcademic ? ('non_academic' as const) : ('academic' as const),
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
      details: { code: newDepartment.code, school_id: newDepartment.school_id, category: newDepartment.category },
    });
    return NextResponse.json({ success: true, data: newDepartment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Update a department: rename, reassign HOD, or suspend/archive (is_active).
  // Admin-tier only; audit-logged. Historical student records are untouched
  // by suspend/archive (is_active=false only hides it from new selections).
  const auth = await requireServerAuth(request, ['super_admin','admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'departments');
  try {
    const body = await request.json();
    const dept = departmentsStore.find((d) => d.id === body.id);
    if (!dept) return NextResponse.json({ success: false, error: 'Department not found.' }, { status: 404 });
    if (typeof body.name === 'string' && body.name.trim()) dept.name = body.name.trim();
    if (typeof body.hod === 'string') dept.hod = body.hod.trim() || dept.hod;
    if (typeof body.hod_email === 'string') dept.hod_email = body.hod_email.trim();
    if (typeof body.is_active === 'boolean') dept.is_active = body.is_active;
    recordAuditEvent({
      actor_email: auth.user.email, actor_role: auth.user.role, action: 'DEPARTMENT_UPDATED',
      entity_type: 'departments', entity_id: dept.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1',
      status: 'SUCCESS', details: { code: dept.code },
    });
    return NextResponse.json({ success: true, data: dept });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
