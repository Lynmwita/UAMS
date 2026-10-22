# Persistent announcements and Student Hub synchronization

## Delivered behavior

Institutional UAMS announcement reads, publications and edits now use the UAMS Supabase database. Demonstration users retain a separate in-memory experience; demonstration notices never enter the authenticated integration export.

The dedicated UAMS endpoint is `GET /api/v1/integrations/hub`, authenticated with `Authorization: Bearer <UAMS_FEED_SECRET>`. It exports the version-1 sync contract with an `announcements` array. Existing student/course/timetable integration remains configured separately.

The Hub's existing scheduled/manual sync imports those notices into its existing `announcements` table and student feed. Stable identity is `(university_id, source_system, source_id)`. A transactional database function serializes imports for a university, rejects duplicate source IDs and invalid targets, and ignores already-seen or older source timestamps. Updates retain the Hub announcement UUID and existing read receipts. An unknown campus is an error; it never falls back to university-wide targeting.

UAMS priorities map as follows: Urgent → P1, Important → P2, Normal Campus Life → P3, other Normal → P4. The current UAMS editor supports Students, Faculty & Lecturers, and All Campus. The current export handles these audiences, rather than inventing mappings for legacy school/program-targeted records. Faculty-only changes produce an unpublished, redacted withdrawal record for the Hub. Physical deletion is not the withdrawal mechanism; update the notice with `is_published: false`.

Published UAMS notice edits use `PATCH /api/v1/announcements`, with `id` and the full notice fields accepted by POST. Institutional staff access still passes the server's authenticated role and CSRF checks. UAMS author identity is derived from the authenticated session. Browser users cannot directly write the UAMS announcement table or impersonate imported notices in the Hub.

## Deployment order

1. Apply the additive UAMS migration: `supabase/migrations/20261021211540_persistent_announcements.sql` to the **UAMS** database.
2. Apply the additive Hub migration: `supabase/migrations/20261021211544_uams_announcements_sync.sql` to the **Student Hub** database after its existing migrations. Do not run the UAMS migration on the Hub database.
3. Configure UAMS server variables: its existing Supabase URL and service role key, plus `UAMS_FEED_SECRET` (at least 32 random characters).
4. Configure Hub server variables:
   - `UAMS_SYNC_UNIVERSITY_ID`: the exact destination university UUID in the Hub database. No arbitrary first-university selection is allowed for announcement imports.
   - `UAMS_ANNOUNCEMENTS_API_URL`: `https://<uams-host>/api/v1/integrations/hub`.
   - `UAMS_ANNOUNCEMENTS_API_KEY`: the same credential as UAMS `UAMS_FEED_SECRET`.
   - Its existing Supabase service role key and `CRON_SECRET`.
5. Keep any existing `UAMS_API_URL` / `UAMS_API_KEY` configured for student/course/timetable synchronization. The new feed supplements that source. If only the announcements URL is configured, the Hub imports announcements alone and no demo student records.
6. Deploy both applications. Trigger a dry run, then an authenticated sync through the existing Hub scheduler endpoint. Repeat the same sync: unchanged announcements should produce zero changed records.

Private keys and feed credentials are server-only environment variables. No migration seeds a service account, password or demonstration data. A failed upstream feed or unacknowledged announcement transaction is reported as a failed sync, not a successful local fallback. A timed-out request can have an unknown commit outcome; retrying the same source records is safe.

## Local verification

- UAMS API tests cover actual institutional adapter calls, authorization, validation, database errors, source-record updates, export authentication, redaction and demo isolation.
- Hub tests exercise the real migration SQL using PGlite/PostgreSQL: persistence across database restart, retries, older versions, stable IDs/read receipts, transaction rollback, targeting, RLS and importer privileges.
- Sync tests cover database acknowledgements/errors, dry runs, explicit tenant configuration, compatibility with existing version-1 payloads and supplementary feed composition.
- Live database changes and deployments are separate from these local checks. No live migration or deployment is implied by a passing local build.

Checkpoint: UAMS `npm test` passed 66 tests; Hub `npm test` passed 183 tests. Both projects passed TypeScript and production builds (UAMS: 59 generated pages; Hub: 25). Targeted final adapter/feed tests passed after the last mapping and caching adjustments. The new sync/storage files passed targeted lint with no errors.

## Rollback and limits

Disable the dedicated feed URL or roll back the importer application first. Keep the additive columns, uniqueness constraint and imported rows so read receipts and source identity remain intact. Do not drop the table, delete source IDs, or restore unrestricted browser writes. Import batches are limited to 1,000 announcements; larger catalogs require pagination before enabling them.

This increment persists announcements. Staff, admissions, structure, course registrations, grades, events and finance demonstration stores still require their own institutional adapters and migration work. It does not claim that all UAMS modules have been migrated.
