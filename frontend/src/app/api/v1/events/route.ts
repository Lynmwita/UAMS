import { institutionalApi } from '@/lib/academic/institutional-api';
import { eventsStore, type UamsCampusEvent } from '@/lib/academic/events';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { recordAuditEvent } from '@/lib/audit/audit-logger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod', 'lecturer', 'finance_officer', 'student', 'support_staff']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'events');

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const scopeType = searchParams.get('scope_type');
  const upcoming = searchParams.get('upcoming') === 'true';
  const search = searchParams.get('search')?.toLowerCase();

  let results = [...eventsStore];
  if (category) results = results.filter((e) => e.category === category);
  if (scopeType) results = results.filter((e) => e.scope_type === scopeType);
  if (upcoming) {
    const now = new Date().toISOString();
    results = results.filter((e) => e.ends_at >= now);
  }
  if (search) {
    results = results.filter((e) => e.title.toLowerCase().includes(search) || e.description.toLowerCase().includes(search));
  }

  results.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return NextResponse.json({ success: true, total: results.length, data: results });
}

export async function POST(request: NextRequest) {
  const auth = await requireServerAuth(request, ['super_admin', 'admin', 'registrar', 'hod']);
  if ('errorResponse' in auth) return auth.errorResponse;
  if (!auth.user.id.startsWith('usr-')) return institutionalApi(request, auth.user, 'events');

  try {
    const body = await request.json();
    const { title, description, category, starts_at, ends_at, location } = body;

    if (!title || !category || !starts_at || !ends_at || !location) {
      return NextResponse.json(
        { success: false, error: 'title, category, starts_at, ends_at, and location are required' },
        { status: 400 }
      );
    }
    const validCategories = ['academic', 'sports', 'cultural', 'orientation', 'exam', 'holiday', 'meeting', 'other'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ success: false, error: `category must be one of: ${validCategories.join(', ')}` }, { status: 400 });
    }
    if (new Date(ends_at) <= new Date(starts_at)) {
      return NextResponse.json({ success: false, error: 'ends_at must be after starts_at.' }, { status: 400 });
    }
    const scopeType = ['university', 'school', 'department', 'program'].includes(body.scope_type) ? body.scope_type : 'university';
    if (scopeType !== 'university' && !body.scope_id) {
      return NextResponse.json({ success: false, error: 'scope_id is required for school, department, or program events.' }, { status: 400 });
    }

    const created: UamsCampusEvent = {
      id: `evt-${Date.now()}`,
      title: String(title).trim(),
      description: String(description || '').trim(),
      category,
      starts_at: new Date(starts_at).toISOString(),
      ends_at: new Date(ends_at).toISOString(),
      location: String(location).trim(),
      scope_type: scopeType,
      scope_id: scopeType === 'university' ? null : String(body.scope_id),
      scope_name: scopeType === 'university' ? null : String(body.scope_name || body.scope_id),
      created_by: auth.user.email,
      created_by_role: auth.user.role,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    eventsStore.push(created);

    recordAuditEvent({
      actor_email: auth.user.email,
      actor_role: auth.user.role,
      action: 'CAMPUS_EVENT_CREATED',
      entity_type: 'campus_events',
      entity_id: created.id,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1',
      status: 'SUCCESS',
      details: { title: created.title, scope_type: created.scope_type },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request:NextRequest){
 const auth=await requireServerAuth(request,['admin','super_admin','registrar','hod']);if('errorResponse'in auth)return auth.errorResponse;
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'events');
 try{const body=await request.json();const event=eventsStore.find(e=>e.id===body.id);if(!event)return NextResponse.json({success:false,error:'Event not found.'},{status:404});if(auth.user.role==='hod'&&event.created_by!==auth.user.email)return NextResponse.json({success:false,error:'Event outside your scope.'},{status:403});if(body.is_active===false){event.is_active=false;return NextResponse.json({success:true,data:event});}if(typeof body.title!=='string'||!body.title.trim()||!Number.isFinite(Date.parse(body.starts_at))||!Number.isFinite(Date.parse(body.ends_at))||Date.parse(body.ends_at)<=Date.parse(body.starts_at))return NextResponse.json({success:false,error:'Valid event title and dates required.'},{status:400});Object.assign(event,{title:body.title.trim(),description:String(body.description||''),starts_at:new Date(body.starts_at).toISOString(),ends_at:new Date(body.ends_at).toISOString(),location:String(body.location||event.location)});return NextResponse.json({success:true,data:event});}catch{return NextResponse.json({success:false,error:'Invalid event update.'},{status:400});}
}
