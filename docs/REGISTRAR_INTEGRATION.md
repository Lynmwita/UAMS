# Registrar and support integration

The registrar endpoint is `GET /api/v1/integrations/hub`. It reads institutional tables and views exclusively, and returns students with authoritative enrollment status, courses, timetable slots, grades, events, semester ranges, registration deadlines, exams and announcements. Draft or withdrawn results/notices carry `is_published: false`; stable source IDs and timestamps make repeat imports safe. Departmental events export a restricted unpublished placeholder so previously public events can be withdrawn without disclosing their contents.

Apply the UAMS institutional workflow/support migrations and Hub migrations, including `20261021214455_uams_academic_and_support_sync.sql`, before enabling the scheduler. Schema changes are additive. Do not discard source identifiers, source timestamps or delivery receipts on rollback; stop scheduling and retain these records for replay.

Set server-only UAMS variables:

- `UAMS_FEED_SECRET`: at least 32 random characters.
- `UAMS_FEED_CAMPUS_CODE`: the actual Hub campus code for this UAMS timetable deployment; required when exporting timetable rows because UAMS timetable rows do not carry campus IDs.
- `HUB_SYNC_API_KEY`: a separate secret of at least 32 random characters for receiving support reports.
- `HUB_UNIVERSITY_ID`: the exact destination Hub university UUID.
- The institutional Supabase URL and service role key.

Set server-only Hub variables:

- `UAMS_API_URL`: the full HTTPS registrar endpoint URL.
- `UAMS_API_KEY`: the UAMS `UAMS_FEED_SECRET` value.
- `UAMS_SYNC_UNIVERSITY_ID`: the exact university UUID from the Hub database. No university is selected implicitly in production.
- `UAMS_SUPPORT_API_URL`: the full HTTPS `/api/v1/integrations/hub/support` endpoint URL.
- `HUB_SYNC_API_KEY`: the matching UAMS reverse-sync secret.
- `CRON_SECRET`: the scheduler bearer credential and the Hub Supabase service credentials.

Existing `UAMS_ANNOUNCEMENTS_API_URL` / `UAMS_ANNOUNCEMENTS_API_KEY` configurations remain supported. When that endpoint returns the full registrar export, its populated registrar collections are imported too. Avoid configuring two different authoritative feeds for the same collection.

Schedule authenticated `POST /api/sync/uams` on the Hub. An empty request body fetches the configured feed. A malformed upstream feed or an unacknowledged database operation fails the run. There is no production fallback to demonstration student records. A partial core import can be replayed: course, membership and timetable identities upsert safely; academic batch imports are transactional. Production history reads durable tenant-scoped sync runs and requires staff authentication.

Enrollment changes affect verification only when an explicit status and newer source timestamp are present. Missing students in an export do not revoke memberships. Suspended, withdrawn and graduated enrollment disables verified access. Registrar imports cannot overwrite existing staff memberships.

Timetable entries from UAMS carry stable source IDs and timestamps. Moving a class to a different day or start time updates the same Hub row; stale retries cannot restore the old slot. Older external SIS payloads without source metadata retain their existing slot identity behavior.

Reverse sync exports help requests, identified pilot feedback and event attendance in batches of at most 100. The receiver preserves staff review fields while updating source fields. The Hub records receipts only after the entire batch is acknowledged. Even an empty batch polls staff outcomes and updates ticket resolution notes and feedback reviews. Sensitive tickets send only a restricted pointer, with `is_sensitive: true`; the case content stays in the Hub assigned-case workflow.

Event attendance is a student self check-in, marked as such in source metadata. Only verified members can check in, from 30 minutes before a published event until its end. The database stamps check-in times and prevents students from editing or deleting the report. Staff can review these reports in the UAMS inbox.

After activation, validate with non-production institutional accounts: publish a notice and result; resync twice; update and withdraw both; change enrollment active → suspended → active; send a help request and review it in the UAMS support inbox; resync and confirm the student's resolution notes. Check the real durable sync status for failures. Keep all secrets server-side.

Local verification includes PostgreSQL tests for transactional source upserts, stale update rejection, publication withdrawals, grade owner/tenant RLS and authoritative enrollment freshness, plus API contract and reverse-delivery acknowledgement tests. Live activation and external delivery require the deployment's real credentials and migrations.
