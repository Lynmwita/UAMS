import { NextRequest, NextResponse } from 'next/server';

let registrationsStore = [
  {
    id: 'reg-1',
    student_id: 'stu-1',
    admission_number: 'BIT/2023/8849',
    student_name: 'Faith Wanjiku',
    course_code: 'BCS 311',
    course_title: 'Advanced Database Systems',
    status: 'approved',
    registered_at: '2026-09-10T10:00:00Z',
    approved_by: 'Registrar',
  },
  {
    id: 'reg-2',
    student_id: 'stu-2',
    admission_number: 'BCS/2023/1204',
    student_name: 'Kevin Otieno',
    course_code: 'BIT 312',
    course_title: 'Distributed Systems & Cloud Computing',
    status: 'pending',
    registered_at: '2026-09-12T14:30:00Z',
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    total: registrationsStore.length,
    data: registrationsStore,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, admission_number, student_name, course_code, course_title } = body;

    if (!student_id || !course_code) {
      return NextResponse.json({ success: false, error: 'student_id and course_code are required' }, { status: 400 });
    }

    const registration = {
      id: `reg-${Date.now()}`,
      student_id,
      admission_number: admission_number || 'BIT/2023/8849',
      student_name: student_name || 'Enrolled Student',
      course_code,
      course_title: course_title || course_code,
      status: 'pending',
      registered_at: new Date().toISOString(),
    };

    registrationsStore.push(registration);
    return NextResponse.json({ success: true, message: 'Course registration submitted successfully', data: registration }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
