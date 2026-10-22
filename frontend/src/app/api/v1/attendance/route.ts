import { institutionalApi } from '@/lib/academic/institutional-api';
import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { canTeachCourse, inDepartment } from '@/lib/auth/scope';

const roster = [
  {id:'stu-1',adm:'BIT/2023/8849',name:'Faith Wanjiku',status:'present'},
  {id:'stu-2',adm:'BCS/2023/1204',name:'Kevin Otieno',status:'present'},
  {id:'stu-3',adm:'BBA/2022/4412',name:'Brian Kiprono',status:'absent'},
];
const sessions = [{id:'ses-1',date:'2026-10-03',course:'BCS 311',courseTitle:'Advanced Database Systems',topic:'Database architecture',lecturer:'Dr. Jane Mwangi',present:2,total:3,percentage:'66.7%'}];
export async function GET(request:Request) {
  const auth = await requireServerAuth(request,['student','lecturer','hod','admin','super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'attendance');
  const rows = roster.filter(r=>auth.user.role==='student' ? auth.user.id==='usr-student-01' && r.id==='stu-1' : inDepartment(auth.user,r.adm));
  return NextResponse.json({success:true,data:{sessions:sessions.filter(s=>canTeachCourse(auth.user,s.course)),roster:rows}});
}
export async function POST(request:Request) {
  const auth = await requireServerAuth(request,['lecturer','super_admin']);
  if ('errorResponse' in auth) return auth.errorResponse;
 if(!auth.user.id.startsWith('usr-'))return institutionalApi(request,auth.user,'attendance');
  try {
    const body=await request.json();
    if(typeof body.course!=='string'||!canTeachCourse(auth.user,body.course)) return NextResponse.json({success:false,error:'Course is not assigned to you.'},{status:403});
    if(!Array.isArray(body.roster)||!body.roster.length||body.roster.some((r:any)=>!r||!roster.some(s=>s.id===r.id)||!['present','absent','late','excused'].includes(r.status))||new Set(body.roster.map((r:any)=>r.id)).size!==body.roster.length) return NextResponse.json({success:false,error:'Invalid attendance roster.'},{status:400});
    const present=body.roster.filter((r:any)=>['present','late'].includes(r.status)).length;
    const session={id:crypto.randomUUID(),date:new Date().toISOString().slice(0,10),course:body.course,courseTitle:String(body.courseTitle||body.course).slice(0,200),topic:String(body.topic||'Roll call').slice(0,500),lecturer:auth.user.email,present,total:body.roster.length,percentage:(present/body.roster.length*100).toFixed(1)+'%'};
    for(const r of body.roster) roster.find(s=>s.id===r.id)!.status=r.status;
    sessions.unshift(session);
    return NextResponse.json({success:true,data:session},{status:201});
  }catch{return NextResponse.json({success:false,error:'Invalid attendance request.'},{status:400});}
}
