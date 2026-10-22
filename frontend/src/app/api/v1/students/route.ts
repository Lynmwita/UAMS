import { institutionalApi } from '@/lib/academic/institutional-api';
import { updateInstitutionalStudent } from '@/lib/academic/student-update';
import { inDepartment } from '@/lib/auth/scope';
import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth, requirePermission } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';

// In-memory student store synchronized with database schema
import { studentsStore } from '@/lib/academic/student-records';

export async function GET(request: NextRequest) {
  // Enforce server-side authentication
  const auth = await requireServerAuth(request, ['student','admin','super_admin','registrar','hod','finance_officer']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'students');

  const { user } = auth;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const program = searchParams.get('program');
  const status = searchParams.get('status');

  // Student role isolation: students may only view their own profile (IDOR / BOLA Prevention)
  if (user.role === 'student') {
    const studentSelf = studentsStore.filter(
      (s) =>
        s.email.toLowerCase() === user.email.toLowerCase() ||
        s.user_id === user.id ||
        (user.email.toLowerCase() === 'student@university.ac.ke' && s.id === 'stu-1')
    );
    return NextResponse.json({
      success: true,
      total: studentSelf.length,
      data: studentSelf,
      role_context: 'student_self',
    });
  }

  // Sanitize any casing issues and purge stray test sync records
  for (let i = studentsStore.length - 1; i >= 0; i--) {
    const s = studentsStore[i];
    if (
      s.admission_number?.startsWith('SYNC/') ||
      s.first_name?.toLowerCase().includes('test sync') ||
      s.email?.toLowerCase().startsWith('sync.test.')
    ) {
      studentsStore.splice(i, 1);
      continue;
    }
    if (s.last_name === 'simon') {
      s.last_name = 'Simon';
    }
  }

  // Staff roles (registrar, admin, super_admin, hod, lecturer, finance_officer)
  let results = studentsStore.filter(s => inDepartment(user, s.admission_number));

  if (search) {
    results = results.filter(
      (s) =>
        s.admission_number.toLowerCase().includes(search) ||
        s.first_name.toLowerCase().includes(search) ||
        s.last_name.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search)
    );
  }

  if (program) {
    results = results.filter((s) => s.program_id === program);
  }

  if (status) {
    results = results.filter((s) => s.status === status);
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    data: user.role === 'finance_officer' ? results.map(s => ({ id:s.id, admission_number:s.admission_number, first_name:s.first_name, last_name:s.last_name, email:s.email, fee_balance:s.fee_balance, status:s.status })) : results,
  });
}

export async function POST(request: NextRequest) {
  // Permission guard: strictly requires students:write permission
  const auth = await requirePermission(request, 'students:write');
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'students');

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    // Support both full_name or first_name + last_name
    let fullName = (body.full_name || body.name || body.fullName || '').trim();
    let firstName = (body.first_name || '').trim();
    let lastName = (body.last_name || '').trim();

    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (fullName && (!firstName || !lastName)) {
      const parts = fullName.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || firstName;
    }

    const email = (body.email || '').trim().toLowerCase();
    const regNo = (body.registration_number || body.admission_number || body.admissionNo || body.registrationNumber || '').trim().toUpperCase();
    const faculty = (body.faculty || 'School of Computing & Informatics').trim();
    const department = (body.department || 'Information Technology').trim();
    const programName = (body.program_name || body.program || `Bachelor of Science in ${department}`).trim();
    const yearOfStudy = Number(body.year_of_study ?? body.current_year_of_study ?? body.year ?? 1);
    const semester = Number(body.semester ?? body.current_semester_number ?? 1);
    const campusCode = (body.campus_code || body.campus || 'ZU-TECH').trim();
    const initialPassword = body.initial_password || body.initialPassword || 'StudentPassword123!';

    // Basic required field validations
    if (!fullName || !email || !regNo) {
      return NextResponse.json(
        { success: false, error: 'Full name, email, and registration number are required.' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Password validation (min 8 chars)
    if (initialPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Initial password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // Year validation (1-6)
    if (!Number.isInteger(yearOfStudy) || yearOfStudy < 1 || yearOfStudy > 6) {
      return NextResponse.json(
        { success: false, error: 'Year of study must be an integer between 1 and 6.' },
        { status: 400 }
      );
    }

    // Duplicate check: email
    if (studentsStore.some((s) => s.email && s.email.trim().toLowerCase() === email)) {
      return NextResponse.json(
        { success: false, error: 'A student with this email already exists' },
        { status: 400 }
      );
    }

    // Duplicate check: registration / admission number
    if (studentsStore.some((s) => s.admission_number && s.admission_number.trim().toUpperCase() === regNo)) {
      return NextResponse.json(
        { success: false, error: 'A student with this registration number already exists' },
        { status: 400 }
      );
    }

    const newStudent = {
      id: `stu-${Date.now()}`,
      user_id: `usr-${Date.now()}`,
      admission_number: regNo,
      first_name: firstName,
      last_name: lastName,
      email: email,
      gender: body.gender || 'other',
      faculty: faculty,
      department: department,
      campus_code: campusCode,
      program_id: body.program_id || 'prog-bit',
      program_name: programName,
      current_year_of_study: yearOfStudy,
      current_semester_number: semester,
      status: body.status || 'active',
      admission_date: new Date().toISOString().split('T')[0],
      cgpa: 0.0,
      fee_balance: body.fee_balance === undefined ? 55000 : Number(body.fee_balance),
    };

    studentsStore.unshift(newStudent);

    // Audit log entry: action student_registered, actor role registrar/staff
    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'student_registered',
      entity_type: 'students',
      entity_id: regNo,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: {
        admission_number: regNo,
        registration_number: regNo,
        email: email,
        name: fullName,
        faculty: faculty,
        department: department,
        year_of_study: yearOfStudy,
        campus_code: campusCode,
      },
    });

    // Demonstration records are isolated and never provision external accounts.
    return NextResponse.json(
      {
        success: true,
        message: `Demonstration student registered: ${fullName} (${regNo}). This record exists only in the current demo process.`,
        data: newStudent,
        initial_password: initialPassword,
        hub_sync: null,
        hub_sync_error: 'External synchronization is disabled for demonstration records.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'students:write');
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'students');

  const { searchParams } = new URL(request.url);
  const emailParam = searchParams.get('email')?.toLowerCase();
  const regNoParam = searchParams.get('admission_number')?.toUpperCase() || searchParams.get('registration_number')?.toUpperCase();

  let bodyEmail = '';
  let bodyRegNo = '';
  try {
    const b = await request.json();
    if (b.email) bodyEmail = String(b.email).toLowerCase();
    if (b.admission_number || b.registration_number) {
      bodyRegNo = String(b.admission_number || b.registration_number).toUpperCase();
    }
  } catch {}

  const targetEmail = (emailParam || bodyEmail).trim();
  const targetRegNo = (regNoParam || bodyRegNo).trim();

  const initialCount = studentsStore.length;
  for (let i = studentsStore.length - 1; i >= 0; i--) {
    const s = studentsStore[i];
    if (
      (targetEmail && s.email && s.email.toLowerCase() === targetEmail) ||
      (targetRegNo && s.admission_number && s.admission_number.toUpperCase() === targetRegNo)
    ) {
      studentsStore.splice(i, 1);
    }
  }

  return NextResponse.json({
    success: true,
    deleted: initialCount - studentsStore.length,
    message: 'Student record removed from UAMS store',
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, 'students:write');
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }
  if (!auth.user.id.startsWith('usr-')) return updateInstitutionalStudent(request, auth.user);

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object' },
        { status: 400 }
      );
    }

    const id = body.id;
    const admissionNo = (body.admission_number || body.registration_number || body.regNo || '').trim().toUpperCase();
    const currentEmail = (body.current_email || body.lookup_email || '').trim().toLowerCase();

    // Locate student in store
    const student = studentsStore.find(
      (s) =>
        (id && s.id === id) ||
        (admissionNo && s.admission_number && s.admission_number.toUpperCase() === admissionNo) ||
        (currentEmail && s.email && s.email.toLowerCase() === currentEmail)
    );

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 });
    }

    // 1. Deactivation / Suspension / Status Toggle
    if (body.status !== undefined) {
      const allowed = ['active', 'suspended', 'inactive'];
      const nextStatus = String(body.status).toLowerCase();
      if (!allowed.includes(nextStatus)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status. Must be active, suspended, or inactive.' },
          { status: 400 }
        );
      }
      const prevStatus = student.status;
      student.status = nextStatus;

      const action = nextStatus === 'suspended' ? 'student_suspended' : nextStatus === 'active' ? 'student_reactivated' : 'student_status_updated';
      recordAuditEvent({
        actor_email: auth.user.email,
        actor_role: auth.user.role,
        action,
        entity_type: 'students',
        entity_id: student.admission_number,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
        status: 'SUCCESS',
        details: {
          admission_number: student.admission_number,
          student_id: student.id,
          name: `${student.first_name} ${student.last_name}`.trim(),
          previous_status: prevStatus,
          new_status: nextStatus,
          reason: body.reason || 'Registrar operational status change',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Student status successfully changed to ${nextStatus}`,
        data: student,
      });
    }

    // 2. Edit student details (fixing typos and mistakes)
    let fullName = (body.full_name || body.name || body.fullName || '').trim();
    let firstName = (body.first_name || '').trim();
    let lastName = (body.last_name || '').trim();

    if (fullName) {
      const parts = fullName.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || firstName;
    }

    const nextEmail = body.email ? body.email.trim().toLowerCase() : undefined;
    const nextRegNo = (body.registration_number || body.admission_number)
      ? String(body.registration_number || body.admission_number).trim().toUpperCase()
      : undefined;

    // Email validation and duplicate check
    if (nextEmail && nextEmail !== student.email.toLowerCase()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(nextEmail)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
      }
      if (studentsStore.some((s) => s.id !== student.id && s.email && s.email.toLowerCase() === nextEmail)) {
        return NextResponse.json({ success: false, error: 'A student with this email already exists' }, { status: 400 });
      }
      student.email = nextEmail;
    }

    // Registration number is immutable to prevent identity desynchronization
    if (nextRegNo && nextRegNo !== student.admission_number.toUpperCase()) {
      return NextResponse.json(
        { success: false, error: 'Registration number is a permanent record key and cannot be edited.' },
        { status: 400 }
      );
    }

    if (firstName) student.first_name = firstName;
    if (lastName) student.last_name = lastName;
    if (body.faculty) student.faculty = String(body.faculty).trim();
    if (body.department) student.department = String(body.department).trim();
    if (body.program_name || body.program) {
      student.program_name = String(body.program_name || body.program).trim();
    }
    if (body.campus_code || body.campus) {
      student.campus_code = String(body.campus_code || body.campus).trim();
    }
    if (body.year_of_study !== undefined || body.year !== undefined) {
      student.current_year_of_study = Number(body.year_of_study ?? body.year);
    }
    if (body.fee_balance !== undefined) {
      student.fee_balance = Number(body.fee_balance);
    }

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'student_updated',
      entity_type: 'students',
      entity_id: student.admission_number,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: {
        admission_number: student.admission_number,
        student_id: student.id,
        name: `${student.first_name} ${student.last_name}`.trim(),
        email: student.email,
        faculty: student.faculty,
        department: student.department,
        program: student.program_name,
        year: student.current_year_of_study,
      },
    });

    // Demonstration edits never provision or change external accounts.

    return NextResponse.json({
      success: true,
      message: `Student record updated: ${student.first_name} ${student.last_name} (${student.admission_number})`,
      data: student,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export const PUT = PATCH;
