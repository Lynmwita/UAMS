import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
let db:PGlite;
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function workflow(operation:string,payload:Record<string,unknown>,actor=1,role='admin') {
 const result=await db.query<{result:any}>('select public.uams_workflow($1,$2::jsonb,$3::uuid,$4) result',[operation,JSON.stringify(payload),id(actor),role]);return result.rows[0].result;
}
before(async()=>{
 db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 const root=new URL('../../../../',import.meta.url);
 const base=(await readFile(new URL('database/01_schema_init.sql',root),'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS[^;]+;/g,'');await db.exec(base);
 await db.exec((await readFile(new URL('database/04_extended_modules.sql',root),'utf8')).split('-- ROW LEVEL SECURITY')[0]);
 await db.exec(await readFile(new URL('supabase/migrations/20261021214423_institutional_workflows.sql',root),'utf8'));
 await db.exec(`insert into roles(id,code,name) values('${id(11)}','admin','Admin'),('${id(12)}','student','Student'),('${id(13)}','hod','HOD'),('${id(14)}','lecturer','Lecturer');
 insert into users(id,email,role_id,first_name,last_name) values('${id(1)}','admin@example.test','${id(11)}','Admin','One'),('${id(2)}','student@example.test','${id(12)}','Student','One'),('${id(3)}','hod@example.test','${id(13)}','HOD','One');
 insert into schools(id,code,name) values('${id(20)}','SCI','Science');
 insert into departments(id,school_id,code,name,hod_id) values('${id(21)}','${id(20)}','CS','Computing','${id(3)}'),('${id(22)}','${id(20)}','BIO','Biology',null);
 insert into programs(id,department_id,code,name) values('${id(23)}','${id(21)}','BCS','Computer Science');
 insert into academic_years(id,code,name,start_date,end_date) values('${id(24)}','2026/2027','2026/2027','2026-01-01','2027-12-31');
 insert into semesters(id,academic_year_id,semester_number,name,start_date,end_date,is_current) values('${id(25)}','${id(24)}',1,'Semester 1','2026-01-01','2027-12-31',true);
 insert into students(id,user_id,admission_number,date_of_birth,program_id,admission_date) values('${id(30)}','${id(2)}','BCS/2026/1','2005-01-01','${id(23)}','2026-01-01');
 insert into courses(id,department_id,code,title) values('${id(31)}','${id(21)}','CS101','Programming'),('${id(32)}','${id(22)}','BIO101','Biology');
 insert into course_registrations(id,student_id,course_id,semester_id,academic_year_id,status) values('${id(33)}','${id(30)}','${id(31)}','${id(25)}','${id(24)}','pending'),('${id(34)}','${id(30)}','${id(32)}','${id(25)}','${id(24)}','pending');
 insert into student_invoices(id,student_id,semester_id,invoice_number,total_billed,due_date) values('${id(40)}','${id(30)}','${id(25)}','INV-1',100,'2026-12-31'),('${id(41)}','${id(30)}','${id(25)}','INV-2',100,'2026-12-31');
 insert into library_books(id,isbn,title,author,category,total_copies,available_copies) values('${id(50)}','TEST-ISBN','Algorithms','Author','Computing',1,1);
 insert into hostel_blocks(id,code,name,gender_designation,total_capacity) values('${id(60)}','A','A','mixed',1);
 insert into hostel_rooms(id,block_id,room_number,floor_number,capacity) values('${id(61)}','${id(60)}','A1',1,1);`);
});
after(async()=>{await db?.close();});
test('institutional service functions and views are inaccessible to browser roles',async()=>{
 const result=await db.query<{allowed:boolean}>("select has_function_privilege('authenticated','public.uams_workflow(text,jsonb,uuid,text)','execute') allowed");assert.equal(result.rows[0].allowed,false);
 const read=await db.query<{allowed:boolean}>("select has_table_privilege('anon','public.uams_student_records','select') allowed");assert.equal(read.rows[0].allowed,false);
 await assert.rejects(()=>workflow('school.create',{code:'X',name:'X'},2,'admin'),/Actor is inactive or role does not match/);
});
test('HOD selection is checked completely before atomic registration approval',async()=>{
 await assert.rejects(()=>workflow('registration.approve',{registration_ids:[id(33),id(34)]},3,'hod'),/outside department/);
 assert.equal((await db.query<{status:string}>('select status from course_registrations where id=$1',[id(33)])).rows[0].status,'pending');
 const result=await workflow('registration.approve',{registration_ids:[id(33)]},3,'hod');assert.equal(result.approved_count,1);
});
test('deposit allocates across invoices and replay does not credit twice',async()=>{
 const payload={student_id:id(30),bank:'Test Bank',bank_reference:' REPLAY-1 ',amount:150};
 const first=await workflow('bank.record',payload);assert.equal(Number(first.unallocated_credit),0);
 await workflow('bank.record',{...payload,bank_reference:'replay-1'});
 const sums=await db.query<{paid:string;count:number}>('select sum(amount_paid)::text paid,(select count(*)::integer from transactions) count from student_invoices');
 assert.equal(Number(sums.rows[0].paid),150);assert.equal(sums.rows[0].count,1);
 assert.equal((await db.query('select * from uams_payment_allocations')).rows.length,2);
 await assert.rejects(()=>workflow('bank.record',{...payload,amount:151}),/Reference already used/);
});
test('admission approval atomically creates the student and remains idempotent',async()=>{
 const application=await workflow('admission.create',{applicant_name:'New Student',applicant_email:'new@example.test',applicant_phone:'0712345678',gender:'female',date_of_birth:'2005-01-01',program_code:'BCS',intake:'September',intake_year:2026,kcse_grade:'A',kcse_points:80});
 const approved=await workflow('admission.review',{application_id:application.id,status:'admitted'});
 assert.ok(approved.student_id);assert.ok(approved.admission_number);
 const replay=await workflow('admission.review',{application_id:application.id,status:'admitted'});assert.equal(replay.student_id,approved.student_id);
 await assert.rejects(()=>workflow('admission.review',{application_id:application.id,status:'rejected'}),/cannot be reversed/);
});
test('grade publication uses authoritative course credit and semester metadata',async()=>{
 const grade=await workflow('grade.submit',{student_id:id(30),course_code:'CS101',cat_score:25,exam_score:50});
 assert.equal(grade.total_score,75);assert.equal(grade.semester_label,'Semester 1');assert.equal(grade.academic_year,'2026/2027');assert.equal(grade.is_approved,false);
 const approved=await workflow('grade.approve',{grade_id:grade.id},3,'hod');assert.equal(approved.is_approved,true);
 await assert.rejects(()=>workflow('grade.submit',{student_id:id(30),course_code:'BIO101',cat_score:25,exam_score:50}),/Approved registration required/);
});
test('library return is idempotent and capacity is preserved',async()=>{
 const loan=await workflow('library.borrow',{book_id:id(50)},2,'student');
 await assert.rejects(()=>workflow('library.borrow',{book_id:id(50)},2,'student'),/No copies available/);
 await workflow('library.return',{loan_id:loan.id},2,'student');await workflow('library.return',{loan_id:loan.id},2,'student');
 assert.equal((await db.query<{available_copies:number}>('select available_copies from library_books')).rows[0].available_copies,1);
});
test('hostel allocation enforces real bed capacity and student ownership',async()=>{
 await workflow('hostel.allocate',{room_id:id(61),bed_number:1},2,'student');
 await assert.rejects(()=>workflow('hostel.allocate',{room_id:id(61),bed_number:1},2,'student'),/Room unavailable/);
 assert.equal((await db.query<{occupied_beds:number}>('select occupied_beds from hostel_rooms')).rows[0].occupied_beds,1);
});
test('overpayment credit is retained and consumed by the next invoice',async()=>{
 await workflow('bank.record',{student_id:id(30),bank:'Test Bank',bank_reference:'CREDIT-2',amount:150});
 const credit=await db.query<{unallocated_credit:string}>("select unallocated_credit from transactions where unallocated_credit>0");assert.equal(Number(credit.rows[0].unallocated_credit),100);
 const invoice=await workflow('invoice.create',{student_id:id(30),total_amount:80,due_date:'2026-12-31'});assert.equal(invoice.amount_paid,80);assert.equal(invoice.balance,0);
 const remaining=await db.query<{credit:string}>('select sum(unallocated_credit)::text credit from transactions');assert.equal(Number(remaining.rows[0].credit),20);
});
test('M-Pesa settlement commits once with receipt and credit in the same ledger',async()=>{
 await db.query('insert into uams_stk_requests("checkoutRequestId","merchantRequestId","userId","accountReference","phoneNumber",amount,"createdAt") values($1,$2,$3,$4,$5,$6,$7)',['CHECKOUT-TEST','MERCHANT-TEST',id(2),'BCS/2026/1','254712345678',50,Date.now()]);
 await db.query("select uams_settle_stk('CHECKOUT-TEST','RECEIPT12345')");await db.query("select uams_settle_stk('CHECKOUT-TEST','RECEIPT12345')");
 assert.equal((await db.query('select * from mpesa_transactions')).rows.length,1);
 const payment=await db.query<{status:string}>("select status from uams_stk_requests where \"checkoutRequestId\"='CHECKOUT-TEST'");assert.equal(payment.rows[0].status,'settled');
 await assert.rejects(()=>db.query("select uams_settle_stk('CHECKOUT-TEST','DIFFERENT123')"),/Receipt mismatch/);
});
test('separate attendance session and batch mark use approved registrations',async()=>{
 const session=await workflow('attendance.session',{course_code:'CS101',session_date:'2026-10-22',start_time:'09:00',end_time:'10:00',topic:'Types'});
 await workflow('attendance.mark',{session_id:session.id,roster:[{student_id:id(30),status:'present'}]});
 await workflow('attendance.mark',{session_id:session.id,roster:[{student_id:id(30),status:'absent'}]});
 const rows=await db.query<{status:string}>('select status from attendance_records where session_id=$1',[session.id]);assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].status,'absent');
 await assert.rejects(()=>workflow('attendance.mark',{session_id:session.id,roster:[{student_id:id(30),status:'invalid'}]}),/Roster contains/);
});
