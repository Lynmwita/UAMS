import {NextResponse} from 'next/server';
import {requireServerAuth} from '@/lib/auth/server-auth';
import {readStudents,readGrades,institutionalRows,callInstitutional} from '@/lib/academic/institutional';
import {studentsStore} from '@/lib/academic/student-records';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const auth=await requireServerAuth(request,['student','registrar','hod','admin','super_admin']);if('errorResponse'in auth)return auth.errorResponse;
 const {id}=await context.params;
 try{
  if(auth.user.id.startsWith('usr-')){const own=studentsStore.find(s=>(s.id===id||s.admission_number===id)&&(auth.user.role!=='student'||s.user_id===auth.user.id));return NextResponse.json({success:!!own,data:own||null},{status:own?200:404});}
  const student=(await readStudents(auth.user)).find(s=>s.id===id||s.admission_number===id);if(!student)return NextResponse.json({success:false,error:'Student not found.'},{status:404});
  const [grades,registrations,invoices]=await Promise.all([readGrades(auth.user),institutionalRows('uams_registration_records'),institutionalRows('uams_invoice_records')]);
  return NextResponse.json({success:true,data:{...student,grades:grades.filter(g=>g.student_id===student.id),registrations:registrations.filter(r=>r.student_id===student.id),invoices:invoices.filter(i=>i.student_id===student.id)}});
 }catch{return NextResponse.json({success:false,error:'Institutional student record unavailable.'},{status:503});}
}
export async function PUT(request:Request,context:{params:Promise<{id:string}>}){
 const auth=await requireServerAuth(request,['registrar','admin','super_admin']);if('errorResponse'in auth)return auth.errorResponse;
 if(auth.user.id.startsWith('usr-'))return NextResponse.json({success:false,error:'Profile updates require an institutional account.'},{status:503});
 try{const {id}=await context.params;const body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({success:false,error:'Provide a student update object.'},{status:400});const data=await callInstitutional('student.update',{...body,student_id:id},auth.user);return NextResponse.json({success:true,data});}catch(error:any){return NextResponse.json({success:false,error:'Student update rejected. Check enrollment status and required profile fields.'},{status:error?.code==='P0002'?404:400});}
}
