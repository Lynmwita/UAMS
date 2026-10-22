# UAMS API gateway

This Node/Express service provides a separately deployable API entry point for UAMS. It forwards `/api/v1/*` to the canonical Next.js API service configured by `UAMS_API_ORIGIN`. Authentication, role checks, validation and database transactions run in that service; the gateway has no independent student/grade/finance records or demonstration login implementation.

Run the API application in `../frontend` first, then `npm ci && npm start` here. Configure `UAMS_API_ORIGIN` and the comma-separated `CORS_ORIGINS` allowlist. Remote production origins require HTTPS. Keep the gateway and canonical service on private infrastructure where possible; expose one public origin through the deployment ingress so session cookies and CSRF checks match.

`GET /api/health` probes canonical readiness. Upstream failures return 503, and HTTP error statuses are preserved. Bodies are bounded, redirects are not followed, upstream cookies and PDF attachment headers are preserved, and client-supplied proxy identity is discarded.

The deployment has browser UI, a canonical server API/domain layer, and PostgreSQL. The gateway is optional ingress; it does not imply that business logic has been copied into a second Node implementation. See `../docs/PROJECT_COMPLETION.md` for full-project verification state.
