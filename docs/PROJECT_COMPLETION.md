# Project completion workboard

Scope: UAMS, Student Life & Campus Hub and their integration. Local implementation and live activation are separate acceptance gates.

| Work item | Owner | State | Evidence |
| --- | --- | --- | --- |
| Institutional academic/admin storage and scope | uams_persistence | verified locally | Real PostgreSQL workflow tests, active identity checks, scoped adapters and institutional dashboard; UAMS89 suite/type/build pass |
| Finance | uams_persistence | verified locally | Atomic deposits/M-Pesa, duplicate protection, invoice allocation and credit carry-forward tests |
| Transcript | root | verified locally | Approved actual-period results and privacy tests; browser downloaded Academic_Transcript_BIT-2023-8849.pdf |
| UAMS to Hub | campus_sync | verified locally | Enrollment, result/event/date withdrawal, stable moved timetable identity, tenant/privacy database and contract tests |
| Hub to UAMS | campus_sync + root | verified locally | Versioned transactional support import, receipts, staff outcomes, source retry/history and sensitive-record tests |
| Calendar/clubs/check-in | hub_features + campus_sync | verified locally | Durable participation/RLS; browser desktop and390px mobile views |
| Offline/low data | hub_features | verified locally | Account-specific opted-in snapshots,24h expiry, logout purge and service-worker privacy tests |
| Browser push | hub_features | implemented; live delivery pending | Persisted preferences, eligible tenant recipients, allowlisted endpoints, mocked transport/dedupe/expiry tests; requires VAPID and HTTPS permission walkthrough |
| Pilot feedback | hub_features + root | implemented; human pilot pending | Persisted feedback and review RLS tests; browser form and admin review UI; institution must run pilot |
| Backend boundary | root | verified locally | Runnable canonical-service gateway,14 backend tests; binary/cookie/CORS/outage behavior |
| Security and local acceptance | root | verified locally | UAMS89 + Hub212 + backend14 =315 passing tests; types, final builds, Hub lint0errors; diff checks; browser PDF/inbox/calendar/feedback; core-page unavailable/stale states and neutral identity checked |
| Live activation | root + project owner | blocked on project access/configuration | Campus project CLI/plugin access unavailable; new REST objects404; deployment settings absent; see LIVE_ROLLOUT.md |

## Browser evidence

Workspace `output/playwright`: UAMS grades/support screenshots and selected-student transcript PDF; Hub desktop/mobile campus calendar and feedback screenshots. The mobile feedback check reports no horizontal overflow. Hub browser console has no errors (font preload warnings only). UAMS unauthenticated login generated expected401 auth checks and an existing favicon404; no new workflow error appeared during transcript/inbox checks.

## Remaining activation work

Reconcile the manually applied SQL with migration history, apply the private Vercel integration configuration, disable production demos, configure VAPID/Auth/provider settings and merge reviewed PRs to trigger deployment. Run the staging acceptance walkthrough, actual browser push/payment/invite delivery tests and human pilot before production sign-off. The project owner applied the SQL manually. No direct Vercel deployment, outbound live message, invitation or payment was performed by the agent. SMS/email queues require a dispatcher.

Rollout branches are published in UAMS PR #7 and Student Hub PR #9. Maintainers review and merge to trigger the existing Git-based deployment. Local test success is not evidence of live activation.
