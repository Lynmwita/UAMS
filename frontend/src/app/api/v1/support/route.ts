import {NextResponse} from 'next/server';
import {requireServerAuth} from '@/lib/auth/server-auth';
import {isDemoUser} from '@/lib/auth/scope';
import {institutionalDatabase} from '@/lib/academic/institutional';
import {uuidPattern} from '@/lib/integrations/support';
const canReadSensitive=(role:string)=>['super_admin','admin'].includes(role);
export async function GET(request:Request){
 const auth=await requireServerAuth(request,['super_admin','admin','registrar','support_agent']);if('errorResponse'in auth)return auth.errorResponse;
 if(isDemoUser(auth.user))return NextResponse.json({success:true,data:[],mode:'demo'},{headers:{'Cache-Control':'private, no-store'}});
 const university=process.env.HUB_UNIVERSITY_ID;if(!university||!uuidPattern.test(university))return NextResponse.json({success:false,error:'The Hub university is not configured.'},{status:503});
 const params=new URL(request.url).searchParams,page=Number(params.get('page')||0),kind=params.get('kind');
 if(!Number.isInteger(page)||page<0||page>10000||(kind&&!['ticket','feedback','attendance','all'].includes(kind)))return NextResponse.json({success:false,error:'Invalid inbox page or filter.'},{status:400});
 try{
  let query=institutionalDatabase().from('hub_support_records').select('*').eq('university_id',university).order('received_at',{ascending:false}).order('id',{ascending:false}).range(page*50,page*50+49);
  if(kind&&kind!=='all')query=query.eq('kind',kind);
  if(!canReadSensitive(auth.user.role))query=query.eq('is_sensitive',false);
  const {data,error}=await query;if(error)throw error;
  return NextResponse.json({success:true,data,page,has_more:data?.length===50},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({success:false,error:'Support requests could not be loaded.'},{status:503});}
}
export async function PATCH(request:Request){
 const auth=await requireServerAuth(request,['super_admin','admin','registrar','support_agent']);if('errorResponse'in auth)return auth.errorResponse;
 if(isDemoUser(auth.user))return NextResponse.json({success:false,error:'Demo sessions cannot review institutional student requests.'},{status:403});
 let body:Record<string,unknown>;try{body=await request.json();}catch{return NextResponse.json({success:false,error:'Invalid JSON.'},{status:400});}
 if(!body||typeof body.id!=='string'||!uuidPattern.test(body.id)||!['in_review','in_progress','resolved','closed'].includes(String(body.status))||typeof body.staff_note!=='string'||body.staff_note.trim().length<2||body.staff_note.length>4000)return NextResponse.json({success:false,error:'Choose a valid request, status and reply (2–4,000 characters).'},{status:400});
 const university=process.env.HUB_UNIVERSITY_ID;if(!university||!uuidPattern.test(university))return NextResponse.json({success:false,error:'The Hub university is not configured.'},{status:503});
 try{
  let query=institutionalDatabase().from('hub_support_records').update({staff_status:body.status,staff_note:body.staff_note.trim(),reviewed_by:auth.user.email,reviewed_at:new Date().toISOString()}).eq('id',body.id).eq('university_id',university);
  if(!canReadSensitive(auth.user.role))query=query.eq('is_sensitive',false);
  const {data,error}=await query.select('id,staff_status,staff_note,reviewed_at').maybeSingle();if(error)throw error;
  if(!data)return NextResponse.json({success:false,error:'Request not found in your review scope.'},{status:404});
  return NextResponse.json({success:true,data});
 }catch{return NextResponse.json({success:false,error:'The staff review could not be saved.'},{status:503});}
}
