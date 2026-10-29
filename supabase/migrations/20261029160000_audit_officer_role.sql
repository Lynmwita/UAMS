-- Audit & Compliance Officer Role (2026-10-29)
-- Independent read-only oversight across system audit logs, finance ledgers,
-- and examination records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'roles' AND column_name = 'name'
  ) THEN
    INSERT INTO public.roles (code, name, description)
    SELECT 'audit_officer', 'Audit & Compliance Officer', 'Independent read-only audit and compliance oversight across system logs, finance, and examination marks'
    WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'audit_officer');
  ELSE
    INSERT INTO public.roles (code)
    SELECT 'audit_officer'
    WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE code = 'audit_officer');
  END IF;
END $$;
