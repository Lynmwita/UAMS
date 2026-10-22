-- Read-only: run in the UAMS Supabase SQL Editor before applying migrations.
-- Returns existing public tables, columns, and row-level-security status.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       string_agg(a.attname || ' ' || pg_catalog.format_type(a.atttypid, a.atttypmod),
                  ', ' ORDER BY a.attnum) AS columns
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND a.attnum > 0 AND NOT a.attisdropped
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;
