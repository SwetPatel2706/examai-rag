# ExamAI — Agent Guide (Root)

## What this is
AI-powered exam prep platform. Students ask questions (RAG) over teacher-approved
materials, take teacher-authored quizzes, and study AI-generated flashcards.
Teachers upload materials, author/generate quizzes, and monitor class performance.

Final-year capstone. Reporting deadlines: R1 (done, 11/7) · R2 Analysis & Design
(8/8/2026) · R3 Progress Demo (22/8/2026) · R4 Final Demo (26/9/2026) · Final
Submission (1–10/10/2026). Strategy: keep a stable conservative version ahead of
each deadline; real work runs ahead of it.

See `frontend/agents.md` and `backend/agents.md` for domain-specific detail.
UI/visual detail (design tokens, component styling, screen layouts) lives in
Google Stitch exports, not here — this doc covers structure and behavior only.

## Stack
FastAPI · React + Vite · Gemini · Qdrant Cloud · Supabase (Postgres/Auth/Storage) ·
local sentence-transformers · Render.com deployment.

## Core architectural decision (post Review-1)
Materials are **teacher-owned, not student-owned**. A subject can have multiple
teachers. Students never upload for RAG — they select which already-approved
materials (by which teachers) scope their chat/flashcard generation, adjustable
per session. Every RAG answer must carry enough metadata to trace each cited
chunk back to its source teacher + material, so a student with doubts knows
who to contact. Contacting the teacher is out of scope — we only need to
surface *who and what*.

Quizzes are **shared, not personalized** (Phase 1 default): a teacher authors
one quiz per topic (manually or AI-assisted from materials), all students in
that subject take the same quiz. This gives teachers class-wide comparability
and enables the class-wide Analytics/Student Progress views. Student-generated
personal quizzes are explicit v2 scope — do not build in Phase 1–3.

Flashcards are **student-generated, personal**, from the student's own selected
materials — no fairness constraint applies (not graded/comparative), so no
teacher-authoring step needed here.

## Roles
Two roles: `student`, `teacher`. Users are provisioned only through an explicit seed operation. Runtime auth supports email/password login and logout; there is no signup, forgot-password/reset, OAuth, magic-link, MFA, or client role selector. The backend derives the role from the seeded user profile.
No admin role in scope yet.

## Data entities (cross-cutting, see backend/agents.md for schema detail)
`users` (role) · `subjects` (many teachers per subject) · `materials`
(teacher-owned, subject-scoped) · `student_material_selection` (per-session,
not persisted as permanent scope) · `quizzes` (teacher-authored, subject-scoped)
· `quiz_attempts` (per student) · `flashcard_decks` (per student, generated)

## Explicitly out of scope (deferred or dropped)
- Student-generated quizzes → v2
- In-app teacher↔student messaging / broadcast → not discussed, do not build
- PYQ frequency analysis, personalized study planner → removed before Review 1
- Any "dark mode telemetry" / alternate analytics theme → design drift, ignore
  if it appears in old Stitch exports

## Known open items (carry into Phase 0–1 work)
- Confirm current valid Gemini model name before building — `gemini-1.5-flash`
  previously 404'd in practice projects; verify what's live before assuming.
- Qdrant collection strategy: **single collection, metadata-filtered**
  (`material_id`, `teacher_id`, `subject_id` on every vector payload) — not
  per-run wipe/recreate. This is now load-bearing for the material-selection
  and citation-attribution features, not just a nice-to-have.
- Decide whether hybrid (dense+sparse) search is Phase 1 or deferred.

## Repo/monorepo conventions
- `/frontend` — React + Vite
- `/backend` — FastAPI, routes thin, logic in `app/services/`
- Ingestion is its own sub-package under backend services (parser → chunker →
  embedder → pipeline) — validated pattern from practice projects, reuse as-is.
- Keep `schemas/` (Pydantic) separate from `models/` (SQLAlchemy).
