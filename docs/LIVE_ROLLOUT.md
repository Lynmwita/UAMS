# Live rollout and acceptance

**22 October manual rollout update:** the user applied the campus SQL through Supabase SQL Editor. UAMS object checks passed, and all nine checked Hub tables exist with RLS enabled. See [ACTIVATION_CHECKPOINT.md](ACTIVATION_CHECKPOINT.md). CLI migration history has not been reconciled: inspect it before attempting another database push. Application releases must go through PR review and maintainer merge, which triggers the existing Vercel deployment. The following original pre-activation findings are retained as historical context.

The code and local checks do not activate either live campus database. As of 22 October 2026, the connected Supabase plugin exposes an unrelated project and the authenticated CLI exposes only `starphones`. Neither exposes the UAMS or Student Hub project. Read-only REST probes with the existing application credentials returned HTTP 404 for all new UAMS workflow/support objects and Hub academic/support/feedback/push objects; the Hub base `universities` table returned HTTP 200. No migration, deployment, live notification, invitation, payment, or student pilot has been performed by this implementation session.

## Prepare the correct projects

Connect the account that owns both campus projects. Confirm the project reference against each application's existing Supabase URL before linking. Back up the databases and inspect existing migration history/schema. Never apply demonstration seed data to an institution's live database.

UAMS uses the normalized tables from `database/01_schema_init.sql`, security setup from `database/02_rls_policies.sql` and `database/rbac_security_setup.sql`, and extended tables from `database/04_extended_modules.sql`. Review existing installations for those objects before applying missing base SQL. Then apply the timestamped files in `supabase/migrations` in order: persistent announcements, institutional workflows, and support inbox. The workflow migration includes payment-request storage. Existing table definitions must match the expected normalized schema; `IF NOT EXISTS` is not a compatibility migration for a different schema.

Student Hub uses its complete ordered `supabase/migrations` history, followed by the new announcement, feedback/push, academic/support, and `20261021221906_audit_tenant_security.sql` migrations. The final migration protects direct ticket updates and audit tenant boundaries. Use migration history to apply only pending files. Test this complete chain against a restored staging database before production.

## Configure and deploy

See [REGISTRAR_INTEGRATION.md](REGISTRAR_INTEGRATION.md) for the exact feed, support, tenant and scheduler settings. `UAMS_API_URL` must point to the full `/api/v1/integrations/hub` feed. Keep service-role keys, integration keys, JWT secrets, payment/provider credentials, and private VAPID keys server-side. Disable demonstration authentication in production.

Browser push also requires Hub `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (a real `mailto:` contact or HTTPS URL). Include the public key at build time. Configure Supabase Auth redirect URLs, recovery email and invite templates for the actual HTTPS application origins. Set `NEXT_PUBLIC_APP_URL` in UAMS. Operational SMS/email rows are queued; delivery requires a configured provider dispatcher. A queued record is not proof of delivery.

Deploy the two Next applications. The Express service is an optional ingress gateway configured with `UAMS_API_ORIGIN` and `CORS_ORIGINS`; it delegates domain operations to the canonical UAMS application. It does not host a separate copy of institutional data.

From the shared workspace run `node UAMS/scripts/project-readiness.mjs` for configuration checks and add `--online` for zero-row schema probes. The tool reads each app's local environment separately, prints no secrets, and performs no writes. Deployment environments can be checked through scoped `READINESS_UAMS_*` and `READINESS_HUB_*` overrides. These checks do not prove policy correctness, delivery, migration history, or the workflows below.

## Acceptance walkthrough

Use designated staging institutional accounts and records. Record the environment, build, date, actor roles and outcome for every check.

1. Create institutional structure, staff and student records; link/invite authentication; verify active identity and role checks. Confirm students and lecturers cannot administer other departments or grades.
2. Submit an admission, review and admit it, and verify the student record is created once. Register courses, bulk approve within HOD scope, enter/approve a grade, download the correct student's transcript and confirm other students cannot access it.
3. Issue an invoice; record a bank deposit twice with the same reference; verify a single ledger entry and correct outstanding balance/credit. Exercise Daraja sandbox callbacks and reconcile invoices before enabling live payment credentials.
4. Publish a notice, grade, event and calendar/exam date. Run authenticated Hub sync twice. Confirm private grade visibility, event/date rendering, no duplicates, updates/withdrawals and active/suspended/active enrollment transitions. Move a timetable slot and verify the old slot disappears.
5. Submit a Hub help request and pilot feedback, check in during an event, sync, review in the UAMS inbox, and sync again. Confirm the original student sees staff outcomes. Sensitive case contents stay in the assigned Hub workflow.
6. Opt into offline snapshots, load the supported core views, disconnect and inspect the saved view. Check expiry, account changes and logout purge. Confirm authenticated HTML is never stored in a shared service-worker navigation cache.
7. On a supported HTTPS browser, explicitly subscribe to push and choose an urgency preference. Publish a matching notice, verify actual browser delivery and deduplication, revoke permission/remove the subscription, and verify expired subscriptions are retired.
8. Enable the scheduler only after successful manual runs. Confirm durable sync history and retry after an interrupted import. Monitor failed deliveries and provider logs.

Run the pilot with the institution's chosen students and staff, collect feedback through `/feedback`, triage it in the admin panel and record acceptance. The software implements feedback collection and review; the human pilot cannot be claimed complete before it occurs.

For rollback, stop scheduling and external delivery first. Roll back application versions while preserving source identifiers, delivery receipts, financial transactions and review history. Avoid dropping the additive tables to revert an application release.
