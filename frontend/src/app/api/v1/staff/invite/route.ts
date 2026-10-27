import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { institutionalDatabase } from '@/lib/academic/institutional';

export async function POST(request:Request) {
 const auth=await requireServerAuth(request,['admin','super_admin','registrar']);
 if('errorResponse' in auth)return auth.errorResponse;
 if(auth.user.id.startsWith('usr-'))return NextResponse.json({success:false,error:'Invitations require an institutional administrator.'},{status:403});
 try {
  const body=await request.json();
  if(typeof body?.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return NextResponse.json({success:false,error:'Valid academic record email required.'},{status:400});
  const db=institutionalDatabase();
  const {data:user,error:readError}=await db.from('users').select('id,email,is_active,auth_user_id,roles(code)').eq('email',body.email.trim().toLowerCase()).maybeSingle();
  if(readError)throw new Error('Academic identity lookup failed.');
  if(!user||!user.is_active)return NextResponse.json({success:false,error:'Active academic identity not found.'},{status:404});
  const roles=user.roles as unknown as {code:string}|{code:string}[];const role=Array.isArray(roles)?roles[0]?.code:roles?.code;
  if(auth.user.role==='registrar'&&['admin','super_admin'].includes(role))return NextResponse.json({success:false,error:'Registrars cannot invite administrator accounts.'},{status:403});
  // Resolve prior invitation after a transient database failure before issuing another.
  let identityId:string|null=user.auth_user_id;
  if(body.auth_user_id!==undefined) {
   if(typeof body.auth_user_id!=='string')throw new Error('Valid Auth user ID required.');
   const {data:existing,error}=await db.auth.admin.getUserById(body.auth_user_id);
   if(error||!existing.user||existing.user.email?.toLowerCase()!==user.email.toLowerCase())return NextResponse.json({success:false,error:'Auth account email must match this academic identity.'},{status:409});
   identityId=existing.user.id;
  }
  if(!identityId) {
   const {data:existing}=await db.auth.admin.getUserById(user.id);
   if(existing?.user&&existing.user.email?.toLowerCase()===user.email.toLowerCase())identityId=existing.user.id;
  }
  if(!identityId) {
   for(let page=1;page<=100;page++) {
    const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});
    if(error)throw new Error('Auth identity lookup unavailable. No invitation sent.');
    const existing=data.users.find(u=>u.email?.toLowerCase()===user.email.toLowerCase());
    if(existing){identityId=existing.id;break;}
    if(data.users.length<1000)break;
    if(page===100)throw new Error('Identity search limit reached. Supply the matching Auth user ID to link this record.');
   }
  }
  if(!identityId) {
   const {data,error}=await db.auth.admin.inviteUserByEmail(user.email);
   if(error||!data.user)throw new Error('Invitation could not be sent. Check Auth email delivery and whether this email already has an account.');
   identityId=data.user.id;
  }
  const {error:roleError}=await db.auth.admin.updateUserById(identityId,{app_metadata:{role}});
  if(roleError)throw new Error('Account role could not be assigned. Retry invitation to finish account linking.');
  const {error:linkError}=await db.from('users').update({auth_user_id:identityId,updated_at:new Date().toISOString()}).eq('id',user.id);
  if(linkError)throw new Error('Invitation was sent but account linking failed. Contact support before signing in.');
  await db.from('uams_operation_audit').insert({actor_id:auth.user.id,operation:'identity.invite',entity_id:user.id,details:{role}});
  return NextResponse.json({success:true,message:'Institutional account linked. Newly invited users receive an email to set their password.'});
 }catch(error:any){return NextResponse.json({success:false,error:error?.message||'Invitation unavailable.'},{status:503});}
}
