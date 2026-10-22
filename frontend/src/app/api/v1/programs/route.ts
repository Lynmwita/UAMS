import { institutionalApi } from '@/lib/academic/institutional-api';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { programsStore } from '@/lib/academic/structure';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'student', 'finance_officer']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'programs');

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('department_id');
  const schoolId = searchParams.get('school_id');
  const search = searchParams.get('search')?.toLowerCase();

  let results = [...programsStore];
  if (departmentId) results = results.filter((p) => p.department_id === departmentId);
  if (schoolId) results = results.filter((p) => p.school_id === schoolId);
  if (search) {
    results = results.filter((p) => p.code.toLowerCase().includes(search) || p.name.toLowerCase().includes(search));
  }

  return NextResponse.json({ success: true, total: results.length, data: results });
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'programs');
  try {
    const body = await request.json();
    if (
      typeof body?.code !== 'string' ||
      !body.code.trim() ||
      body.code.length > 20 ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 255 ||
      typeof body.department_id !== 'string' ||
      !body.department_id ||
      !Number.isInteger(Number(body.duration_years)) ||
      Number(body.duration_years) < 1 ||
      Number(body.duration_years) > 8
    ) {
      return NextResponse.json(
        { success: false, error: 'code, name, department_id, and duration_years (1-8) are required' },
        { status: 400 }
      );
    }

    if (programsStore.some((p) => p.code.toUpperCase() === body.code.trim().toUpperCase())) {
      return NextResponse.json({ success: false, error: 'Program code already exists.' }, { status: 409 });
    }

    const newProgram = {
      id: `prog-${Date.now()}`,
      department_id: body.department_id,
      school_id: body.school_id || '',
      code: body.code.trim().toUpperCase(),
      name: body.name,
      duration_years: Number(body.duration_years),
      credit_limit: Number(body.credit_limit) || 48,
      level: ['undergraduate', 'postgraduate', 'diploma', 'certificate'].includes(body.level) ? body.level : 'undergraduate',
      is_active: true,
    };

    programsStore.push(newProgram);
    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'PROGRAM_CREATED',
      entity_type: 'programs',
      entity_id: newProgram.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { code: newProgram.code, department_id: newProgram.department_id },
    });
    return NextResponse.json({ success: true, data: newProgram }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
