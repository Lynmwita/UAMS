import { NextResponse } from 'next/server';
import { requireServerAuth } from '@/lib/auth/server-auth';

const notices=[{id:'notice-1',title:'Course registration',audience:'Students',category:'Academic',priority:'Normal',date:'Oct 12, 2026',author:'Office of the Registrar',body:'Review your registered courses with your department.'}];
export async function GET(request:Request){
  const auth=await requireServerAuth(request);if('errorResponse' in auth)return auth.errorResponse;
  const audience=auth.user.role==='student'?'Students':'Faculty & Lecturers';
  return NextResponse.json({success:true,data:['super_admin','admin','registrar'].includes(auth.user.role)?notices:notices.filter(n=>n.audience==='All Campus'||n.audience===audience)});
}
export async function POST(request:Request){
  const auth=await requireServerAuth(request,['admin','registrar','super_admin']);if('errorResponse' in auth)return auth.errorResponse;
  try{const body=await request.json();if(typeof body.title!=='string'||!body.title.trim()||body.title.length>200||typeof body.body!=='string'||!body.body.trim()||body.body.length>10000||!['Students','Faculty & Lecturers','All Campus'].includes(body.audience))return NextResponse.json({success:false,error:'Valid title, body and audience are required.'},{status:400});
    const notice={id:crypto.randomUUID(),title:body.title.trim(),body:body.body.trim(),audience:body.audience,category:String(body.category||'Academic').slice(0,50),priority:String(body.priority||'Normal').slice(0,30),date:new Date().toLocaleDateString('en-US'),author:auth.user.email};notices.unshift(notice);return NextResponse.json({success:true,data:notice},{status:201});
  }catch{return NextResponse.json({success:false,error:'Invalid notice.'},{status:400});}
}
