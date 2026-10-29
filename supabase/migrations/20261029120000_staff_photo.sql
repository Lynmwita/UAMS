-- Staff profile photo on the ID card and staff directory (2026-10-29)
--
-- One photo per staff member, used everywhere: profile avatar in staff
-- registry AND the photo printed on the official Staff ID Card.
--
-- Durable home: public.users.avatar_url (TEXT).
-- This migration updates public.uams_staff_records view to expose:
-- u.avatar_url as photo_url, u.avatar_url as avatar_url
--
-- Apply in the Supabase SQL Editor.

create or replace view public.uams_staff_records with(security_invoker=true) as
 select st.id,st.staff_number,u.first_name,u.last_name,u.email,u.phone_number phone,r.code role,st.department_id,
 d.name department_name,d.school_id,st.designation job_title,st.qualification,u.is_active,st.date_of_joining joined_date,
 u.avatar_url as photo_url, u.avatar_url as avatar_url
 from public.staff st join public.users u on u.id=st.user_id join public.roles r on r.id=u.role_id left join public.departments d on d.id=st.department_id;

grant select on public.uams_staff_records to service_role;
