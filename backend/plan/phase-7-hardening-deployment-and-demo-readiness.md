# Phase 7 — Hardening, Deployment, and Demo Readiness

## Goal

Turn the integrated build into a repeatable, safe release for the capstone demos and final submission. Prioritize reliability, security, observability, recoverability, and a stable demo dataset over speculative features.

## Already done

- The target deployment platform is Render.com and the core external services are selected.
- Earlier phases define ownership, role gates, source attribution, error envelopes, service boundaries, and frontend integration behavior.
- The root guide provides milestone dates and requires a conservative stable version ahead of each deadline.

## Not to be done in this phase

- Do not expand scope with student-generated quizzes, messaging, planner, PYQ analysis, admin, or telemetry.
- Do not make destructive schema/vector changes on the demo environment without a backup and rollback plan.
- Do not log access tokens, service keys, raw private files, or unrestricted personal data in production.
- Do not rely on a live internet demo with no seeded fallback data or documented recovery path.

## Work items

1. Add unit, integration, API contract, ingestion fixture, authorization, and end-to-end tests. Mark external-service tests and provide deterministic fakes for CI.
2. Run dependency/security checks, secret scanning, type/lint checks, database migration checks, and production frontend build checks.
3. Add request IDs, structured logs, latency/error metrics, safe model/Qdrant failure messages, and an operator health view.
4. Review upload limits, MIME/content validation, filename/path sanitization, signed URL expiry, CORS, rate limits, SQL injection protections, and authorization on every resource.
5. Tune slow paths: embedding model warmup, Qdrant timeout/retry, batch sizes, Gemini retry limits, SQL indexes, pagination, and aggregate queries.
6. Define Supabase database/storage backup and restore expectations. Document Qdrant collection recreation/reindex procedure without using it during normal requests.
7. Deploy backend and frontend to staging first. Configure Render environment variables outside the repository, set the frontend API URL, configure Supabase redirect/CORS URLs, and test real service quotas.
8. Prepare a seeded demo dataset: at least two teachers on one subject, one student, multiple materials/types, one manual quiz, one AI-assisted draft, attempts, flashcards, analytics, and an intentional failed ingestion.
9. Freeze a tagged stable build before each reporting milestone. Record known issues, demo credentials/location, reset instructions, and a short happy-path runbook.

## Release acceptance

- A fresh deployment starts with migrations applied, health checks passing, and no secret leakage.
- Teacher upload → ingestion → student scoped chat citation works on staging.
- Manual quiz → publish → student attempt → analytics/progress works on staging.
- Failure modes show actionable user messages and leave recoverable records.
- A rollback or redeploy can restore the last stable demo version without deleting user data.

## Exit criteria

The team has a tested staging/production deployment, a repeatable demo dataset and runbook, documented restore/reindex procedures, and a stable tagged build suitable for the next capstone milestone.
