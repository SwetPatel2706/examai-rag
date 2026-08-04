# ExamAI Requirements Needed From the Team

This document lists what must be supplied or decided before the implementation can be built, tested, and deployed. It is ordered by necessity. Secrets must be shared through a password manager or the deployment dashboard—not committed to Git, pasted into chat, or placed in `.env.example`.

## 1. Decisions and access that block implementation

### 1.1 Product decisions to confirm

- Confirm the two-role model: `student` and `teacher`; no admin role for the current release.
- Confirm that materials are teacher-owned, subject-scoped, private at the source-file level, and read-visible to co-teachers/students only where subject access allows.
- Confirm that material selection is request-time only and is sent with every chat/flashcard request.
- Confirm Phase 1–3 quizzes are shared teacher-authored quizzes. Student-generated personal quizzes remain v2.
- Confirm supported uploads: PDF, PPTX, and DOCX; provide maximum file size and any page/slide limits.
- Confirm the quiz rules: number of attempts, retakes, time limits, whether a published quiz is immutable, and whether unanswered questions are allowed.
- Confirm the first at-risk rule for Student Progress. A conservative initial rule can be used, but it must be approved and documented.
- Confirmed authentication scope: users are provisioned only by an explicit seed operation. Runtime signup, user creation, forgot-password/reset, OAuth, magic links, MFA, and other account flows are out of scope. Users log in with email/password and log out; the backend derives the role from the seeded profile.
- Confirm the canonical public frontend and backend URLs, allowed origins, and whether a custom domain is required.
- Confirm the target milestone for the first stable vertical slice and the staging/demo date. The nearest documented milestone is R2 on 8 August 2026.

### 1.2 Repository and deployment access

- Git repository write access for the implementation account.
- Render project/service access if deployment is expected from this workspace.
- Supabase project owner/developer access.
- Qdrant Cloud cluster access.
- Google AI Studio or Google Cloud access for Gemini credentials and quota/billing.
- A safe channel for receiving secrets and a named person who can rotate/revoke them.

## 2. Required runtime and local development setup

- Python version selected and installed consistently; Python 3.11 or 3.12 is recommended for the FastAPI stack.
- Node.js 20.19+ or 22.12+ and npm, as required by the current Vite setup.
- Git and a clean working copy of the repository.
- Enough disk/RAM for the local `sentence-transformers` model `all-MiniLM-L6-v2`; first use downloads model files unless they are pre-cached.
- Ability to make outbound HTTPS calls to Supabase, Qdrant Cloud, and Gemini during integration tests.
- Optional local tools: Docker for disposable Postgres/test services, a PDF/PPTX/DOCX fixture viewer, and a browser for smoke testing.

## 3. Required services and credentials

Create the services first, then supply the values through local `.env` and Render environment settings.

### 3.1 Supabase

Create one project with Postgres, Auth, and a private Storage bucket.

| Variable | Required use | Where to get it |
|---|---|---|
| `SUPABASE_URL` | Supabase API/Auth/Storage base URL | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Public client key; may be used by a controlled backend client flow | Supabase Dashboard → Project Settings → API → publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend-only privileged Storage/admin operations | Supabase Dashboard → Project Settings → API → service-role key; never expose to Vite |
| `DATABASE_URL` | SQLAlchemy/Postgres migrations and queries | Supabase Dashboard → Connect → connection string; select the appropriate direct or pooler URL and driver format |
| `SUPABASE_STORAGE_BUCKET` | Private bucket for teacher source files | Create in Supabase Storage, then supply its exact name |
| `SUPABASE_JWT_SECRET` or JWKS configuration | Token verification, depending on the chosen Supabase verification method | Supabase Dashboard → Project Settings → API/Auth; choose one verification strategy and document it |

Also required:

- Enable Supabase email/password sign-in and disable public signups. No runtime account-creation route is permitted.
- Seed the non-production accounts explicitly; do not run the seed automatically at application startup or deployment.
- Apply database policies/migrations deliberately. Backend service-role access does not replace application authorization checks.
- Confirm database timezone/connection pooling behavior for Render.

### 3.2 Qdrant Cloud

| Variable | Required use | Where to get it |
|---|---|---|
| `QDRANT_URL` | HTTPS endpoint for the single collection | Qdrant Cloud cluster dashboard → endpoint URL; include `https://` |
| `QDRANT_API_KEY` | Authenticated vector operations | Qdrant Cloud cluster/API keys |
| `QDRANT_COLLECTION` | Stable collection name, e.g. `exam_materials` | Team decision; create once through provisioning code |

Confirm the free-tier quota, cold-start behavior, region, and whether the staging cluster is separate from production. Do not use a per-request collection or a wipe/recreate workflow.

### 3.3 Gemini

| Variable | Required use | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | Backend-only Gemini calls | Google AI Studio API key or approved Google Cloud credential flow |
| `GEMINI_MODEL` | Explicit live model name | Verify in the current provider model list/API; do not assume `gemini-1.5-flash` |

Confirm quota, rate limits, billing status, structured-output support, safety settings, and whether raw development logging is permitted for the supplied sample material. The implementation should not proceed on an unverified model name.

### 3.4 Frontend and application configuration

| Variable | Required use | Where to set it |
|---|---|---|
| `VITE_API_BASE_URL` | Browser base URL for FastAPI | Local `frontend/.env.local` and frontend deployment settings |
| `APP_ENV` | `local`, `staging`, or `production` behavior | Backend local `.env` and Render environment |
| `CORS_ORIGINS` | Allowed browser origins | Backend `.env`/Render settings; list exact local and deployed URLs |
| `LOG_LEVEL` | Development/production logging level | Backend `.env`/Render settings |
| `MAX_UPLOAD_BYTES` | Upload protection limit | Backend `.env`/Render settings after team confirms policy |
| `EMBEDDING_MODEL` | Local embedding model name | Default to `all-MiniLM-L6-v2` unless the team approves a dimension-changing alternative |
| `RAG_TOP_K` | Number of retrieved chunks | Team-tuned config; start with 3–5 and verify context quality |
| `QDRANT_TIMEOUT_SECONDS` | External vector timeout | Start at 60 seconds for free-tier cold starts |

The exact final settings class may group or rename these values, but the chosen names must be recorded in the backend `.env.example` and deployment runbook.

## 4. Test accounts and representative data

Create the non-production accounts through the explicit seed script (or supply already-seeded accounts):

- One teacher account with a display name.
- A second teacher account who shares at least one subject with the first teacher.
- One student account enrolled in that shared subject.
- At least one subject and its teacher memberships.
- Several representative files: one PDF, one PPTX containing multi-shape slides and a title-only/sparse slide, and one DOCX.
- Material metadata expectations: filename, teacher, subject, and which files should be ready/failed.
- At least one manual quiz and one topic suitable for AI-assisted draft generation.
- A small set of quiz attempts that exercises zero attempts, perfect/low scores, weak topics, and at-risk/non-at-risk students.
- A few expected chat questions with the source material/chunk that should be cited.
- A seed/reset policy for demos so test data can be reproduced without deleting production data.

Do not use real student educational records or copyrighted/private materials without permission. Redact sensitive content before supplying fixtures.

## 5. Acceptance criteria and test expectations

Agree that the following are release blockers:

- Wrong-role or wrong-subject access succeeds.
- A client-selected role can override the role stored for the authenticated user.
- A runtime route or public Supabase flow can create a new user.
- A citation lacks `teacher_name`, `material_filename`, or `material_id`.
- A chat answer uses a material outside the request's selected IDs.
- Student material selection becomes a permanent server-side setting.
- Student-generated quiz or messaging functionality is added to Phase 1–3.
- An AI-generated quiz is published without teacher review.
- Ingestion reports `ready` after parser, storage, embedding, or Qdrant failure.
- A student can read another student's deck, attempt, or result.
- Secrets appear in source, logs, frontend bundles, or error responses.

Approve the definition of done for each phase in the corresponding plan file, including unit tests, authorization tests, integration tests, and browser smoke tests.

## 6. Operational and deployment requirements

- Render service type, build/start commands, health-check path, region, instance size, and free-tier limitations.
- Render environment variables configured outside Git.
- Frontend hosting choice and its build/output settings.
- Supabase Auth email/password settings and CORS updated for local, staging, and production.
- Storage retention/deletion policy and signed URL expiry.
- Database backup/restore owner and schedule.
- Qdrant reindex procedure if the embedding model or payload schema changes.
- Gemini quota monitoring and a fallback/demo behavior for provider outage.
- Error monitoring destination, log retention, and who receives alerts.
- A release tag/rollback policy before each capstone milestone.

## 7. Useful but non-blocking skills, MCPs, and tools

No additional plugin is required to start the implementation; the repository guides and current workspace are sufficient. These are optional accelerators after the required access above is ready:

- `vercel-react-best-practices` for reviewing React integration/performance while mocks are replaced.
- `browser:control-in-app-browser` for repeatable in-app browser smoke tests against local/staging builds.
- `pdf:pdf` for inspecting/rendering PDF fixtures and validating ingestion outputs.
- A GitHub connector/plugin for PR review, CI triage, and publishing changes if the team wants the workflow managed through GitHub.
- A Supabase, Qdrant, or deployment connector only if the team wants external dashboards operated through Codex; direct dashboards remain sufficient.

These tools do not replace the core requirements: service credentials, representative fixtures, accepted contracts, test accounts, and a deployment target are the actual blockers.

## 8. What can be assumed if no further preference is supplied

- Dense-only retrieval in Phase 1–3; hybrid sparse retrieval is deferred.
- UUIDs, UTC timestamps, private storage, server-side authorization, and a single Qdrant collection.
- Email/password login and logout only; user accounts are created exclusively by an explicit seed operation, and roles are derived server-side from seeded profiles.
- `all-MiniLM-L6-v2` embeddings and Qdrant `query_points()` with metadata filters.
- Manual quiz publishing remains available even if Gemini is unavailable.
- The first demo uses seeded non-production accounts and fixtures.
- Any missing optional visual asset is omitted or represented by the existing gradient/icon treatment; it is not a reason to block backend delivery.
