import type { TokenPayload } from './server-auth';
import { createClient } from '@supabase/supabase-js';

export function isDemoUser(user: TokenPayload) { return user.id.startsWith('usr-'); }
export async function studentIdentity(user: TokenPayload) {
  if (isDemoUser(user) && user.role === 'student' && user.email === 'student@university.ac.ke') return { studentId:'stu-1', admissionNumber:'BIT/2023/8849', name:'Faith Wanjiku' };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error} = await client.from('students').select('id,admission_number').eq('user_id',user.id).maybeSingle();
  return error || !data ? null : { studentId:data.id, admissionNumber:data.admission_number, name:user.email };
}

// Demonstration teaching allocations. Production modules must query course_allocations and departments.
export function canTeachCourse(user: TokenPayload, code: string) {
  return user.role !== 'lecturer' || (isDemoUser(user) && ['BCS 311','BCS 316'].includes(code));
}
export function inDepartment(user: TokenPayload, admission: string) {
  return user.role !== 'hod' || (isDemoUser(user) && admission.startsWith('BCS/'));
}
export function canReviewCourse(user: TokenPayload, code: string) {
  return user.role !== 'hod' || (isDemoUser(user) && code.startsWith('BCS'));
}
