import { institutionalApi } from '@/lib/academic/institutional-api';
import { requireServerAuth, requirePermission } from '@/lib/auth/server-auth';
import { NextRequest, NextResponse } from 'next/server';

import { coursesStore } from '@/lib/academic/course-catalog';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'courses:read');
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'courses');
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
  const auth = await requirePermission(request, 'courses:write');
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'courses');
  try {
    const body = await request.json();
    if (typeof body?.code !== 'string' || !body.code.trim() || body.code.length > 20 || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 255 || !Number.isInteger(Number(body.credit_hours)) || Number(body.credit_hours)<1 || Number(body.credit_hours)>24) {
      return NextResponse.json({ success: false, error: 'code, title, and credit_hours are required' }, { status: 400 });
    }

    if(coursesStore.some(c=>c.code.toUpperCase()===body.code.trim().toUpperCase()))return NextResponse.json({success:false,error:'Course code already exists.'},{status:409});
    const newCourse = {
      id: `crs-${Date.now()}`,
      code: body.code.trim().toUpperCase(),
      title: body.title,
      department: body.department || 'Computer Science',
      credit_hours: Number(body.credit_hours),
      level: Number(body.level) || 100,
      prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites : [],
      lecturer: body.lecturer || 'Staff Assigned',
      capacity: Number(body.capacity) || 50,
      enrolled: 0,
      is_active: true,
      unit_type: (['core', 'elective'].includes(body.unit_type) ? body.unit_type : 'core') as 'core' | 'elective',
      semester: ([1, 2].includes(Number(body.semester)) ? Number(body.semester) : 1) as 1 | 2,
      description: typeof body.description === 'string' ? body.description.slice(0, 2000) : '',
    };

    coursesStore.push(newCourse);
    return NextResponse.json({ success: true, data: newCourse }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Update a course unit: details, lecturer, unit_type, semester, description,
  // or archive/reactivate (is_active). Admin-tier only.
  const auth = await requirePermission(request, 'courses:write');
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'courses');
  try {
    const body = await request.json();
    const course = coursesStore.find((c) => c.id === body.id);
    if (!course) return NextResponse.json({ success: false, error: 'Course not found.' }, { status: 404 });
    if (typeof body.title === 'string' && body.title.trim() && body.title.length <= 255) course.title = body.title.trim();
    if (typeof body.department === 'string' && body.department.trim()) course.department = body.department.trim();
    if (Number.isInteger(Number(body.credit_hours)) && Number(body.credit_hours) >= 1 && Number(body.credit_hours) <= 24) {
      course.credit_hours = Number(body.credit_hours);
    }
    if ([100, 200, 300, 400, 500, 600].includes(Number(body.level))) course.level = Number(body.level);
    if (Array.isArray(body.prerequisites)) course.prerequisites = body.prerequisites.map(String);
    if (typeof body.lecturer === 'string') course.lecturer = body.lecturer.trim() || 'Unassigned';
    if (typeof body.unit_type === 'string' && ['core', 'elective'].includes(body.unit_type)) {
      (course as any).unit_type = body.unit_type;
    }
    if ([1, 2].includes(Number(body.semester))) (course as any).semester = Number(body.semester);
    if (typeof body.description === 'string' && body.description.length <= 2000) (course as any).description = body.description;
    if (typeof body.is_active === 'boolean') course.is_active = body.is_active;
    return NextResponse.json({ success: true, data: course });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
