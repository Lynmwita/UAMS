-- Student profile photo on the ID card (2026-10-23)
--
-- One photo per student, used everywhere: profile avatar in the registrar
-- registry AND the photo printed on the Student ID Card.
--
-- The durable home already exists: public.users.avatar_url (TEXT).
-- This migration only teaches the student records view to expose it, as
-- both `photo_url` and `avatar_url`, so UAMS can read it back after the
-- registrar saves a photo (the app writes users.avatar_url through the
-- service-role client on student.create / student.update).
--
-- Apply manually in the Supabase SQL Editor, like the 2026-10-22 rollout.
-- Do NOT re-run the CLI migration chain for this file alone.

create or replace view public.uams_student_records with(security_invoker=true) as
 select s.id,s.user_id,s.admission_number,u.first_name,u.last_name,u.email,s.gender,s.program_id,p.name program_name,
 p.department_id,d.name department,sc.name faculty,s.campus_code,s.current_year_of_study,s.current_semester_number,
 s.status,s.admission_date,s.updated_at,
 u.avatar_url as photo_url, u.avatar_url as avatar_url,
 coalesce((select sum(g.grade_point*c.credit_hours)/nullif(sum(c.credit_hours),0) from public.student_grades g join public.courses c on c.id=g.course_id where g.student_id=s.id and g.is_approved),0)::numeric cgpa,
 (coalesce((select sum(i.balance) from public.student_invoices i where i.student_id=s.id),0)-coalesce((select sum(t.unallocated_credit) from public.transactions t where t.student_id=s.id and t.status='verified'),0))::numeric fee_balance
 from public.students s join public.users u on u.id=s.user_id join public.programs p on p.id=s.program_id
 join public.departments d on d.id=p.department_id join public.schools sc on sc.id=d.school_id;
