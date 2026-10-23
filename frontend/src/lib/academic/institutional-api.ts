import { NextResponse } from 'next/server';
import type { TokenPayload } from '@/lib/auth/server-auth';
import { institutionalRows,institutionalDatabase,readStudents,readGrades,courseScope,callInstitutional } from './institutional';
import { extractStudentPhoto, isValidStudentPhoto } from '@/lib/students/photo';
import { dispatchNotification } from '@/lib/messaging/dispatcher';

const fail=(error:string,status=400)=>NextResponse.json({success:false,error},{status});
const resources:Record<string,string>={staff:'uams_staff_records',admissions:'uams_admission_records',schools:'schools',departments:'departments',programs:'programs',courses:'uams_course_records',events:'campus_events','courses/register':'uams_registration_records','finance/bank/record':'uams_bank_records','finance/bank/reconcile':'uams_bank_records'};
const operations:Record<string,string>={staff:'staff.create',admissions:'admission.create',schools:'school.create',departments:'department.create',programs:'program.create',courses:'course.create',events:'event.save','courses/register':'registration.create','grades/enter':'grade.submit','finance/bank/record':'bank.record','finance/invoices':'invoice.create'};
const required:Record<string,string[]>={staff:['first_name','last_name','email','role','department_id'],admissions:['applicant_name','applicant_email','applicant_phone','program_code','date_of_birth','gender','kcse_grade'],schools:['code','name'],departments:['code','name','school_id'],programs:['code','name','department_id'],courses:['code','title','department_id'],events:['title','category','starts_at','ends_at','location'],'courses/register':['course_code'],'grades/enter':['course_code'],'finance/bank/record':['student_id','bank','bank_reference']};
function validate(module:string,body:Record<string,any>,method:string):string|null {
 if(method==='POST')for(const key of required[module]||[])if(typeof body[key]!=='string'||!body[key].trim()||body[key].length>1000)return `${key} is required (maximum 1000 characters).`;
 if(method==='PATCH'&&['staff','admissions','grades/enter'].includes(module)){const key={staff:'staff_id',admissions:'application_id','grades/enter':'grade_id'}[module]!;if(typeof body[key]!=='string'||!body[key])return `${key} is required.`;}
 if(body.email!==undefined&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))return 'Valid email required.';
 if(body.applicant_email!==undefined&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.applicant_email))return 'Valid applicant email required.';
 if(module==='programs'&&(!Number.isInteger(Number(body.duration_years))||Number(body.duration_years)<1||Number(body.duration_years)>8))return 'duration_years must be 1 to 8.';
 if(module==='courses'&&(!Number.isInteger(Number(body.credit_hours))||Number(body.credit_hours)<1||Number(body.credit_hours)>24))return 'credit_hours must be 1 to 24.';
 if(module==='events'&&(!Number.isFinite(Date.parse(body.starts_at))||!Number.isFinite(Date.parse(body.ends_at))||Date.parse(body.ends_at)<=Date.parse(body.starts_at)))return 'Valid event start and end dates required.';
 if(module==='grades/enter'&&method==='POST'&&([body.cat_score,body.exam_score].some(x=>typeof x!=='number'||!Number.isFinite(x))||body.cat_score<0||body.cat_score>30||body.exam_score<0||body.exam_score>70))return 'CAT must be 0–30 and exam 0–70.';
 if(module==='finance/bank/record'&&(typeof body.amount!=='number'||!Number.isFinite(body.amount)||body.amount<=0||body.amount>1000000||Math.round(body.amount*100)!==body.amount*100))return 'Amount must be a positive number with at most two decimal places.';
 if(body.date_of_birth!==undefined&&(!Number.isFinite(Date.parse(body.date_of_birth))||Date.parse(body.date_of_birth)>Date.now()))return 'Valid birth date required.';
 return null;
}
export async function institutionalApi(request:Request,user:TokenPayload,module:string,studentSelector?:string) {
 try {
  const params=new URL(request.url).searchParams;
  if(request.method==='GET') {
   if(['exams','timetable','library','hostels','attendance','notifications','audit'].includes(module))return await baselineRead(module,user,params.get('course_code')||params.get('course'));
   if(module==='reports')return await reports(user);
   if(module==='finance/invoices') {
    const student=(await readStudents(user)).find(s=>s.id===studentSelector||s.admission_number===studentSelector);
    if(!student)return fail('Student not found.',404);
    const invoices=(await institutionalRows('uams_invoice_records')).filter(i=>i.student_id===student.id);
    return NextResponse.json({success:true,total:invoices.length,data:{student:{...student,name:student.first_name+' '+student.last_name},invoices}});
   }
   let rows:Record<string,any>[]=module==='students'?await readStudents(user):module==='grades/enter'?await readGrades(user):await institutionalRows(resources[module]);
   if(['courses','courses/register'].includes(module)){const scope=await courseScope(user);if(scope)rows=rows.filter(x=>scope.has(x.course_code||x.code));}
   if(module==='courses/register'&&user.role==='student'){const ids=new Set((await readStudents(user)).map(s=>s.id));rows=rows.filter(r=>ids.has(r.student_id));}
   if(user.role==='hod'&&['staff','admissions'].includes(module)) {
    const departments=await institutionalRows('departments');const ids=new Set(departments.filter(d=>d.hod_id===user.id).map(d=>d.id));
    if(module==='staff')rows=rows.filter(s=>ids.has(s.department_id));
    else {const programs=await institutionalRows('programs');const codes=new Set(programs.filter(p=>ids.has(p.department_id)).map(p=>p.code));rows=rows.filter(a=>codes.has(a.program_code));}
   }
   if(module==='events'&&!['admin','super_admin','registrar'].includes(user.role)) {
    const own=await readStudents(user);const departmentIds=new Set(own.map(s=>s.department_id));const programIds=new Set(own.map(s=>s.program_id));
    const departments=await institutionalRows('departments');for(const d of departments)if(d.hod_id===user.id)departmentIds.add(d.id);const schoolIds=new Set(departments.filter(d=>departmentIds.has(d.id)).map(d=>d.school_id));
    rows=rows.filter(e=>e.is_active&&(e.scope_type==='university'||(e.scope_type==='program'&&programIds.has(e.scope_id))||(e.scope_type==='department'&&departmentIds.has(e.scope_id))||(e.scope_type==='school'&&schoolIds.has(e.scope_id))));
   }
   for(const key of ['status','role','department_id','school_id','program_code','scope_type','category','course_code','student_id','level']) {const value=params.get(key);if(value)rows=rows.filter(r=>String(r[key])===value);}
   const search=params.get('search')?.toLowerCase();if(search)rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search));
   if(params.get('upcoming')==='true')rows=rows.filter(r=>r.ends_at>=new Date().toISOString());
   if(module==='finance/bank/reconcile')return NextResponse.json({success:true,data:rows,summary:{total_transactions:rows.length,reconciled_count:rows.filter(r=>r.is_reconciled).length,unreconciled_count:rows.filter(r=>!r.is_reconciled).length,total_amount:rows.reduce((s,r)=>s+Number(r.amount),0)}});
   if(module==='students'&&user.role==='finance_officer')rows=rows.map(s=>({id:s.id,admission_number:s.admission_number,first_name:s.first_name,last_name:s.last_name,email:s.email,fee_balance:s.fee_balance,status:s.status}));
   return NextResponse.json({success:true,total:rows.length,data:rows});
  }
  let body:Record<string,any>;
  try {const raw=await request.json();if(!raw||typeof raw!=='object'||Array.isArray(raw))return fail('Provide a JSON object.');body=raw;}catch{return fail('Provide valid JSON.');}
  const validation=validate(module,body,request.method);if(validation)return fail(validation);
  if(module==='notifications'&&request.method==='PATCH') {
   // A3 retry: re-dispatch a failed/queued institutional notification and
   // write the new outcome back onto its notification_logs row.
   if(body.action!=='retry'||typeof body.id!=='string'||!body.id)return fail('Provide { id, action: "retry" }.');
   const rows=await institutionalRows('notification_logs');
   const row=rows.find(r=>String(r.id)===body.id);
   if(!row)return fail('Notification not found.',404);
   if(!['failed','queued'].includes(String(row.status)))return fail(`Only failed or queued notifications can be retried (this one is ${row.status}).`,409);
   const {result}=await dispatchNotification({channel:row.channel||'sms',recipientIdentifier:row.recipient_identifier,subject:row.subject,messageContent:row.message_content});
   const patchRow:Record<string,unknown>={status:result.status,provider:result.provider,provider_message_id:result.providerMessageId||null,error_message:result.error||null};
   if(typeof result.costAmount==='number')patchRow.cost=result.costAmount;
   const {error:updateError}=await institutionalDatabase().from('notification_logs').update(patchRow).eq('id',row.id);
   if(updateError)return fail('Retry outcome could not be saved.',503);
   return NextResponse.json({success:true,data:{...row,...patchRow,dispatch_mode:result.mode},message:'Notification retry dispatched.'});
  }
  let operation=operations[module];
  if(module==='exams')operation=body.action==='schedule_exam'?'exam.schedule':'';
  if(module==='timetable')operation='timetable.create';
  if(module==='attendance')operation='attendance.record';
  if(module==='library')operation=body.action==='borrow'?'library.borrow':body.action==='return'?'library.return':'';
  if(module==='hostels')operation='hostel.allocate';
  if(module==='notifications')operation='notification.queue';
  if(request.method==='PATCH')operation={staff:'staff.update',admissions:'admission.review','grades/enter':'grade.approve',events:'event.save','courses/register':'registration.approve'}[module]||'';
  if(module==='courses/approve'){operation='registration.approve';}
  if(operation==='registration.approve') {
   if(body.registration_id)body.registration_ids=[body.registration_id];
   if(body.registration_ids!==undefined&&(!Array.isArray(body.registration_ids)||!body.registration_ids.length||body.registration_ids.length>200||body.registration_ids.some((x:unknown)=>typeof x!=='string'||!x)))return fail('Select 1 to 200 registration IDs.');
  }
  if(module==='students') {
   if(request.method==='DELETE')return fail('Institutional records are retained for audit. Use enrollment status management.',405);
   const full=body.full_name||body.name||body.fullName;
   if(full&&!body.first_name){const names=String(full).trim().split(/\s+/);body.first_name=names.shift();body.last_name=names.join(' ')||body.first_name;}
   if(!body.first_name||!body.last_name||!body.email||!body.program_id||!body.date_of_birth||!(body.admission_number||body.registration_number))return fail('Student name, email, registration number, program_id and date_of_birth are required.');
   operation='student.create';
  }
  if(module==='finance/bank/reconcile')return fail('Use Record Bank Deposit to atomically verify and allocate the authoritative payment ledger.',409);
  if(!operation)return fail('Unsupported operation.',405);
  const data:any=await callInstitutional(operation,body,user);
  if(module==='students'&&request.method==='POST') {
   const photo=extractStudentPhoto(body);
   if(photo!==undefined&&photo!==null&&!isValidStudentPhoto(photo))return fail('Profile photo must be an image (JPG/PNG/WebP) or an https photo URL.');
   if(photo&&data?.user_id) {
    // The durable photo home is users.avatar_url; the student records view exposes it as photo_url.
    const {error:photoError}=await institutionalDatabase().from('users').update({avatar_url:photo}).eq('id',data.user_id);
    if(!photoError)data.photo_url=photo;
   }
  }
  if(module==='notifications'&&request.method==='POST'&&data?.id) {
   // A3: the workflow queued the record; now actually dispatch it and write
   // the delivery outcome back onto the same notification_logs row.
   try {
    const {result}=await dispatchNotification({channel:body.channel||'sms',recipientIdentifier:body.recipient_identifier,subject:body.subject,messageContent:body.message_content});
    const patchRow:Record<string,unknown>={status:result.status,provider:result.provider,provider_message_id:result.providerMessageId||null,error_message:result.error||null};
    if(typeof result.costAmount==='number')patchRow.cost=result.costAmount;
    const {error:updateError}=await institutionalDatabase().from('notification_logs').update(patchRow).eq('id',data.id);
    if(!updateError){data.status=result.status;data.provider=result.provider;data.provider_message_id=result.providerMessageId||null;data.error_message=result.error||null;data.dispatch_mode=result.mode;}
    else data.dispatch_warning='Delivery outcome could not be written back to the log.';
    data.dispatch_mode=result.mode;
   } catch { data.dispatch_warning='Dispatch failed unexpectedly; the record stays queued for retry.'; }
  }
  return NextResponse.json({success:true,data,message:'Saved to the institutional database.'},{status:request.method==='POST'?201:200});
 }catch(error:any){const code=error?.code;return fail(code==='42501'?'Operation outside your authorized scope.':code==='23505'?'Record already exists.':code==='P0002'?'Record not found.':code?'Institutional operation rejected. Check required fields and workflow prerequisites.':'Institutional database did not acknowledge the operation. Retry using the same reference where applicable.',code==='42501'?403:code==='23505'?409:code==='P0002'?404:code?400:503);}
}
async function baselineRead(module:string,user:TokenPayload,selectedCourse?:string|null) {
 const privileged=['admin','super_admin','registrar'].includes(user.role);
 if(module==='notifications')return NextResponse.json({success:true,data:await institutionalRows('notification_logs')});
 if(module==='audit') {
  const rows=await institutionalRows('uams_operation_audit');
  const {data:actors,error}=await institutionalDatabase().from('users').select('id,email,roles(code)');if(error||!actors)throw new Error('Audit identity lookup unavailable.');
  return NextResponse.json({success:true,data:rows.sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,200).map(r=>{const actor=actors.find(u=>u.id===r.actor_id);const role=actor?.roles as unknown as {code:string}|undefined;return {id:r.id,timestamp:r.created_at,actor_email:actor?.email||r.actor_id,actor_role:role?.code||'',action:r.operation,entity_type:r.operation.split('.')[0],entity_id:r.entity_id,ip_address:'Unavailable',status:'SUCCESS',details:r.details};})});
 }
 const students=await readStudents(user),ids=new Set(students.map(s=>s.id));
 const scope=await courseScope(user);
 const registrations=await institutionalRows('uams_registration_records');
 const ownCourses=new Set(registrations.filter(r=>ids.has(r.student_id)&&r.status==='approved').map(r=>r.course_code));
 const allowed=(code:string)=>user.role==='student'?ownCourses.has(code):!scope||scope.has(code);
 if(module==='timetable')return NextResponse.json({success:true,data:(await institutionalRows('uams_timetable_records')).filter(r=>allowed(r.courseCode))});
 if(module==='library')return NextResponse.json({success:true,data:{books:await institutionalRows('library_books'),loans:(await institutionalRows('uams_library_loan_records')).filter(l=>privileged||ids.has(l.student_id))}});
 if(module==='hostels')return NextResponse.json({success:true,data:{blocks:await institutionalRows('hostel_blocks'),rooms:await institutionalRows('hostel_rooms'),allocations:(await institutionalRows('uams_hostel_records')).filter(a=>privileged||ids.has(a.student_id))}});
 if(module==='attendance') {
  const rosterIds=new Set(registrations.filter(r=>r.status==='approved'&&r.course_code===selectedCourse&&allowed(r.course_code)).map(r=>r.student_id));
  const records=await institutionalRows('attendance_records');
  const sessions=(await institutionalRows('uams_attendance_records')).filter(s=>allowed(s.course)&&(user.role!=='student'||records.some(r=>r.session_id===s.id&&ids.has(r.student_id))));
  return NextResponse.json({success:true,data:{sessions:sessions.map(s=>({...s,percentage:s.total?(s.present/s.total*100).toFixed(1)+'%':'0%'})),roster:students.filter(s=>user.role==='student'||rosterIds.has(s.id)).map(s=>({id:s.id,adm:s.admission_number,name:s.first_name+' '+s.last_name,status:'present'}))}});
 }
 const schedules=(await institutionalRows('uams_exam_records')).filter(e=>allowed(e.course_code));
 const cards=user.role==='lecturer'?[]:(await institutionalRows('exam_clearance_cards')).filter(c=>ids.has(c.student_id)).map(c=>{const student=students.find(s=>s.id===c.student_id)!;return {...c,student_name:student.first_name+' '+student.last_name,admission_number:student.admission_number,program_name:student.program_name,fee_paid_percentage:c.clearance_percentage};});
 return NextResponse.json({success:true,data:{schedules:schedules.map(e=>({...e,course_title:e.title,exam_date:e.starts_at.slice(0,10),start_time:e.starts_at.slice(11,16),end_time:e.ends_at.slice(11,16)})),cards}});
}
async function reports(user:TokenPayload) {
 const students=await readStudents(user),ids=new Set(students.map(s=>s.id)),scope=await courseScope(user);
 if(user.role==='finance_officer') {
  const invoices=(await institutionalRows('uams_invoice_records')).filter(i=>ids.has(i.student_id));
  return NextResponse.json({success:true,data:{overview:{total_students:students.length,active_students:students.filter(s=>s.status==='active').length,avg_cgpa:0,total_outstanding_students:students.filter(s=>Number(s.fee_balance)>0).length},studentsByProgram:[],registrationsByCourse:[],financeTotals:{invoiced:invoices.reduce((s,i)=>s+Number(i.total_amount),0),collected:invoices.reduce((s,i)=>s+Number(i.amount_paid),0),outstanding:invoices.reduce((s,i)=>s+Number(i.balance),0),invoices_issued:invoices.length,settled_invoices:invoices.filter(i=>i.status==='settled').length,partial_invoices:invoices.filter(i=>i.status==='partial').length},gradeDistribution:[],catalogTotals:{courses:0,active_courses:0,total_capacity:0,total_enrolled:0},admissionsTotals:{total_applications:0,submitted:0,under_review:0,shortlisted:0,admitted:0,rejected:0},generated_at:new Date().toISOString(),finance_only:true}});
 }
 const registrations=(await institutionalRows('uams_registration_records')).filter(r=>!scope||scope.has(r.course_code));
 const grades=await readGrades(user);const invoices=(await institutionalRows('uams_invoice_records')).filter(r=>ids.has(r.student_id));
 const courses=(await institutionalRows('uams_course_records')).filter(c=>!scope||scope.has(c.code));
 const admissions=user.role==='hod'?[]:await institutionalRows('uams_admission_records');
 return NextResponse.json({success:true,data:{overview:{total_students:students.length,active_students:students.filter(s=>s.status==='active').length,avg_cgpa:Number((students.reduce((sum,s)=>sum+Number(s.cgpa),0)/(students.length||1)).toFixed(2)),total_outstanding_students:students.filter(s=>s.fee_balance>0).length},studentsByProgram:[...new Set(students.map(s=>s.program_name))].map(program=>({program,total:students.filter(s=>s.program_name===program).length,active:students.filter(s=>s.program_name===program&&s.status==='active').length,years:[...new Set(students.filter(s=>s.program_name===program).map(s=>s.current_year_of_study))]})),registrationsByCourse:[...new Set(registrations.map(r=>r.course_code))].map(code=>({course_code:code,course_title:registrations.find(r=>r.course_code===code)?.course_title,total_registrations:registrations.filter(r=>r.course_code===code).length,pending:registrations.filter(r=>r.course_code===code&&r.status==='pending').length,approved:registrations.filter(r=>r.course_code===code&&r.status==='approved').length})),financeTotals:{invoiced:invoices.reduce((s,i)=>s+Number(i.total_amount),0),collected:invoices.reduce((s,i)=>s+Number(i.amount_paid),0),outstanding:invoices.reduce((s,i)=>s+Number(i.balance),0),invoices_issued:invoices.length,settled_invoices:invoices.filter(i=>i.status==='settled').length,partial_invoices:invoices.filter(i=>i.status==='partial').length},gradeDistribution:[...new Set(grades.filter(g=>g.is_approved).map(g=>g.letter_grade))].map(letter=>({letter,count:grades.filter(g=>g.is_approved&&g.letter_grade===letter).length})),catalogTotals:{courses:courses.length,active_courses:courses.filter(c=>c.is_active).length,total_capacity:courses.reduce((s,c)=>s+c.capacity,0),total_enrolled:courses.reduce((s,c)=>s+c.enrolled,0)},admissionsTotals:Object.fromEntries(['submitted','under_review','shortlisted','admitted','rejected'].map(status=>[status,admissions.filter(a=>a.status===status).length]).concat([['total_applications',admissions.length]])),generated_at:new Date().toISOString()}});
}
