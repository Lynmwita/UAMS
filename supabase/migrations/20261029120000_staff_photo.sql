-- Staff profile photo (2026-10-29)
--
-- One photo per staff member, shown as the avatar in the staff list and on
-- their details. Mirrors the student photo pattern (2026-10-23).
--
-- The durable home already exists: public.users.avatar_url (TEXT).
-- This migration only teaches the staff records view to expose it as
-- `photo_url`, so UAMS can read it back after the admin saves a photo
-- (the app writes users.avatar_url through the service-role client on
-- staff.create / staff.update).
--
-- Hub-sync ruling: staff records NEVER sync to the Student Hub, so staff
-- photos are UAMS-only by design. No feed changes needed.
--
-- Apply manually in the Supabase SQL Editor at deploy time, like the other
-- migrations. Do NOT re-run the CLI migration chain for this file alone.

create or replace view public.uams_staff_records with(security_invoker=true) as
 select st.id,st.staff_number,u.first_name,u.last_name,u.email,u.phone_number phone,r.code role,st.department_id,
 d.name department_name,d.school_id,st.designation job_title,st.qualification,u.is_active,st.date_of_joining joined_date,
 u.avatar_url as photo_url
 from public.staff st join public.users u on u.id=st.user_id join public.roles r on r.id=u.role_id left join public.departments d on d.id=st.department_id;
