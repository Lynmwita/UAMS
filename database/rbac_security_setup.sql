-- Apply to an existing UAMS database. Safe to run repeatedly.
BEGIN;
-- PostgreSQL row policies cannot restrict which columns a user updates.
-- Column grants prevent self-assignment of privileged roles or activation changes.
REVOKE UPDATE ON public.users FROM PUBLIC, anon, authenticated;
GRANT UPDATE (first_name, last_name, phone_number, avatar_url) ON public.users TO authenticated;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- Protect role definitions and permission links from direct Data API mutations.
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.roles, public.permissions, public.role_permissions
  FROM PUBLIC, anon, authenticated;

-- Privileged identity lookups live outside the exposed API schema. They only
-- resolve the caller's active identity and have a fixed, empty search path.
CREATE SCHEMA IF NOT EXISTS uams_private;
REVOKE ALL ON SCHEMA uams_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA uams_private TO authenticated;

CREATE OR REPLACE FUNCTION uams_private.auth_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.code FROM public.users u JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = (SELECT auth.uid()) AND u.is_active IS TRUE;
$$;
CREATE OR REPLACE FUNCTION uams_private.auth_student_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.id FROM public.students s JOIN public.users u ON u.id = s.user_id
  WHERE u.id = (SELECT auth.uid()) AND u.is_active IS TRUE;
$$;
CREATE OR REPLACE FUNCTION uams_private.auth_staff_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.id FROM public.staff s JOIN public.users u ON u.id = s.user_id
  WHERE u.id = (SELECT auth.uid()) AND u.is_active IS TRUE;
$$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA uams_private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA uams_private TO authenticated;

-- Compatibility wrappers keep the existing policy names working without
-- exposing a SECURITY DEFINER function in public.
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT uams_private.auth_user_role();
$$;
CREATE OR REPLACE FUNCTION public.auth_student_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT uams_private.auth_student_id();
$$;
CREATE OR REPLACE FUNCTION public.auth_staff_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT uams_private.auth_staff_id();
$$;
REVOKE EXECUTE ON FUNCTION public.auth_user_role(), public.auth_student_id(), public.auth_staff_id()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_role(), public.auth_student_id(), public.auth_staff_id()
  TO authenticated;

-- Grade approval must go through a trusted API with distinct write/approval
-- permissions. A lecturer's existing FOR ALL policy must not permit self-sealing
-- by calling Supabase directly. Other record mutations also use the trusted API.
REVOKE INSERT, UPDATE, DELETE ON public.student_grades, public.students,
  public.course_registrations, public.attendance_records, public.student_invoices,
  public.transactions, public.mpesa_transactions, public.bank_transactions,
  public.audit_logs FROM PUBLIC, anon, authenticated;
COMMIT;
