import { requireServerAuth, requirePermission } from '@/lib/auth/server-auth';
import { NextRequest, NextResponse } from 'next/server';

import { coursesStore } from '@/lib/academic/course-catalog';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'courses:read');
  if ('errorResponse' in auth) return auth.errorResponse;
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
    };

    coursesStore.push(newCourse);
    return NextResponse.json({ success: true, data: newCourse }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
