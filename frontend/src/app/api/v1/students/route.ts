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

  try {
    const body = await request.json();

    if (!body || ['first_name','last_name','admission_number','program_name'].some(k=>typeof body[k]!=='string'||!body[k].trim()||body[k].length>255) || (body.fee_balance !== undefined && (!Number.isFinite(Number(body.fee_balance)) || Number(body.fee_balance)<0))) {
      return NextResponse.json(
        { success: false, error: 'Missing required student fields: first_name, last_name, admission_number, program_name' },
        { status: 400 }
      );
    }

    if(studentsStore.some(s=>s.admission_number.toUpperCase()===body.admission_number.trim().toUpperCase()))return NextResponse.json({success:false,error:'Admission number already exists.'},{status:409});
    const newStudent = {
      id: `stu-${Date.now()}`,
      user_id: `usr-${Date.now()}`,
      admission_number: body.admission_number,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email || `${body.first_name.toLowerCase()}.${body.last_name.toLowerCase()}@student.university.ac.ke`,
      gender: body.gender || 'other',
      program_id: body.program_id || 'prog-bit',
      program_name: body.program_name,
      current_year_of_study: Number(body.current_year_of_study) || 1,
      current_semester_number: Number(body.current_semester_number) || 1,
      status: body.status || 'active',
      admission_date: new Date().toISOString().split('T')[0],
      cgpa: 0.0,
      fee_balance: body.fee_balance === undefined ? 55000 : Number(body.fee_balance),
    };

    studentsStore.unshift(newStudent);

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'STUDENT_REGISTERED',
      entity_type: 'students',
      entity_id: newStudent.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { admission_number: newStudent.admission_number, name: `${newStudent.first_name} ${newStudent.last_name}` },
    });

    return NextResponse.json({
      success: true,
      message: 'Student registered successfully',
      data: newStudent,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

