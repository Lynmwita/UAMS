import { institutionalApi } from '@/lib/academic/institutional-api';
import { staffStore, type UamsStaffMember } from '@/lib/hr/staff';
import { departmentsStore } from '@/lib/academic/structure';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'staff');

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const departmentId = searchParams.get('department_id');
  const search = searchParams.get('search')?.toLowerCase();

  let results = [...staffStore];
  if (role) results = results.filter((s) => s.role === role);
  if (departmentId) results = results.filter((s) => s.department_id === departmentId);
  if (search) {
    results = results.filter(
      (s) =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search) ||
        s.staff_number.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ success: true, total: results.length, data: results });
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'staff');

  try {
    const body = await request.json();
    const { first_name, last_name, email, phone, role, department_id, job_title, qualification } = body;

    if (!first_name || !last_name || !email || !role) {
      return NextResponse.json(
        { success: false, error: 'first_name, last_name, email, and role are required' },
        { status: 400 }
      );
    }
    const emailNorm = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json({ success: false, error: 'A valid email is required.' }, { status: 400 });
    }
    if (staffStore.some((s) => s.email.toLowerCase() === emailNorm)) {
      return NextResponse.json({ success: false, error: 'A staff member with this email already exists.' }, { status: 409 });
    }

    const resolvedDeptId = (!department_id || department_id === 'none' || department_id === 'other' || department_id === 'dep-general') ? 'dep-general' : department_id;
    let department = departmentsStore.find((d) => d.id === resolvedDeptId);
    if (!department) {
      department = departmentsStore.find((d) => d.id === 'dep-general') || {
        id: 'dep-general',
        school_id: 'central',
        code: 'GEN',
        name: 'General Campus Support & Operations',
        hod: 'General Operations',
        hod_email: 'operations@university.ac.ke',
        programs_count: 0,
        is_active: true,
        category: 'non_academic',
      };
    }

    const created: UamsStaffMember = {
      id: `staff-${Date.now()}`,
      staff_number: `EUC/STAFF/${String(staffStore.length + 1).padStart(3, '0')}`,
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: emailNorm,
      phone: String(phone || ''),
      role,
      department_id: department.id,
      department_name: department.name,
      school_id: department.school_id || 'central',
      job_title: job_title || role,
      qualification: qualification || '',
      is_active: true,
      joined_date: new Date().toISOString().slice(0, 10),
    };
    staffStore.push(created);

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'STAFF_MEMBER_CREATED',
      entity_type: 'staff',
      entity_id: created.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { staff_number: created.staff_number, role: created.role },
    });

    return NextResponse.json(
      { success: true, message: `Staff member created. Staff number: ${created.staff_number}`, data: created },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'staff');
  try {
    const body = await request.json();
    const staff = staffStore.find((s) => s.id === body.staff_id);
    if (!staff) return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });

    if (typeof body.is_active === 'boolean') staff.is_active = body.is_active;
    if (body.job_title) staff.job_title = String(body.job_title);
    if (body.qualification) staff.qualification = String(body.qualification);
    if (body.phone) staff.phone = String(body.phone);

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'STAFF_MEMBER_UPDATED',
      entity_type: 'staff',
      entity_id: staff.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
    });
    return NextResponse.json({ success: true, data: staff });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
