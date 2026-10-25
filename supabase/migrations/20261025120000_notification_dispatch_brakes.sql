-- Migration: 20261025120000_notification_dispatch_brakes.sql (renamed from 20261023120000_ to avoid colliding with the student-photo migration stem)
-- Description: Adds retry tracking and airtime cost columns to notification_logs

ALTER TABLE IF EXISTS public.notification_logs
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost NUMERIC(8, 4) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_notification_logs_retry ON public.notification_logs(retry_count);
