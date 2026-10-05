import { NextRequest, NextResponse } from 'next/server';

let coursesStore = [
  {
    id: 'crs-1',
    code: 'BCS 311',
    title: 'Advanced Database Systems',
    department: 'Computer Science',
    credit_hours: 3,
    level: 300,
    prerequisites: ['BCS 211'],
    lecturer: 'Dr. Jane Mwangi',
    capacity: 60,
    enrolled: 48,
    is_active: true,
  },
  {
    id: 'crs-2',
    code: 'BIT 312',
    title: 'Distributed Systems & Cloud Computing',
    department: 'Information Technology',
    credit_hours: 3,
    level: 300,
    prerequisites: ['BIT 220'],
    lecturer: 'Prof. David Kamau',
    capacity: 65,
    enrolled: 52,
    is_active: true,
  },
  {
    id: 'crs-3',
    code: 'BCS 314',
    title: 'Software Engineering Architecture',
    department: 'Computer Science',
    credit_hours: 4,
    level: 300,
    prerequisites: ['BCS 214'],
    lecturer: 'Eng. Eric Ochieng',
    capacity: 55,
    enrolled: 44,
    is_active: true,
  },
  {
    id: 'crs-4',
    code: 'BCS 316',
    title: 'Network & System Security',
    department: 'Computer Science',
    credit_hours: 3,
    level: 300,
    prerequisites: ['BIT 215'],
    lecturer: 'Dr. Jane Mwangi',
    capacity: 50,
    enrolled: 41,
    is_active: true,
  },
  {
    id: 'crs-5',
    code: 'BBA 201',
    title: 'Principles of Financial Accounting',
    department: 'Business Administration',
    credit_hours: 3,
    level: 200,
    prerequisites: [],
    lecturer: 'Dr. Martin Omondi',
    capacity: 80,
    enrolled: 72,
    is_active: true,
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.toLowerCase();
  const level = searchParams.get('level');

  let results = [...coursesStore];

  if (search) {
    results = results.filter(
      (c) => c.code.toLowerCase().includes(search) || c.title.toLowerCase().includes(search) || c.department.toLowerCase().includes(search)
    );
  }

  if (level) {
    results = results.filter((c) => c.level === Number(level));
  }

  return NextResponse.json({
    success: true,
    total: results.length,
    data: results,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.code || !body.title || !body.credit_hours) {
      return NextResponse.json({ success: false, error: 'code, title, and credit_hours are required' }, { status: 400 });
    }

    const newCourse = {
      id: `crs-${Date.now()}`,
      code: body.code.toUpperCase(),
      title: body.title,
      department: body.department || 'Computer Science',
      credit_hours: Number(body.credit_hours),
      level: Number(body.level) || 100,
      prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites : [],
      lecturer: body.lecturer || 'Staff Assigned',
      capacity: Number(body.capacity) || 50,
      enrolled: 0,
      is_active: true,
    };

    coursesStore.push(newCourse);
    return NextResponse.json({ success: true, data: newCourse }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
