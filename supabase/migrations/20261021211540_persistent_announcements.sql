-- Additive migration. Rollback: keep this schema and roll back the application;
-- do not drop persisted notices or re-enable direct browser writes.
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  content text NOT NULL,
  target_audience varchar(50) DEFAULT 'all',
  is_urgent boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Academic',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Normal', 'Important', 'Urgent')),
  ADD COLUMN IF NOT EXISTS author_email text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_uams_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  NEW.created_at := OLD.created_at;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.touch_uams_notice() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS touch_uams_notice ON public.announcements;
CREATE TRIGGER touch_uams_notice BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_uams_notice();

-- UAMS HTTP handlers authenticate users and enforce role/audience checks.
-- Supabase credentials with elevated privileges stay exclusively on the server.
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.announcements FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.announcements TO service_role;
