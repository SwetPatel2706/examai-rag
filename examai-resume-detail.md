# ExamAI — Project Detail for Resume Generation

> Purpose: this file is the machine-readable/agent-consumable source of truth
> about the ExamAI capstone project. It contains **project facts only** (no
> personal/education data — the resume builder agent supplies that). Use the
> quantified claims here to build resume bullets. Every claim is verifiable in
> the repository (`README.md`, `agents.md`, `backend/README.md`,
> `backend/Walkthrough/`, `backend/plan/`).

## 1. One-line summary

ExamAI is a full-stack, AI-powered exam-prep platform where students ask
questions over teacher-approved study materials (retrieval-augmented
generation / RAG), take teacher-authored shared quizzes, and study
AI-generated flashcards — while teachers upload materials, author/generate
quizzes, and monitor class performance through analytics dashboards.

## 2. Project type & timeline

- **Type:** Final-year university capstone project (sole developer / project
  owner).
- **Delivery milestones (2026):**
  - R1 — requirements review: 11/7 (done)
  - R2 — analysis & design: 8/8
  - R3 — progress demo: 22/8
  - R4 — final demo: 26/9
  - Final submission: 1–10/10
- **Development strategy:** stable conservative build kept ahead of each
  deadline; feature work runs ahead of it. Delivered in 8 feature phases
  (Phase 0 foundations → Phase 7 hardening) with documented design decisions,
  walkthroughs, and integration plans in `backend/plan/`.

## 3. Tech stack

**Backend** — Python 3.14, FastAPI, SQLAlchemy 2 (async-agnostic sync ORM),
Alembic migrations, Pydantic v2 (schemas separate from models), Postgres via
Supabase.

**Frontend** — React 19, Vite 8, React Router 7 (lazy route-splitting),
Zustand (state), Tailwind CSS v4 + shadcn/base-ui primitives, Google Stitch
design exports as the visual source of truth.

**AI / retrieval** — Google Gemini (structured JSON output with
error-aware retry), Qdrant Cloud vector DB (single collection, metadata-filtered
retrieval), local `sentence-transformers` (`all-MiniLM-L6-v2`) embeddings.

**Auth / storage / infra** — Supabase Auth (email/password, no self-signup;
users are seeded), Supabase Postgres, Supabase Storage (private teacher material
bucket), Render.com deployment (FastAPI), Vite static build.

## 4. Architecture highlights (resume-worthy)

- **Teacher-owned material model:** materials belong to a teacher and are
  scoped to a subject (multiple teachers per subject). Students never upload —
  they select from already-approved materials per session. Every RAG citation
  traces back to the source teacher + material so students know who to ask.
- **Attributable RAG chat:** Qdrant payloads denormalize `teacher_name`,
  `filename`, `material_id`, `source_locator` (page/slide/paragraph). Retrieval
  is pre-filtered by Postgres authorization (subject + ready-status + teacher
  membership), then Qdrant filters both `subject_id` and `material_id`
  (defence-in-depth). Answers carry numbered citations resolved back to source
  teacher/material — every citation must include teacher name + filename.
- **Shared, not personalized, quizzes (Phase 1):** one teacher-authored quiz per
  topic; all students in a subject take the same quiz → class-wide comparability
  and analytics. Server-side grading with per-question feedback, weak-topic
  detection, and idempotent attempt submission. Student-generated personal
  quizzes are explicit v2 scope.
- **Student-owned flashcards:** generated per student from their own material
  selections; no fairness/grading constraint, so no teacher-authoring step.
- **Separate analytics read models:** `quiz_analytics` (per-quiz accuracy
  heatmap, grade distribution A–F, weak topics) and `student_progress`
  (cross-quiz per-student roster, avg score, completion ratio, last active,
  at-risk flagging) — deliberately not merged.
- **Secure auth session:** access token kept in memory only (never
  `localStorage`); refresh token is an HttpOnly cookie scoped to `/api/auth`
  with rotation; on 401 the API client does one silent refresh + replay before
  redirecting to login. Schema enforcement on Supabase refresh responses
  (malformed/non-JSON payloads rejected as upstream errors).
- **Concurrent ingestion safety:** parse → chunk → embed → Qdrant upsert runs
  under per-material striped locks + `SELECT … FOR UPDATE` guards + version-safe
  conditional status `UPDATE`s, so upload/retry/delete cannot resurrect stale or
  deleted rows. Blocking pipeline calls are offloaded to a threadpool
  (`asyncio.to_thread`) so the event loop keeps serving other requests.
- **Frontend performance:** route-level code splitting + intentional
  navigation prefetching (hover/focus/pointer), safe-GET API caching with
  freshness bounds and concurrent request deduplication, persistent layouts,
  debounced search, loading skeletons and stale-response handling — measured in
  `frontend/docs/performance-run.md`.

## 5. Features (by role)

**Student**
- Login (email/password; role returned by backend; no signup).
- Home dashboard with enrolled-subject cards + quick stats.
- Subject overview: teacher avatars (multi-teacher aware), materials grouped by
  teacher, subject quizzes, subject-scoped progress.
- RAG chat with a subject switcher and a collapsible, per-session
  "materials scope" panel (materials grouped by teacher, checkbox selection).
  Inline numbered citations with teacher-name + filename tooltips.
- Available quizzes (published, teacher-authored only), quiz-taking with time
  limit, and personal results (own score + own weak topics).
- Flashcard decks list, generate-new-deck (reuses the same material-selection
  UI), and flip-card study with self-assessment (Still Learning / Got It).

**Teacher**
- Home dashboard: class overview stats.
- Materials: upload (PDF/PPTX/DOCX, 25 MiB cap), ingestion status polling
  (processing → ready/failed), retry, delete, metadata edit; collaborative
  subject view shows co-teachers' materials (read-visible, not co-editable).
- Quiz authoring: manual form **and** AI-assisted generation from ready
  materials, draft-then-edit → publish.
- Analytics: per-quiz accuracy heatmap, grade distribution, weak topics.
- Student Progress: cross-quiz roster with at-risk flags + per-student drill-down.

## 6. Quantifiable facts (use these in resume bullets)

- **82 backend tests** (pytest, fully offline, ~0.8 s) + **63 frontend tests**
  (Vitest + Testing Library) — both green.
- **8 feature phases** (0–7) with design docs in `backend/plan/` and **27+
  session walkthroughs** in `backend/Walkthrough/`.
- **~50+ API endpoints** across auth, subjects, materials, chat, quizzes,
  flashcards, analytics, health, me. Standardized response envelope
  (`StandardResponse`) with request-id + timing headers on every response.
- **Seed dataset:** 30 users, 4 subjects, 14 materials, 12 quizzes, ~90 quiz
  attempts, 14 flashcard decks — realistic grade spread incl. at-risk flags.
- **4 code-health cleanup levels** completed (dead-code removal → consolidation
  → quality polish → remaining-debt pass): removed 8 unused imports, dead stub
  routes, unused shadcn components, deprecated FastAPI patterns; centralized
  3 duplicated retry helpers into one; introduced `asyncio.to_thread` for
  blocking ingestion; fixed 11→0 frontend lint warnings.
- **Ingestion pipeline:** word-level sliding-window chunking for PDFs (400
  words / 50 overlap), multi-slide windows for PPTX (2 slides / 1 overlap) with
  visual reading-order sorting (top, left), title-preserving sparse slides.
- **AI reliability engineering:** Pydantic schema doubles as the LLM prompt
  spec; error-aware structured-output retry (verbatim error + bad response +
  schema) fixed generation failures on attempt 2; guardrails for markdown code
  fences, trailing prose, wrong field types, short option lists.
- **Security hardening:** CORS allow-list + explicit methods/headers (no
  wildcards with credentials), `REJECT_*` env-var validation (TODO_ placeholder
  and non-HTTPS remote hosts rejected at startup), secrets never echoed in
  health checks, storage_path never serialized to clients, role + membership
  authorization enforced in services (not just routes).

## 7. Engineering practices demonstrated

- Migrations via Alembic with forward + downgrade (initial schema → seed-key
  constraints → time-limit & unique-attempt constraints).
- Routes kept thin; business logic in `app/services/`; Pydantic schemas
  separate from SQLAlchemy models.
- Feature-phase planning docs + mandatory per-session walkthroughs (learning
  artifacts for the author).
- Regular cleanup/debt-reduction passes gated by the test suite.
- Performance measured, not assumed (documented run procedure + before/after
  numbers).

## 8. Repository map (for quick reference)

```
agents.md                     # root architecture/behavior guide
backend/agents.md             # backend domain guide
frontend/agents.md            # frontend guide
backend/plan/                 # phase + cleanup design docs
backend/Walkthrough/          # 27+ session walkthroughs
backend/app/                  # FastAPI app (routes thin, logic in services/)
  models/ schemas/ routes/ services/ utils/ auth/ db/
backend/migrations/           # Alembic
backend/tests/                # 82 pytest tests
frontend/src/                 # React app
  api/ components/ pages/ store/ lib/ test/
frontend/docs/performance-run.md
examai-resume-detail.md       # this file
```

## 9. Suggested resume angle

Strong full-stack capstone with depth in: **retrieval-augmented generation
with attribution**, **Python/FastAPI + Postgres + vector-DB architecture**,
**React performance engineering**, and **AI reliability patterns** (structured
output, retries, schema-as-prompt). If the resume targets backend/AI roles,
lead with the RAG + FastAPI + Qdrant + Gemini work; if frontend, lead with the
measured performance work and caching system.
