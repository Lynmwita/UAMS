-- Support staff portal role (2026-10-28): cleaners, cooks, drivers,
-- gardeners, security staff and other support job titles sign in with the
-- scoped 'support_staff' role. The login gate and provisioning look this
-- code up in public.roles, so the row must exist before any support
-- staff member can log in on an institutional database. Run this file in
-- the Supabase SQL Editor at deploy time (same as the other migrations).
-- Defensive: only inserts when the row is absent, and copes with a roles
-- table that may or may not carry a name column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'name'
  ) THEN
    INSERT INTO public.roles (code, name)
    SELECT 'support_staff', 'Support Staff'
    WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'support_staff');
  ELSE
    INSERT INTO public.roles (code)
    SELECT 'support_staff'
    WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'support_staff');
  END IF;
END $$;
