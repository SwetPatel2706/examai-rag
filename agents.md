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

## Walkthroughs (required after every completed task)
At the end of every implementation, refactoring, bug-fix, review-response, or
configuration task, create a concise learning/reference walkthrough for the
completed conversation/session. Store it in `backend/Walkthrough/` as a Markdown
file before handing the task back to the user. The walkthrough is part of the
task deliverable, not an optional progress note.

Use the phase and sequence already present in `backend/Walkthrough/`:

- The main task that builds or implements a phase uses `.0` and a descriptive
  scope: `Phase 1.0 Walkthrough — Authentication, Data Model, and Subject Access.md`.
- Later fixes, refactors, or CodeRabbit/review follow-ups for that phase use the
  next available sequence: `Phase 1.1 fixes Walkthrough.md`, then
  `Phase 1.2 fixes Walkthrough.md`, and so on.
- A new phase starts at `.0` (for example, `Phase 2.0 Walkthrough — <scope>.md`).
- Before choosing a number, inspect the directory and continue the next
  available sequence for the relevant phase. Do not overwrite an existing
  walkthrough; retain existing historical naming even if it predates this `.0`
  convention.

Each walkthrough should help the user learn, revisit, or teach the work to
someone else. At minimum, cover the task goal and outcome, important design or
implementation decisions, the files/modules changed and why, tests or checks
run with their results, notable pitfalls or lessons, and any follow-up work or
known limitations. Link to relevant repository files with repository-relative
paths when useful. Keep the explanation accurate to the work actually completed
in that session; do not claim checks or changes that were not performed.

## Repo/monorepo conventions
- `/frontend` — React + Vite
- `/backend` — FastAPI, routes thin, logic in `app/services/`
- Ingestion is its own sub-package under backend services (parser → chunker →
  embedder → pipeline) — validated pattern from practice projects, reuse as-is.
- Keep `schemas/` (Pydantic) separate from `models/` (SQLAlchemy).
