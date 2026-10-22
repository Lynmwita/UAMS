# Campus activation checkpoint ? 22 October 2026

## Manual database rollout

The user ran UAMS migrations in Supabase SQL Editor and supplied verification showing uams_student_records, uams_grade_records, uams_stk_requests and hub_support_records exist. This confirms object presence, not workflow acceptance.

The user ran student-life-campus-hub/scripts/manual-campus-rollout.sql. Their CSV shows all nine checked Hub tables exist with RLS enabled: sync_runs, pilot_feedback, push_subscriptions, push_deliveries, event_rsvps, club_memberships, uams_academic_records, uams_support_deliveries and event_attendance. The bundle includes 20261015000014 plus the four 20261021 migrations.

Manual SQL execution has not been reconciled with CLI migration history. Do not blindly push these migrations again. CLI migration access returned a 403 even though the dashboard screenshot showed Owner.

## Chosen destination and configuration

User selected Summit Metropolitan University, Main Campus: university UUID 00000000-0000-0000-0000-000000000001, campus code SMU-MAIN.

User supplied UAMS https://uams-plum.vercel.app and Hub https://student-life-campus-hub.vercel.app. Local ignored environment files now contain these origins, full registrar/support endpoints, explicit shared tenant and matching separate feed/support credentials. Secrets are not recorded here.

Ignored .env.vercel-sync files were prepared in UAMS/frontend and student-life-campus-hub, containing only the integration/application overrides and demo authentication disabled. Existing deployed Supabase/session settings still require verification. Local demo flags were preserved. VAPID remains unconfigured.

## Live application state and next steps

Read-only HEAD probes on 22 October returned 404 for the UAMS /api/v1/integrations/hub route and Hub /results route. Updated code is not available at those routes. No application deployment or live sync has been performed in this continuation.

Deployment policy: publish the changes through GitHub pull requests. The maintainers review and merge; their existing Git integration triggers Vercel deployment. Do not deploy directly through Vercel CLI/API or merge on their behalf. Add the prepared private integration settings to the existing Vercel projects before merging, then test authenticated forward and reverse sync using designated test records. Do not claim real-account login, push delivery, financial flows or pilot acceptance without their walkthroughs.

A database password was pasted into chat by the user; rotate it before production use.
