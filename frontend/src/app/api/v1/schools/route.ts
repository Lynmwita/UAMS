import { NextRequest, NextResponse } from 'next/server';

const schoolsStore = [
  {
    id: 'sch-ict',
    code: 'SOICT',
    name: 'School of Information Communication & Technology',
    dean: 'Prof. Alice Njuguna',
    dean_email: 'dean.soict@zetech.ac.ke',
    departments_count: 3,
    programs_count: 7,
    is_active: true,
  },
  {
    id: 'sch-biz',
    code: 'SOBE',
    name: 'School of Business and Economics',
    dean: 'Dr. Martin Omondi',
    dean_email: 'dean.sobe@zetech.ac.ke',
    departments_count: 2,
    programs_count: 5,
    is_active: true,
  },
  {
    id: 'sch-eng',
    code: 'SOET',
    name: 'School of Engineering & Technology',
    dean: 'Eng. Samuel Githae',
    dean_email: 'dean.soet@zetech.ac.ke',
    departments_count: 3,
    programs_count: 6,
    is_active: true,
  },
  {
    id: 'sch-edu',
    code: 'SOEAS',
    name: 'School of Education, Arts & Social Sciences',
    dean: 'Dr. Beatrice Wanyama',
    dean_email: 'dean.soeas@zetech.ac.ke',
    departments_count: 2,
    programs_count: 4,
    is_active: true,
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    total: schoolsStore.length,
    data: schoolsStore,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ success: false, error: 'code and name are required' }, { status: 400 });
    }

    const newSchool = {
      id: `sch-${Date.now()}`,
      code: body.code.toUpperCase(),
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
