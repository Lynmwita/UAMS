-- Requires the normalized core schema in database/01_schema_init.sql.
alter table public.users add column if not exists auth_user_id uuid unique;
alter table public.students add column if not exists campus_code text not null default 'SMU-MAIN';
alter table public.staff add column if not exists qualification text not null default '';
alter table public.programs add column if not exists credit_limit integer not null default 48;
alter table public.courses add column if not exists capacity integer not null default 60;
alter table public.transactions add column if not exists unallocated_credit numeric(12,2) not null default 0 check(unallocated_credit>=0);
alter table public.exam_schedules add column if not exists updated_at timestamptz not null default now();
alter table public.semesters add column if not exists updated_at timestamptz not null default now();
alter table public.academic_years add column if not exists updated_at timestamptz not null default now();
alter table public.timetables add column if not exists updated_at timestamptz not null default now();
create or replace function public.uams_touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end;$$;
do $$declare t text;begin
 foreach t in array array['students','student_grades','exam_schedules','semesters','academic_years','timetables'] loop
 execute format('drop trigger if exists uams_touch_updated_at on public.%I',t);
 execute format('create trigger uams_touch_updated_at before update on public.%I for each row execute function public.uams_touch_updated_at()',t);
 end loop;
end;$$;
create table if not exists public.admission_applications (
 id uuid primary key default gen_random_uuid(), reference_number text not null unique,
 applicant_name text not null, applicant_email text not null, applicant_phone text not null,
 gender text not null check(gender in ('male','female','other')), date_of_birth date not null,
 program_id uuid not null references public.programs(id), intake text not null,
 intake_year integer not null check(intake_year between 2000 and 2200), kcse_grade text not null,
 kcse_points numeric not null check(kcse_points between 0 and 84), previous_institution text,
 status text not null default 'submitted' check(status in ('submitted','under_review','shortlisted','admitted','rejected')),
 reviewed_by uuid references public.users(id), reviewed_at timestamptz, admission_number text unique,
 student_id uuid references public.students(id), submitted_at timestamptz not null default now()
);
create table if not exists public.campus_events (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 200),
 description text not null default '',category text not null check(category in ('academic','sports','cultural','orientation','exam','holiday','meeting','other')),
 starts_at timestamptz not null,ends_at timestamptz not null,location text not null,
 scope_type text not null check(scope_type in ('university','school','department','program')),scope_id uuid,scope_name text,
 created_by text not null,created_by_role text not null,is_active boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(ends_at>starts_at),check((scope_type='university')=(scope_id is null))
);
create table if not exists public.uams_payment_allocations (
 transaction_id uuid not null references public.transactions(id),invoice_id uuid not null references public.student_invoices(id),
 amount numeric(12,2) not null check(amount>0),primary key(transaction_id,invoice_id)
);
create table if not exists public.uams_operation_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null,operation text not null,
 entity_id text,details jsonb not null default '{}',created_at timestamptz not null default now()
);
create or replace view public.uams_student_records with(security_invoker=true) as
 select s.id,s.user_id,s.admission_number,u.first_name,u.last_name,u.email,s.gender,s.program_id,p.name program_name,
 p.department_id,d.name department,sc.name faculty,s.campus_code,s.current_year_of_study,s.current_semester_number,
 s.status,s.admission_date,s.updated_at,
 coalesce((select sum(g.grade_point*c.credit_hours)/nullif(sum(c.credit_hours),0) from public.student_grades g join public.courses c on c.id=g.course_id where g.student_id=s.id and g.is_approved),0)::numeric cgpa,
 (coalesce((select sum(i.balance) from public.student_invoices i where i.student_id=s.id),0)-coalesce((select sum(t.unallocated_credit) from public.transactions t where t.student_id=s.id and t.status='verified'),0))::numeric fee_balance
 from public.students s join public.users u on u.id=s.user_id join public.programs p on p.id=s.program_id
 join public.departments d on d.id=p.department_id join public.schools sc on sc.id=d.school_id;
create or replace view public.uams_grade_records with(security_invoker=true) as
 select g.id,g.student_id,u.first_name||' '||u.last_name student_name,s.admission_number,u.email student_email,
 c.code course_code,c.title course_title,c.credit_hours,g.cat_score,g.exam_score,g.total_score,g.letter_grade,g.grade_point,
 g.is_submitted,g.is_approved,g.semester_id,se.name semester_label,ay.code academic_year,g.updated_at
 from public.student_grades g join public.students s on s.id=g.student_id join public.users u on u.id=s.user_id
 join public.courses c on c.id=g.course_id join public.semesters se on se.id=g.semester_id
 join public.academic_years ay on ay.id=se.academic_year_id;
create or replace view public.uams_course_records with(security_invoker=true) as
 select c.*,d.name department,
 coalesce((select jsonb_agg(pc.code) from public.course_prerequisites cp join public.courses pc on pc.id=cp.prerequisite_course_id where cp.course_id=c.id),'[]') prerequisites,
 coalesce((select string_agg(distinct u.first_name||' '||u.last_name,', ') from public.course_allocations a join public.lecturers l on l.id=a.lecturer_id join public.staff st on st.id=l.staff_id join public.users u on u.id=st.user_id where a.course_id=c.id),'Unassigned') lecturer,
 (select count(*) from public.course_registrations r join public.semesters se on se.id=r.semester_id where r.course_id=c.id and se.is_current and r.status in ('pending','registered','approved'))::integer enrolled
 from public.courses c join public.departments d on d.id=c.department_id;
create or replace view public.uams_registration_records with(security_invoker=true) as
 select r.id,r.student_id,s.admission_number,u.first_name||' '||u.last_name student_name,c.code course_code,c.title course_title,
 r.status,r.registration_date registered_at,au.email approved_by,r.approved_at,r.semester_id
 from public.course_registrations r join public.students s on s.id=r.student_id join public.users u on u.id=s.user_id
 join public.courses c on c.id=r.course_id left join public.users au on au.id=r.approved_by;
create or replace view public.uams_admission_records with(security_invoker=true) as
 select a.*,p.code program_code,p.name program_name from public.admission_applications a join public.programs p on p.id=a.program_id;
create or replace view public.uams_staff_records with(security_invoker=true) as
 select st.id,st.staff_number,u.first_name,u.last_name,u.email,u.phone_number phone,r.code role,st.department_id,
 d.name department_name,d.school_id,st.designation job_title,st.qualification,u.is_active,st.date_of_joining joined_date
 from public.staff st join public.users u on u.id=st.user_id join public.roles r on r.id=u.role_id left join public.departments d on d.id=st.department_id;
create or replace view public.uams_invoice_records with(security_invoker=true) as
 select i.id,i.invoice_number,i.student_id,s.admission_number,u.first_name||' '||u.last_name student_name,
 se.name semester_label,ay.code academic_year,i.total_billed total_amount,i.amount_paid,i.balance,
 case when i.balance=0 then 'settled' when i.amount_paid>0 then 'partial' else 'outstanding' end status,
 i.created_at issued_at,jsonb_build_array(jsonb_build_object('description','Semester fees','amount',i.total_billed,'type','tuition','due_date',i.due_date)) items
 from public.student_invoices i join public.students s on s.id=i.student_id join public.users u on u.id=s.user_id
 join public.semesters se on se.id=i.semester_id join public.academic_years ay on ay.id=se.academic_year_id;
create or replace view public.uams_bank_records with(security_invoker=true) as
 select t.id,t.reference_number receipt_number,t.student_id,s.admission_number,u.first_name||' '||u.last_name student_name,
 t.amount,t.unallocated_credit,b.bank_name bank,b.slip_reference_number bank_reference,b.deposit_date deposited_at,ru.email recorded_by,
 t.reference_number reference,b.bank_name,b.account_number,t.transaction_date,t.status='verified' is_reconciled,
 s.admission_number student_admission_number,t.verified_at reconciled_at,t.notes
 from public.transactions t join public.bank_transactions b on b.transaction_id=t.id join public.students s on s.id=t.student_id
 join public.users u on u.id=s.user_id left join public.users ru on ru.id=t.verified_by;
create or replace view public.uams_exam_records with(security_invoker=true) as
 select e.id,c.code course_code,c.title title,c.title description,
 (e.exam_date+e.start_time) at time zone 'Africa/Nairobi' starts_at,
 (e.exam_date+e.end_time) at time zone 'Africa/Nairobi' ends_at,e.venue,e.status,e.updated_at
 from public.exam_schedules e join public.courses c on c.id=e.course_id;

create or replace function public.uams_course_scope(p_user_id uuid,p_role text)
returns table(code text) language sql stable security invoker set search_path='' as $$
 select c.code::text from public.courses c where
 (p_role='hod' and exists(select 1 from public.departments d where d.id=c.department_id and d.hod_id=p_user_id)) or
 (p_role='lecturer' and exists(select 1 from public.course_allocations a join public.semesters se on se.id=a.semester_id
 join public.lecturers l on l.id=a.lecturer_id join public.staff st on st.id=l.staff_id
 where a.course_id=c.id and st.user_id=p_user_id and se.is_current));
$$;

create or replace view public.uams_timetable_records with(security_invoker=true) as
 select t.id,t.day_of_week "day",t.start_time||' - '||t.end_time "time",t.start_time,t.end_time,c.code "courseCode",c.title "courseTitle",t.room_or_hall room,
 u.first_name||' '||u.last_name lecturer,t.semester_id,t.updated_at
 from public.timetables t join public.courses c on c.id=t.course_id left join public.lecturers l on l.id=t.lecturer_id
 left join public.staff st on st.id=l.staff_id left join public.users u on u.id=st.user_id;
create or replace view public.uams_library_loan_records with(security_invoker=true) as
 select l.*,b.title book_title,u.first_name||' '||u.last_name student_name,s.admission_number,
 coalesce((select sum(f.amount) from public.library_fines f where f.loan_id=l.id and not f.is_paid),0) fine_amount
 from public.library_loans l join public.library_books b on b.id=l.book_id join public.students s on s.id=l.student_id join public.users u on u.id=s.user_id;
create or replace view public.uams_hostel_records with(security_invoker=true) as
 select a.*,s.admission_number,u.first_name||' '||u.last_name student_name,b.name block_name,r.room_number
 from public.hostel_allocations a join public.students s on s.id=a.student_id join public.users u on u.id=s.user_id
 join public.hostel_rooms r on r.id=a.room_id join public.hostel_blocks b on b.id=r.block_id;
create or replace view public.uams_attendance_records with(security_invoker=true) as
 select a.id,a.session_date date,c.code course,c.title "courseTitle",a.topic,u.first_name||' '||u.last_name lecturer,
 (select count(*) from public.attendance_records r where r.session_id=a.id and r.status in ('present','late')) present,
 (select count(*) from public.attendance_records r where r.session_id=a.id) total,a.semester_id
 from public.attendance_sessions a join public.courses c on c.id=a.course_id left join public.lecturers l on l.id=a.lecturer_id
 left join public.staff st on st.id=l.staff_id left join public.users u on u.id=st.user_id;

create or replace function public.uams_workflow(p_operation text,p_payload jsonb,p_actor_id uuid,p_actor_role text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_user uuid; v_program uuid; v_semester uuid; v_year uuid; v_course uuid; v_student uuid;
 v_result jsonb; v_record record; v_invoice record; v_remaining numeric; v_amount numeric; v_applied numeric;
 v_reference text; v_number text; v_ids uuid[]; v_count integer; v_scope text[];
begin
 -- Server supplies the authenticated actor; browser roles have no EXECUTE privilege.
 if not exists(select 1 from public.users u join public.roles r on r.id=u.role_id where u.id=p_actor_id and u.is_active and r.code=p_actor_role) then raise exception 'Actor is inactive or role does not match' using errcode='42501';end if;
 select id,academic_year_id into v_semester,v_year from public.semesters where is_current order by start_date desc limit 1;
 if p_operation in ('department.create','program.create','school.create','course.create','student.create','admission.create','admission.review','registration.approve','grade.approve','event.save') and p_actor_role not in ('super_admin','admin','registrar','hod') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if p_operation in ('department.create','program.create','school.create','course.create','student.create','admission.create','admission.review','invoice.create') and p_actor_role='hod' then raise exception 'Operation forbidden' using errcode='42501';end if;
 if p_operation='school.create' then
 insert into public.schools(code,name) values(upper(trim(p_payload->>'code')),trim(p_payload->>'name')) returning id into v_id;
 elsif p_operation='department.create' then
 insert into public.departments(code,name,school_id,hod_id) values(upper(trim(p_payload->>'code')),trim(p_payload->>'name'),(p_payload->>'school_id')::uuid,nullif(p_payload->>'hod_id','')::uuid) returning id into v_id;
 elsif p_operation='program.create' then
 insert into public.programs(code,name,department_id,duration_years,credit_limit,level) values(upper(trim(p_payload->>'code')),trim(p_payload->>'name'),(p_payload->>'department_id')::uuid,(p_payload->>'duration_years')::integer,coalesce((p_payload->>'credit_limit')::integer,48),coalesce(p_payload->>'level','undergraduate')) returning id into v_id;
 elsif p_operation='course.create' then
 insert into public.courses(code,title,department_id,credit_hours,level,capacity) values(upper(trim(p_payload->>'code')),trim(p_payload->>'title'),(p_payload->>'department_id')::uuid,(p_payload->>'credit_hours')::integer,coalesce((p_payload->>'level')::integer,100),coalesce((p_payload->>'capacity')::integer,60)) returning id into v_id;
 elsif p_operation='staff.create' then
 if p_actor_role not in ('admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 select id into v_id from public.roles where code=p_payload->>'role';if v_id is null then raise exception 'Unknown role';end if;
 v_user:=coalesce(nullif(p_payload->>'user_id','')::uuid,gen_random_uuid());
 insert into public.users(id,email,role_id,first_name,last_name,phone_number) values(v_user,lower(trim(p_payload->>'email')),v_id,trim(p_payload->>'first_name'),trim(p_payload->>'last_name'),p_payload->>'phone');
 insert into public.staff(user_id,staff_number,department_id,designation,date_of_joining,qualification)
 values(v_user,'STAFF-'||replace(gen_random_uuid()::text,'-',''),(p_payload->>'department_id')::uuid,coalesce(p_payload->>'job_title',p_payload->>'role'),current_date,coalesce(p_payload->>'qualification','')) returning id into v_id;
 if p_payload->>'role'='lecturer' then insert into public.lecturers(staff_id) values(v_id);end if;
 if p_payload->>'role'='hod' then update public.departments set hod_id=v_user where id=(p_payload->>'department_id')::uuid;end if;
 elsif p_operation='staff.update' then
 if p_actor_role not in ('admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 update public.staff set designation=coalesce(p_payload->>'job_title',designation),qualification=coalesce(p_payload->>'qualification',qualification),updated_at=now() where id=(p_payload->>'staff_id')::uuid returning id,user_id into v_id,v_user;
 update public.users set is_active=coalesce((p_payload->>'is_active')::boolean,is_active),phone_number=coalesce(p_payload->>'phone',phone_number),updated_at=now() where id=v_user;
 elsif p_operation='student.update' then
 if p_actor_role not in ('registrar','admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if p_payload ? 'status' and p_payload->>'status' not in ('active','suspended','deferred','graduated','discontinued') then raise exception 'Invalid enrollment status';end if;
 if p_payload ? 'current_year_of_study' and (p_payload->>'current_year_of_study')::integer not between 1 and 8 then raise exception 'Invalid year of study';end if;
 if p_payload ? 'current_semester_number' and (p_payload->>'current_semester_number')::integer not between 1 and 3 then raise exception 'Invalid semester';end if;
 if p_payload ? 'first_name' and length(trim(p_payload->>'first_name')) not between 1 and 100 then raise exception 'First name required';end if;
 if p_payload ? 'last_name' and length(trim(p_payload->>'last_name')) not between 1 and 100 then raise exception 'Last name required';end if;
 update public.students set status=coalesce(p_payload->>'status',status),current_year_of_study=coalesce((p_payload->>'current_year_of_study')::integer,current_year_of_study),current_semester_number=coalesce((p_payload->>'current_semester_number')::integer,current_semester_number),campus_code=coalesce(p_payload->>'campus_code',campus_code),updated_at=now()
 where id::text=p_payload->>'student_id' or admission_number=p_payload->>'student_id' returning id,user_id into v_id,v_user;
 if not found then raise exception 'Student not found' using errcode='P0002';end if;
 update public.users set first_name=coalesce(p_payload->>'first_name',first_name),last_name=coalesce(p_payload->>'last_name',last_name),phone_number=coalesce(p_payload->>'phone',phone_number),updated_at=now() where id=v_user;
 elsif p_operation='student.create' then
 v_user:=coalesce(nullif(p_payload->>'user_id','')::uuid,gen_random_uuid());
 insert into public.users(id,email,role_id,first_name,last_name,phone_number) values(v_user,lower(trim(p_payload->>'email')),(select id from public.roles where code='student'),trim(p_payload->>'first_name'),trim(p_payload->>'last_name'),p_payload->>'phone');
 insert into public.students(user_id,admission_number,gender,date_of_birth,program_id,current_year_of_study,current_semester_number,status,admission_date,campus_code)
 values(v_user,upper(trim(coalesce(p_payload->>'registration_number',p_payload->>'admission_number'))),coalesce(p_payload->>'gender','other'),(p_payload->>'date_of_birth')::date,(p_payload->>'program_id')::uuid,coalesce((p_payload->>'current_year_of_study')::integer,(p_payload->>'year_of_study')::integer,1),coalesce((p_payload->>'current_semester_number')::integer,1),'active',current_date,coalesce(p_payload->>'campus_code','SMU-MAIN')) returning id into v_id;
 elsif p_operation='admission.create' then
 select id into v_program from public.programs where code=upper(p_payload->>'program_code') and is_active;
 if v_program is null then raise exception 'Choose an active program';end if;
 insert into public.admission_applications(reference_number,applicant_name,applicant_email,applicant_phone,gender,date_of_birth,program_id,intake,intake_year,kcse_grade,kcse_points,previous_institution)
 values('UADM-'||replace(gen_random_uuid()::text,'-',''),trim(p_payload->>'applicant_name'),lower(trim(p_payload->>'applicant_email')),p_payload->>'applicant_phone',p_payload->>'gender',(p_payload->>'date_of_birth')::date,v_program,coalesce(p_payload->>'intake','September'),coalesce((p_payload->>'intake_year')::integer,extract(year from now())::integer),p_payload->>'kcse_grade',(p_payload->>'kcse_points')::numeric,p_payload->>'previous_institution') returning id into v_id;
 elsif p_operation='admission.review' then
 select * into v_record from public.admission_applications where id=(p_payload->>'application_id')::uuid for update;
 if not found then raise exception 'Application not found' using errcode='P0002';end if;
 if p_payload->>'status' not in ('under_review','shortlisted','admitted','rejected') then raise exception 'Invalid admission status';end if;
 if v_record.status='admitted' and p_payload->>'status'<>'admitted' then raise exception 'Enrolled admission cannot be reversed; update the student status instead';end if;
 if p_payload->>'status'='admitted' and v_record.student_id is null then
 v_user:=gen_random_uuid();select code into v_number from public.programs where id=v_record.program_id;
 v_number:=v_number||'/'||v_record.intake_year||'/'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 insert into public.users(id,email,role_id,first_name,last_name,phone_number) values(v_user,v_record.applicant_email,(select id from public.roles where code='student'),split_part(v_record.applicant_name,' ',1),trim(substr(v_record.applicant_name,length(split_part(v_record.applicant_name,' ',1))+1)),v_record.applicant_phone);
 insert into public.students(user_id,admission_number,gender,date_of_birth,program_id,admission_date,status) values(v_user,v_number,v_record.gender,v_record.date_of_birth,v_record.program_id,current_date,'active') returning id into v_student;
 update public.admission_applications set student_id=v_student,admission_number=v_number where id=v_record.id;
 end if;
 update public.admission_applications set status=p_payload->>'status',reviewed_by=p_actor_id,reviewed_at=now() where id=v_record.id returning id into v_id;
 elsif p_operation='registration.create' then
 if p_actor_role not in ('student','registrar','admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if v_semester is null then raise exception 'Configure the current semester';end if;
 select id into v_student from public.students where case when p_actor_role='student' then user_id=p_actor_id else id=(p_payload->>'student_id')::uuid end and status='active';
 if v_student is null then raise exception 'Active student not found';end if;
 select * into v_record from public.courses where code=p_payload->>'course_code' and is_active for update;
 if not found then raise exception 'Active course not found';end if;
 if (select registration_deadline from public.semesters where id=v_semester)<current_date then raise exception 'Registration deadline has passed';end if;
 if (select count(*) from public.course_registrations where course_id=v_record.id and semester_id=v_semester and status in ('pending','approved','registered'))>=v_record.capacity then raise exception 'Course is full';end if;
 if coalesce((select sum(c.credit_hours) from public.course_registrations r join public.courses c on c.id=r.course_id where r.student_id=v_student and r.semester_id=v_semester and r.status in ('pending','approved','registered')),0)+v_record.credit_hours>(select p.credit_limit from public.students s join public.programs p on p.id=s.program_id where s.id=v_student) then raise exception 'Semester credit limit exceeded';end if;
 if exists(select 1 from public.course_prerequisites cp where cp.course_id=v_record.id and not exists(select 1 from public.student_grades g where g.student_id=v_student and g.course_id=cp.prerequisite_course_id and g.is_approved and g.total_score>=40)) then raise exception 'Course prerequisites are not satisfied';end if;
 insert into public.course_registrations(student_id,course_id,semester_id,academic_year_id,status) values(v_student,v_record.id,v_semester,v_year,'pending') returning id into v_id;
 elsif p_operation='registration.approve' then
 if p_payload ? 'registration_ids' then select array_agg(value::uuid) into v_ids from jsonb_array_elements_text(p_payload->'registration_ids');end if;
 if v_ids is null and nullif(p_payload->>'course_code','') is null then raise exception 'Select registrations';end if;
 if v_ids is not null and (cardinality(v_ids)=0 or cardinality(v_ids)>200) then raise exception 'Select 1 to 200 registrations';end if;
 perform 1 from public.course_registrations r join public.courses c on c.id=r.course_id where (v_ids is null or r.id=any(v_ids)) and (not(p_payload ? 'course_code') or c.code=p_payload->>'course_code') for update of r;
 select array_agg(r.id),count(*) into v_ids,v_count from public.course_registrations r join public.courses c on c.id=r.course_id where (v_ids is null or r.id=any(v_ids)) and (not(p_payload ? 'course_code') or c.code=p_payload->>'course_code');
 if v_count=0 or (p_payload ? 'registration_ids' and v_count<>(select count(distinct value) from jsonb_array_elements_text(p_payload->'registration_ids'))) then raise exception 'Selected registrations not found' using errcode='P0002';end if;
 if p_actor_role='hod' and exists(select 1 from public.course_registrations r join public.courses c on c.id=r.course_id where r.id=any(v_ids) and c.code not in(select code from public.uams_course_scope(p_actor_id,'hod'))) then raise exception 'Registration outside department scope' using errcode='42501';end if;
 update public.course_registrations set status='approved',approved_by=p_actor_id,approved_at=now() where id=any(v_ids) and status='pending';
 get diagnostics v_count=row_count;if v_count=0 then raise exception 'No pending registrations' using errcode='P0002';end if;
 select jsonb_build_object('approved_count',v_count,'approved',coalesce(jsonb_agg(to_jsonb(r)),'[]')) into v_result from public.uams_registration_records r where r.id=any(v_ids);
 elsif p_operation in ('grade.submit','grade.approve') then
 if p_operation='grade.submit' then
 if p_actor_role not in ('lecturer','super_admin','admin','registrar') then raise exception 'Operation forbidden' using errcode='42501';end if;
 select id into v_course from public.courses where code=p_payload->>'course_code';
 if p_actor_role='lecturer' and not exists(select 1 from public.uams_course_scope(p_actor_id,'lecturer') where code=p_payload->>'course_code') then raise exception 'Course outside teaching allocation' using errcode='42501';end if;
 select id into v_student from public.students where id::text=p_payload->>'student_id' or admission_number=p_payload->>'admission_number';
 if v_student is null or v_course is null or v_semester is null then raise exception 'Student, course and current semester required';end if;
 if not exists(select 1 from public.course_registrations where student_id=v_student and course_id=v_course and semester_id=v_semester and status='approved') then raise exception 'Approved registration required';end if;
 if (p_payload->>'cat_score')::numeric not between 0 and 30 or (p_payload->>'exam_score')::numeric not between 0 and 70 then raise exception 'Invalid marks';end if;
 v_amount:=(p_payload->>'cat_score')::numeric+(p_payload->>'exam_score')::numeric;
 insert into public.student_grades(student_id,course_id,semester_id,academic_year_id,cat_score,exam_score,letter_grade,grade_point,is_submitted,is_approved,submitted_by)
 values(v_student,v_course,v_semester,v_year,(p_payload->>'cat_score')::numeric,(p_payload->>'exam_score')::numeric,case when v_amount>=70 then 'A' when v_amount>=60 then 'B' when v_amount>=50 then 'C' when v_amount>=40 then 'D' else 'E' end,case when v_amount>=70 then 4 when v_amount>=60 then 3 when v_amount>=50 then 2 when v_amount>=40 then 1 else 0 end,true,false,p_actor_id)
 on conflict(student_id,course_id,semester_id) do update set cat_score=excluded.cat_score,exam_score=excluded.exam_score,letter_grade=excluded.letter_grade,grade_point=excluded.grade_point,is_submitted=true,is_approved=false,submitted_by=p_actor_id,approved_by=null,updated_at=now() returning id into v_id;
 else
 select g.id,c.code into v_record from public.student_grades g join public.courses c on c.id=g.course_id where g.id=(p_payload->>'grade_id')::uuid and g.is_submitted for update of g;
 if not found then raise exception 'Submitted grade not found' using errcode='P0002';end if;
 if p_actor_role='hod' and not exists(select 1 from public.uams_course_scope(p_actor_id,'hod') where code=v_record.code) then raise exception 'Grade outside department' using errcode='42501';end if;
 update public.student_grades set is_approved=true,approved_by=p_actor_id,updated_at=now() where id=v_record.id returning id into v_id;
 end if;
 elsif p_operation='event.save' then
 if p_actor_role='hod' and (p_payload->>'scope_type'<>'department' or not exists(select 1 from public.departments where id=(p_payload->>'scope_id')::uuid and hod_id=p_actor_id)) then raise exception 'HOD events must target own department' using errcode='42501';end if;
 if p_payload->>'scope_type' in ('school','department','program') and not(case p_payload->>'scope_type' when 'school' then exists(select 1 from public.schools where id=(p_payload->>'scope_id')::uuid) when 'department' then exists(select 1 from public.departments where id=(p_payload->>'scope_id')::uuid) else exists(select 1 from public.programs where id=(p_payload->>'scope_id')::uuid) end) then raise exception 'Event scope not found';end if;
 v_id:=coalesce(nullif(p_payload->>'id','')::uuid,gen_random_uuid());
 if p_payload ? 'id' and not exists(select 1 from public.campus_events where id=v_id and (p_actor_role<>'hod' or created_by=(select email from public.users where id=p_actor_id))) then raise exception 'Event not found in your scope' using errcode='42501';end if;
 insert into public.campus_events(id,title,description,category,starts_at,ends_at,location,scope_type,scope_id,scope_name,created_by,created_by_role,is_active)
 values(v_id,p_payload->>'title',coalesce(p_payload->>'description',''),p_payload->>'category',(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,p_payload->>'location',coalesce(p_payload->>'scope_type','university'),nullif(p_payload->>'scope_id','')::uuid,p_payload->>'scope_name',(select email from public.users where id=p_actor_id),p_actor_role,coalesce((p_payload->>'is_active')::boolean,true))
 on conflict(id) do update set title=excluded.title,description=excluded.description,category=excluded.category,starts_at=excluded.starts_at,ends_at=excluded.ends_at,location=excluded.location,scope_type=excluded.scope_type,scope_id=excluded.scope_id,scope_name=excluded.scope_name,is_active=excluded.is_active,updated_at=now();
 elsif p_operation='invoice.create' then
 if p_actor_role not in ('finance_officer','admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if v_semester is null then raise exception 'Current semester required';end if;
 v_amount:=(p_payload->>'total_amount')::numeric;if v_amount<=0 then raise exception 'Positive invoice amount required';end if;
 select id into v_student from public.students where id=(p_payload->>'student_id')::uuid for update;
 if not found then raise exception 'Student not found' using errcode='P0002';end if;
 insert into public.student_invoices(student_id,semester_id,invoice_number,total_billed,due_date)
 values(v_student,v_semester,'INV-'||replace(gen_random_uuid()::text,'-',''),v_amount,(p_payload->>'due_date')::date) returning id into v_id;
 v_remaining:=v_amount;
 for v_record in select * from public.transactions where student_id=v_student and status='verified' and unallocated_credit>0 order by created_at,id for update loop
 exit when v_remaining=0;v_applied:=least(v_remaining,v_record.unallocated_credit);
 insert into public.uams_payment_allocations values(v_record.id,v_id,v_applied);
 update public.transactions set unallocated_credit=unallocated_credit-v_applied where id=v_record.id;
 v_remaining:=v_remaining-v_applied;
 end loop;
 update public.student_invoices set amount_paid=v_amount-v_remaining,status=case when v_remaining=0 then 'paid' when v_remaining<v_amount then 'partially_paid' else 'unpaid' end where id=v_id;
 elsif p_operation='bank.record' then
 if p_actor_role not in ('finance_officer','admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 v_reference:=upper(trim(p_payload->>'bank_reference'));v_amount:=(p_payload->>'amount')::numeric;
 if v_reference is null or length(v_reference) not between 1 and 100 or v_amount<=0 or v_amount>1000000 or v_amount<>round(v_amount,2) then raise exception 'Invalid bank reference or amount';end if;
 select id into v_student from public.students where id::text=p_payload->>'student_id' or admission_number=p_payload->>'student_id' for update;
 if not found then raise exception 'Student not found' using errcode='P0002';end if;
 select t.* into v_record from public.transactions t join public.bank_transactions b on b.transaction_id=t.id where upper(b.slip_reference_number)=v_reference;
 if found then
 if v_record.student_id<>v_student or v_record.amount<>v_amount then raise exception 'Reference already used for another deposit' using errcode='23505';end if;
 return (select to_jsonb(b) from public.uams_bank_records b where b.id=v_record.id);
 end if;
 insert into public.transactions(student_id,amount,payment_method,reference_number,transaction_date,status,verified_by,verified_at,notes)
 values(v_student,v_amount,'bank_transfer','RCP-'||replace(gen_random_uuid()::text,'-',''),coalesce((p_payload->>'deposited_at')::timestamptz,now()),'verified',p_actor_id,now(),p_payload->>'notes') returning id into v_id;
 insert into public.bank_transactions(transaction_id,bank_name,slip_reference_number,deposit_date) values(v_id,trim(p_payload->>'bank'),v_reference,coalesce((p_payload->>'deposited_at')::date,current_date));
 v_remaining:=v_amount;
 for v_invoice in select * from public.student_invoices where student_id=v_student and balance>0 order by created_at,id for update loop
 exit when v_remaining=0;v_applied:=least(v_remaining,v_invoice.balance);
 insert into public.uams_payment_allocations values(v_id,v_invoice.id,v_applied);
 update public.student_invoices set amount_paid=amount_paid+v_applied,status=case when balance=v_applied then 'paid' else 'partially_paid' end,updated_at=now() where id=v_invoice.id;
 v_remaining:=v_remaining-v_applied;
 end loop;
 -- Credit remains in the ledger; it is never silently discarded.
 update public.transactions set unallocated_credit=v_remaining where id=v_id;
 select to_jsonb(b)||jsonb_build_object('unallocated_credit',v_remaining) into v_result from public.uams_bank_records b where b.id=v_id;
 elsif p_operation='exam.schedule' then
 if p_actor_role not in ('registrar','admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if v_semester is null then raise exception 'Current semester required';end if;
 select id into v_course from public.courses where code=p_payload->>'course_code';
 if v_course is null or (p_payload->>'end_time')::time<=(p_payload->>'start_time')::time then raise exception 'Invalid course or exam times';end if;
 perform pg_advisory_xact_lock(hashtext('uams_exam_schedule'));
 if exists(select 1 from public.exam_schedules where exam_date=(p_payload->>'exam_date')::date and status<>'cancelled' and (venue=p_payload->>'venue' or course_id=v_course) and start_time<(p_payload->>'end_time')::time and end_time>(p_payload->>'start_time')::time) then raise exception 'Exam venue or course already scheduled';end if;
 insert into public.exam_schedules(course_id,semester_id,exam_date,start_time,end_time,venue,total_enrolled) values(v_course,v_semester,(p_payload->>'exam_date')::date,(p_payload->>'start_time')::time,(p_payload->>'end_time')::time,p_payload->>'venue',coalesce((p_payload->>'total_candidates')::integer,0)) returning id into v_id;
 elsif p_operation='timetable.create' then
 if p_actor_role not in ('registrar','admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if v_semester is null then raise exception 'Current semester required';end if;
 select id into v_course from public.courses where code=p_payload->>'courseCode';
 select l.id into v_user from public.lecturers l join public.staff st on st.id=l.staff_id join public.users u on u.id=st.user_id where u.id::text=p_payload->>'lecturer_id';
 if v_course is null or v_user is null or (p_payload->>'end_time')::time<=(p_payload->>'start_time')::time then raise exception 'Course, lecturer and valid times required';end if;
 perform pg_advisory_xact_lock(hashtext('uams_timetable'));
 if exists(select 1 from public.timetables where semester_id=v_semester and day_of_week=p_payload->>'day' and (room_or_hall=p_payload->>'room' or course_id=v_course or lecturer_id=v_user) and start_time<(p_payload->>'end_time')::time and end_time>(p_payload->>'start_time')::time) then raise exception 'Room, course or lecturer already booked';end if;
 insert into public.timetables(course_id,lecturer_id,semester_id,day_of_week,start_time,end_time,room_or_hall) values(v_course,v_user,v_semester,p_payload->>'day',(p_payload->>'start_time')::time,(p_payload->>'end_time')::time,p_payload->>'room') returning id into v_id;
 elsif p_operation in ('attendance.session','attendance.mark') then
 if p_actor_role not in ('lecturer','admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if p_operation='attendance.session' then
 if v_semester is null then raise exception 'Current semester required';end if;
 select id into v_course from public.courses where code=coalesce(p_payload->>'course',p_payload->>'course_code');
 if v_course is null then raise exception 'Course not found';end if;
 if p_actor_role='lecturer' and not exists(select 1 from public.uams_course_scope(p_actor_id,'lecturer') where code=coalesce(p_payload->>'course',p_payload->>'course_code')) then raise exception 'Course outside allocation' using errcode='42501';end if;
 select l.id into v_user from public.lecturers l join public.staff st on st.id=l.staff_id where st.user_id=p_actor_id;
 if (p_payload->>'end_time')::time<=(p_payload->>'start_time')::time then raise exception 'End time must follow start';end if;
 insert into public.attendance_sessions(course_id,lecturer_id,semester_id,session_date,start_time,end_time,topic) values(v_course,v_user,v_semester,(p_payload->>'session_date')::date,(p_payload->>'start_time')::time,(p_payload->>'end_time')::time,p_payload->>'topic') returning id into v_id;
 else
 select a.*,c.code into v_record from public.attendance_sessions a join public.courses c on c.id=a.course_id where a.id=(p_payload->>'session_id')::uuid for update of a;
 if not found then raise exception 'Session not found' using errcode='P0002';end if;
 if p_actor_role='lecturer' and not exists(select 1 from public.uams_course_scope(p_actor_id,'lecturer') where code=v_record.code) then raise exception 'Session outside allocation' using errcode='42501';end if;
 if jsonb_typeof(p_payload->'roster')<>'array' or jsonb_array_length(p_payload->'roster')=0 or jsonb_array_length(p_payload->'roster')>1000 then raise exception 'Invalid attendance roster';end if;
 if exists(select 1 from jsonb_array_elements(p_payload->'roster') r where r->>'status' not in ('present','absent','late','excused') or not exists(select 1 from public.course_registrations cr where cr.student_id=coalesce(r->>'id',r->>'student_id')::uuid and cr.course_id=v_record.course_id and cr.semester_id=v_record.semester_id and cr.status='approved')) then raise exception 'Roster contains unregistered student';end if;
 if (select count(distinct coalesce(r->>'id',r->>'student_id')) from jsonb_array_elements(p_payload->'roster') r)<>jsonb_array_length(p_payload->'roster') then raise exception 'Duplicate student in roster';end if;
 insert into public.attendance_records(session_id,student_id,status) select v_record.id,coalesce(r->>'id',r->>'student_id')::uuid,r->>'status' from jsonb_array_elements(p_payload->'roster') r on conflict(session_id,student_id) do update set status=excluded.status,marked_at=now();
 v_id:=v_record.id;
 end if;
 elsif p_operation='attendance.record' then
 if p_actor_role not in ('lecturer','admin','super_admin') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if v_semester is null then raise exception 'Current semester required';end if;
 select id into v_course from public.courses where code=p_payload->>'course';
 if p_actor_role='lecturer' and not exists(select 1 from public.uams_course_scope(p_actor_id,'lecturer') where code=p_payload->>'course') then raise exception 'Course outside allocation' using errcode='42501';end if;
 if jsonb_typeof(p_payload->'roster')<>'array' or jsonb_array_length(p_payload->'roster')=0 or jsonb_array_length(p_payload->'roster')>1000 then raise exception 'Invalid attendance roster';end if;
 if exists(select 1 from jsonb_array_elements(p_payload->'roster') r where r->>'status' not in ('present','absent','late','excused') or not exists(select 1 from public.course_registrations cr where cr.student_id=(r->>'id')::uuid and cr.course_id=v_course and cr.semester_id=v_semester and cr.status='approved')) then raise exception 'Roster contains an unregistered student';end if;
 if (select count(distinct r->>'id') from jsonb_array_elements(p_payload->'roster') r)<>jsonb_array_length(p_payload->'roster') then raise exception 'Duplicate attendance student';end if;
 select l.id into v_user from public.lecturers l join public.staff st on st.id=l.staff_id where st.user_id=p_actor_id;
 insert into public.attendance_sessions(course_id,lecturer_id,semester_id,session_date,start_time,end_time,topic) values(v_course,v_user,v_semester,coalesce((p_payload->>'date')::date,current_date),coalesce((p_payload->>'start_time')::time,'08:00'),coalesce((p_payload->>'end_time')::time,'09:00'),p_payload->>'topic') returning id into v_id;
 insert into public.attendance_records(session_id,student_id,status) select v_id,(r->>'id')::uuid,r->>'status' from jsonb_array_elements(p_payload->'roster') r;
 elsif p_operation in ('library.borrow','library.return') then
 if p_actor_role not in ('student','admin','super_admin','registrar') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if p_operation='library.borrow' then
 select id into v_student from public.students where case when p_actor_role='student' then user_id=p_actor_id else id=(p_payload->>'student_id')::uuid end and status='active';
 if v_student is null then raise exception 'Active student required';end if;
 perform 1 from public.library_books where id=(p_payload->>'book_id')::uuid and is_active and available_copies>0 for update;
 if not found then raise exception 'No copies available';end if;
 if exists(select 1 from public.library_loans where student_id=v_student and book_id=(p_payload->>'book_id')::uuid and status in ('borrowed','overdue')) then raise exception 'Book already borrowed';end if;
 update public.library_books set available_copies=available_copies-1 where id=(p_payload->>'book_id')::uuid;
 insert into public.library_loans(book_id,student_id,due_date,issued_by) values((p_payload->>'book_id')::uuid,v_student,current_date+14,p_actor_id) returning id into v_id;
 else
 select l.* into v_record from public.library_loans l join public.students s on s.id=l.student_id where l.id=(p_payload->>'loan_id')::uuid and (p_actor_role<>'student' or s.user_id=p_actor_id) for update of l;
 if not found then raise exception 'Loan not found' using errcode='P0002';end if;
 v_id:=v_record.id;
 if v_record.status<>'returned' then
 update public.library_books set available_copies=available_copies+1 where id=v_record.book_id;
 update public.library_loans set status='returned',return_date=current_date where id=v_id;
 if current_date>v_record.due_date then insert into public.library_fines(loan_id,student_id,amount,reason) values(v_id,v_record.student_id,(current_date-v_record.due_date)*10,'Overdue return');end if;
 end if;
 end if;
 elsif p_operation='hostel.allocate' then
 if p_actor_role not in ('student','admin','super_admin','registrar') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if v_semester is null then raise exception 'Current semester required';end if;
 select * into v_record from public.hostel_rooms where id=(p_payload->>'room_id')::uuid for update;
 if not found or not v_record.is_available then raise exception 'Room unavailable';end if;
 select id into v_student from public.students where case when p_actor_role='student' then user_id=p_actor_id else id=(p_payload->>'student_id')::uuid end and status='active' for update;
 if v_student is null then raise exception 'Active student required';end if;
 if exists(select 1 from public.hostel_blocks b join public.students s on s.id=v_student where b.id=v_record.block_id and (not b.is_active or (b.gender_designation<>'mixed' and b.gender_designation<>s.gender))) then raise exception 'Room gender designation is incompatible';end if;
 v_count:=(p_payload->>'bed_number')::integer;
 if v_count is null or v_count<1 or v_count>v_record.capacity or exists(select 1 from public.hostel_allocations where room_id=v_record.id and semester_id=v_semester and bed_number=v_count and status in ('allocated','checked_in')) then raise exception 'Bed is unavailable';end if;
 insert into public.hostel_allocations(student_id,room_id,semester_id,bed_number,allocated_by) values(v_student,v_record.id,v_semester,v_count,p_actor_id) returning id into v_id;
 update public.hostel_rooms set occupied_beds=(select count(*) from public.hostel_allocations where room_id=v_record.id and semester_id=v_semester and status in ('allocated','checked_in')),is_available=(select count(*) from public.hostel_allocations where room_id=v_record.id and semester_id=v_semester and status in ('allocated','checked_in'))<capacity where id=v_record.id;
 elsif p_operation='staff.allocate' then
 if p_actor_role not in ('admin','super_admin','registrar','hod') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if v_semester is null then raise exception 'Current semester required';end if;
 select c.id into v_course from public.courses c where c.code=p_payload->>'course_code';
 if v_course is null then raise exception 'Course not found';end if;
 if p_actor_role='hod' and not exists(select 1 from public.uams_course_scope(p_actor_id,'hod') where code=p_payload->>'course_code') then raise exception 'Course outside department' using errcode='42501';end if;
 select l.id into v_user from public.lecturers l join public.staff st on st.id=l.staff_id join public.users u on u.id=st.user_id where st.id=(p_payload->>'lecturer_staff_id')::uuid and u.is_active;
 if v_user is null then raise exception 'Active lecturer required';end if;
 insert into public.course_allocations(course_id,lecturer_id,semester_id,academic_year_id) values(v_course,v_user,v_semester,v_year) on conflict(course_id,lecturer_id,semester_id) do update set academic_year_id=excluded.academic_year_id returning id into v_id;
 elsif p_operation='notification.queue' then
 if p_actor_role not in ('admin','super_admin','registrar','finance_officer') then raise exception 'Operation forbidden' using errcode='42501';end if;
 if length(trim(p_payload->>'message_content')) not between 1 and 10000 or length(trim(p_payload->>'recipient_identifier')) not between 1 and 100 then raise exception 'Recipient and message required';end if;
 insert into public.notification_logs(recipient_type,recipient_identifier,channel,subject,message_content,provider,status) values(p_payload->>'recipient_type',p_payload->>'recipient_identifier',p_payload->>'channel',p_payload->>'subject',p_payload->>'message_content','configured_dispatcher','queued') returning id into v_id;
 else raise exception 'Unsupported institutional operation';end if;
 if v_id is null and v_result is null then raise exception 'Record not found' using errcode='P0002';end if;
 insert into public.uams_operation_audit(actor_id,operation,entity_id,details) values(p_actor_id,p_operation,v_id::text,jsonb_build_object('source','institutional_api'));
 if v_result is not null then return v_result;end if;
 if p_operation in ('staff.create','staff.update') then return(select to_jsonb(r) from public.uams_staff_records r where id=v_id);
 elsif p_operation='staff.allocate' then return(select to_jsonb(r) from public.course_allocations r where id=v_id);
 elsif p_operation like 'student.%' then return(select to_jsonb(r) from public.uams_student_records r where id=v_id);
 elsif p_operation like 'admission.%' then return(select to_jsonb(r) from public.uams_admission_records r where id=v_id);
 elsif p_operation like 'grade.%' then return(select to_jsonb(r) from public.uams_grade_records r where id=v_id);
 elsif p_operation like 'registration.%' then return(select to_jsonb(r) from public.uams_registration_records r where id=v_id);
 elsif p_operation='event.save' then return(select to_jsonb(r) from public.campus_events r where id=v_id);
 elsif p_operation='invoice.create' then return(select to_jsonb(r) from public.uams_invoice_records r where id=v_id);
 elsif p_operation like 'attendance.%' then return(select to_jsonb(r)||jsonb_build_object('percentage',case when r.total>0 then round(100.0*r.present/r.total,1)::text||'%' else '0%' end) from public.uams_attendance_records r where id=v_id);
 elsif p_operation like 'library.%' then return(select to_jsonb(r) from public.uams_library_loan_records r where id=v_id);
 elsif p_operation='hostel.allocate' then return(select to_jsonb(r) from public.uams_hostel_records r where id=v_id);
 elsif p_operation='timetable.create' then return(select to_jsonb(r) from public.uams_timetable_records r where id=v_id);
 elsif p_operation='exam.schedule' then return(select to_jsonb(r) from public.uams_exam_records r where id=v_id);
 elsif p_operation='notification.queue' then return(select to_jsonb(r) from public.notification_logs r where id=v_id);
 end if;
 return jsonb_build_object('id',v_id);
end;$$;

do $$declare t text;begin
 foreach t in array array['admission_applications','campus_events','uams_payment_allocations','uams_operation_audit'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['uams_student_records','uams_grade_records','uams_course_records','uams_registration_records','uams_staff_records','uams_admission_records','uams_invoice_records','uams_bank_records','uams_exam_records','uams_timetable_records','uams_library_loan_records','uams_hostel_records','uams_attendance_records'] loop
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to service_role',t);
 end loop;
end;$$;
revoke all on function public.uams_course_scope(uuid,text) from public,anon,authenticated;
grant execute on function public.uams_course_scope(uuid,text) to service_role;
revoke all on function public.uams_workflow(text,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.uams_workflow(text,jsonb,uuid,text) to service_role;

create table if not exists public.uams_stk_requests (
 "checkoutRequestId" text primary key,"merchantRequestId" text not null,"userId" text not null,
 "accountReference" text not null,"phoneNumber" text not null,amount integer not null check(amount between 1 and 250000),
 status text not null default 'pending' check(status in ('pending','settled','failed','expired')),
 "createdAt" bigint not null,"mpesaReceiptNumber" text unique,"settledAt" timestamptz
);
alter table public.uams_stk_requests enable row level security;
revoke all on public.uams_stk_requests from public,anon,authenticated;
grant select,insert,update on public.uams_stk_requests to service_role;
create or replace function public.uams_settle_stk(p_checkout text,p_receipt text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_payment public.uams_stk_requests;v_student uuid;v_transaction uuid;v_remaining numeric;v_applied numeric;v_invoice record;
begin
 select * into v_payment from public.uams_stk_requests where "checkoutRequestId"=p_checkout for update;
 if not found then raise exception 'Unknown payment';end if;
 if v_payment.status='settled' then
 if v_payment."mpesaReceiptNumber"<>p_receipt then raise exception 'Receipt mismatch';end if;
 return jsonb_build_object('status','settled','receipt',p_receipt);
 end if;
 if v_payment.status<>'pending' or p_receipt !~ '^[A-Z0-9]{8,20}$' then raise exception 'Invalid payment state or receipt';end if;
 select id into v_student from public.students where admission_number=v_payment."accountReference" for update;
 if not found then raise exception 'Student ledger not found';end if;
 insert into public.transactions(student_id,amount,payment_method,reference_number,transaction_date,status,verified_at)
 values(v_student,v_payment.amount,'mpesa',p_receipt,now(),'verified',now()) returning id into v_transaction;
 insert into public.mpesa_transactions(transaction_id,merchant_request_id,checkout_request_id,mpesa_receipt_number,phone_number,amount,result_code)
 values(v_transaction,v_payment."merchantRequestId",p_checkout,p_receipt,v_payment."phoneNumber",v_payment.amount,0);
 v_remaining:=v_payment.amount;
 for v_invoice in select * from public.student_invoices where student_id=v_student and balance>0 order by created_at,id for update loop
 exit when v_remaining=0;v_applied:=least(v_remaining,v_invoice.balance);
 insert into public.uams_payment_allocations values(v_transaction,v_invoice.id,v_applied);
 update public.student_invoices set amount_paid=amount_paid+v_applied,status=case when balance=v_applied then 'paid' else 'partially_paid' end,updated_at=now() where id=v_invoice.id;
 v_remaining:=v_remaining-v_applied;
 end loop;
 update public.transactions set unallocated_credit=v_remaining where id=v_transaction;
 update public.uams_stk_requests set status='settled',"mpesaReceiptNumber"=p_receipt,"settledAt"=now() where "checkoutRequestId"=p_checkout;
 insert into public.uams_operation_audit(actor_id,operation,entity_id,details)
 select u.id,'mpesa.settled',v_transaction::text,jsonb_build_object('checkout_id',p_checkout) from public.users u where u.id::text=v_payment."userId";
 return jsonb_build_object('status','settled','receipt',p_receipt,'unallocated_credit',v_remaining);
end;$$;
revoke all on function public.uams_settle_stk(text,text) from public,anon,authenticated;
grant execute on function public.uams_settle_stk(text,text) to service_role;
