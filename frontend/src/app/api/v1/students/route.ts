import { NextRequest, NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';

// In-memory student store synchronized with database schema
let studentsStore = [
  {
    id: 'stu-1',
    user_id: 'usr-student-01',
    admission_number: 'BIT/2023/8849',
    first_name: 'Faith',
    last_name: 'Wanjiku',
    email: 'faith.wanjiku@student.university.ac.ke',
    gender: 'female',
    program_id: 'prog-bit',
    program_name: 'Bachelor of Science in Information Technology',
    current_year_of_study: 3,
    current_semester_number: 1,
    status: 'active',
    admission_date: '2023-09-01',
    cgpa: 3.82,
    fee_balance: 0,
  },
  {
    id: 'stu-2',
    user_id: 'usr-student-02',
    admission_number: 'BCS/2023/1204',
    first_name: 'Kevin',
    last_name: 'Otieno',
    email: 'kevin.otieno@student.university.ac.ke',
    gender: 'male',
    program_id: 'prog-bcs',
    program_name: 'Bachelor of Science in Computer Science',
    current_year_of_study: 2,
    current_semester_number: 2,
    status: 'active',
    admission_date: '2023-09-01',
    cgpa: 3.65,
    fee_balance: 18500,
  },
  {
    id: 'stu-3',
    user_id: 'usr-student-03',
    admission_number: 'BBA/2022/4412',
    first_name: 'Brian',
    last_name: 'Kiprono',
    email: 'brian.kiprono@student.university.ac.ke',
    gender: 'male',
    program_id: 'prog-bba',
    program_name: 'Bachelor of Business Administration',
    current_year_of_study: 4,
    current_semester_number: 1,
    status: 'active',
    admission_date: '2022-09-01',
    cgpa: 3.48,
    fee_balance: 0,
  },
];

export async function GET(request: NextRequest) {
  // Enforce server-side authentication
  const auth = requireServerAuth(request);
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
  let results = [...studentsStore];

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
    data: results,
  });
}

export async function POST(request: NextRequest) {
  // Only admissions/registrar and admins can register students
  const auth = requireServerAuth(request, ['super_admin', 'admin', 'registrar']);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();

    if (!body.first_name || !body.last_name || !body.admission_number || !body.program_name) {
      return NextResponse.json(
        { success: false, error: 'Missing required student fields: first_name, last_name, admission_number, program_name' },
        { status: 400 }
      );
    }

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
      fee_balance: Number(body.fee_balance) || 55000,
    };

    studentsStore.unshift(newStudent);

    return NextResponse.json({
      success: true,
      message: 'Student registered successfully',
      data: newStudent,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

