import { createClient } from '@supabase/supabase-js';
import type { TokenPayload } from '@/lib/auth/server-auth';
import type { UamsGrade } from './grades';

export function institutionalDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('your-') || key.includes('your-')) throw new Error('Institutional database is not configured.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(15000)})}});
}
export type InstitutionalStudent = { id:string;user_id:string;admission_number:string;first_name:string;last_name:string;email:string;gender:string;program_id:string;program_name:string;department_id:string;department:string;faculty:string;campus_code:string;current_year_of_study:number;current_semester_number:number;status:string;admission_date:string;cgpa:number;fee_balance:number;updated_at:string };
export async function institutionalRows<T = Record<string, any>>(resource:string):Promise<T[]> {
  const db=institutionalDatabase(); const rows:T[]=[];
  for(let start=0;;start+=500) {
    let query=db.from(resource).select('*');
    if(resource==='program_courses')query=query.order('program_id',{ascending:true}).order('course_id',{ascending:true});
    else query=query.order('id',{ascending:true});
    const {data,error}=await query.range(start,start+499);
    if(error||!data)throw new Error(`Institutional ${resource} read failed.`);
    rows.push(...data as T[]); if(data.length<500) return rows;
    if(start>=99500)throw new Error('Institutional export exceeds supported size.');
  }
}
export async function courseScope(user:TokenPayload):Promise<Set<string>|null> {
  if(!['hod','lecturer'].includes(user.role))return null;
  const {data,error}=await institutionalDatabase().rpc('uams_course_scope',{p_user_id:user.id,p_role:user.role});
  if(error||!data)throw new Error('Academic allocation lookup failed.');
  return new Set((data as {code:string}[]).map(x=>x.code));
}
export async function readStudents(user?:TokenPayload):Promise<InstitutionalStudent[]> {
  const rows=await institutionalRows<InstitutionalStudent>('uams_student_records');
  if(user?.role==='student')return rows.filter(s=>s.user_id===user.id);
  if(user?.role==='hod') {const departments=await institutionalRows('departments');const ids=new Set(departments.filter(d=>d.hod_id===user.id).map(d=>d.id));return rows.filter(s=>ids.has(s.department_id));}
  if(user?.role==='lecturer'){const scope=await courseScope(user);const registrations=await institutionalRows('uams_registration_records');const ids=new Set(registrations.filter(r=>scope?.has(r.course_code)&&r.status==='approved').map(r=>r.student_id));return rows.filter(s=>ids.has(s.id));}
  return rows;
}
export async function readGrades(user?:TokenPayload):Promise<(UamsGrade & {semester_id:string;academic_year:string;semester_label:string;updated_at:string;student_email:string})[]> {
  let rows=await institutionalRows<UamsGrade & {semester_id:string;academic_year:string;semester_label:string;updated_at:string;student_email:string}>('uams_grade_records');
  if(user?.role==='student'){const ids=new Set((await readStudents(user)).map(s=>s.id));rows=rows.filter(g=>ids.has(g.student_id)&&g.is_approved);}
  if(user){const scope=await courseScope(user);if(scope)rows=rows.filter(g=>scope.has(g.course_code));}
  return rows;
}
export async function callInstitutional(operation:string,payload:Record<string,unknown>,user:TokenPayload) {
  const {data,error}=await institutionalDatabase().rpc('uams_workflow',{p_operation:operation,p_payload:payload,p_actor_id:user.id,p_actor_role:user.role});
  if(error)throw Object.assign(new Error(error.message||'Institutional operation failed.'),{code:error.code});
  return data;
}
