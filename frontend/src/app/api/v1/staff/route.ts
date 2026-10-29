import { institutionalApi } from '@/lib/academic/institutional-api';
import { institutionalDatabase } from '@/lib/academic/institutional';
import { resolveStaffPortalRole } from '@/lib/supabase/provisioning';
import { staffStore, syncStaffStoreFromDatabase, type UamsStaffMember } from '@/lib/hr/staff';
import { extractStaffPhoto, isValidStaffPhoto } from '@/lib/staff/photo';
import { departmentsStore } from '@/lib/academic/structure';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { NextRequest, NextResponse } from 'next/server';
import { resolveCanonicalRole } from '@/lib/auth/roles';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'staff');

  try {
    await syncStaffStoreFromDatabase();
  } catch {
    // Non-fatal if database is offline or not configured
  }

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
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;

  // Registrars may register staff, but never administrator accounts. Peek at the
  // requested role before the institutional delegation consumes the body; the
  // clone leaves the original request readable for the handlers below.
  if (auth.user.role === 'registrar') {
    try {
      const peek = await request.clone().json();
      const requestedRole = String(peek?.role || '').toLowerCase();
      if (requestedRole === 'admin' || requestedRole === 'super_admin') {
        return NextResponse.json(
          { success: false, error: 'Registrars may not register administrator accounts.' },
          { status: 403 }
        );
      }
    } catch {
      // Malformed body: downstream validation reports it.
    }
  }

  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'staff');

  try {
    const body = await request.json();
    const { first_name, last_name, email, phone, role, department_id, job_title, qualification, photo_url } = body;

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
    const photo = extractStaffPhoto(body);
    if (photo !== undefined && photo !== null && !isValidStaffPhoto(photo)) {
      return NextResponse.json({ success: false, error: 'Profile photo must be an image (JPG/PNG/WebP) or an https photo URL.' }, { status: 400 });
    }

    let fallbackDeptId = 'dep-general';
    if (role === 'library') {
      fallbackDeptId = 'dep-library';
    } else if (['admin', 'super_admin', 'registrar', 'admissions_officer', 'examinations_officer', 'hr_officer', 'legal_officer', 'procurement_officer'].includes(role)) {
      fallbackDeptId = 'dep-admin';
    } else if (['finance_officer', 'accountant'].includes(role)) {
      fallbackDeptId = 'dep-finance';
    }
    const resolvedDeptId = (!department_id || department_id === 'none' || department_id === 'other' || department_id === 'dep-general') ? fallbackDeptId : department_id;
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
      photo_url: photo_url || undefined,
      is_active: true,
      joined_date: new Date().toISOString().slice(0, 10),
      ...(photo ? { photo_url: photo } : {}),
    };
    staffStore.push(created);

    try {
      const db = institutionalDatabase();
      // Resolve the portal role for the role_id lookup: the staff form
      // sends job titles and legacy values (e.g. 'library' for
      // librarians) that have no roles row under that name, so a plain
      // lookup seeded role-less users rows that login then dropped as
      // "inactive". resolveStaffPortalRole maps a staff record whose job
      // title has no portal role (cleaner, cook, driver, ...) to the
      // scoped 'support_staff' role, so the users row always carries a
      // loggable role; it returns null only when no record exists.
      const portalRole = resolveStaffPortalRole(true, role);
      const { data: roleRow } = await db.from('roles').select('id').eq('code', portalRole || role).maybeSingle();
      await db.from('users').upsert({
        email: emailNorm,
        first_name: created.first_name,
        last_name: created.last_name,
        phone_number: created.phone || null,
        avatar_url: created.photo_url || null,
        role_id: roleRow?.id || null,
        is_active: true,
      }, { onConflict: 'email' });
    } catch {
      // Non-fatal if offline
    }

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
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) return auth.errorResponse;
  // Deactivate/Reactivate stays admin-only on BOTH paths: a registrar may
  // edit staff details, but toggling is_active is an admin act. This check
  // runs before the institutional delegation so it covers that path too.
  if (auth.user.role === 'registrar') {
    try {
      const peek = await request.clone().json();
      if (typeof peek?.is_active === 'boolean') {
        return NextResponse.json(
          { success: false, error: 'Registrars cannot deactivate or reactivate staff accounts.' },
          { status: 403 }
        );
      }
    } catch {
      // Malformed body: downstream validation reports it.
    }
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'staff');
  try {
    const body = await request.json();
    const staff = staffStore.find((s) => s.id === body.staff_id);
    if (!staff) return NextResponse.json({ success: false, error: 'Staff member not found.' }, { status: 404 });

    if (auth.user.role === 'registrar' && (staff.role === 'admin' || staff.role === 'super_admin')) {
      return NextResponse.json(
        { success: false, error: 'Registrars cannot modify administrative accounts.' },
        { status: 403 }
      );
    }

    if (typeof body.is_active === 'boolean') staff.is_active = body.is_active;
    const photo = extractStaffPhoto(body);
    if (photo !== undefined && photo !== null && !isValidStaffPhoto(photo)) {
      return NextResponse.json({ success: false, error: 'Profile photo must be an image (JPG/PNG/WebP) or an https photo URL.' }, { status: 400 });
    }
    if (photo !== undefined) staff.photo_url = photo || undefined;
    if (body.first_name) staff.first_name = String(body.first_name).trim();
    if (body.last_name) staff.last_name = String(body.last_name).trim();
    if (body.job_title) staff.job_title = String(body.job_title);
    if (body.qualification) staff.qualification = String(body.qualification);
    if (body.phone) staff.phone = String(body.phone);
    if (body.photo_url !== undefined) staff.photo_url = body.photo_url || undefined;
    if (body.role) {
      const nextRole = String(body.role).toLowerCase();
      if (auth.user.role === 'registrar' && (nextRole === 'admin' || nextRole === 'super_admin')) {
        return NextResponse.json(
          { success: false, error: 'Registrars cannot assign administrative roles.' },
          { status: 403 }
        );
      }
      staff.role = nextRole;
    }
    if (body.department_id) {
      staff.department_id = String(body.department_id);
      const d = departmentsStore.find((x) => x.id === staff.department_id);
      if (d) staff.department_name = d.name;
    }

    const oldEmail = staff.email;
    let nextEmail = oldEmail;
    if (body.email && typeof body.email === 'string') {
      const emailNorm = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return NextResponse.json({ success: false, error: 'A valid email is required.' }, { status: 400 });
      }
      if (emailNorm !== oldEmail.toLowerCase() && staffStore.some((s) => s.id !== staff.id && s.email.toLowerCase() === emailNorm)) {
        return NextResponse.json({ success: false, error: 'Another staff member already has this email.' }, { status: 409 });
      }
      staff.email = emailNorm;
      nextEmail = emailNorm;
    }

    // Sync updates to Supabase users table and Auth
    try {
      const db = institutionalDatabase();
      const { data: roleRow } = await db.from('roles').select('id').eq('code', staff.role).maybeSingle();
      const { data: updatedUsers } = await db
        .from('users')
        .update({
          email: nextEmail,
          first_name: staff.first_name,
          last_name: staff.last_name,
          phone_number: staff.phone || null,
          avatar_url: staff.photo_url || null,
          role_id: roleRow?.id || null,
          is_active: staff.is_active,
          updated_at: new Date().toISOString(),
        })
        .or(`email.eq.${oldEmail},email.eq.${nextEmail}`)
        .select('id,auth_user_id');

      const authId = updatedUsers?.[0]?.auth_user_id;
      if (authId) {
        await db.auth.admin.updateUserById(authId, {
          email: nextEmail,
          app_metadata: { role: staff.role },
        });
      }
    } catch {
      // Non-fatal if offline
    }

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
