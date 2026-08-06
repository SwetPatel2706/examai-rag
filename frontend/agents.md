# ExamAI — Agent Guide (Frontend)

React + Vite. Visual design (colors, spacing, component styling) comes from
Google Stitch exports — treat those as source of truth for markup/styling,
this file only covers structure, routing, and state behavior.

## Environment — running & testing (read this first)

- Requires Node **20.19+ or 22.12+** (repo currently runs on v25). All
  commands run from `frontend/`.
- `npm install` → install dependencies (node_modules already present).
- `npm run dev` → Vite dev server with HMR on http://localhost:5173.
- `npm run lint` → oxlint static checks.
- `npm run build` → production build into `dist/`; `npm run preview` serves it.
- `npm run test` → Vitest + Testing Library suite (mocked fetch, jsdom). Run
  `npm run lint` + `npm run build` + `npm run test` for the full gate; plus a
  manual browser pass against a live backend.
- The Vite dev server has **no proxy**: the app calls the API directly at
  `VITE_API_BASE_URL` (default `http://localhost:8000`, set in
  `frontend/.env.local`). Start the backend first from `backend/`:
  `./venv/bin/uvicorn app.main:app --reload` (canonical venv is `backend/venv/`;
  see `../agents.md` and `backend/agents.md`).

## Roles & navigation
Login screen with email/password only. Users are provisioned by an explicit seed operation; there is no signup, forgot-password/reset, OAuth, magic-link, MFA, or runtime user creation. The backend returns the user's role and the client uses it for redirects; users do not choose their role.

**Student sidebar:** Home/Dashboard, Chat, Quizzes, Flashcards, Resources/Materials
**Teacher sidebar:** Home/Dashboard, Resources/Materials, Analytics, Student Progress

Note: "Analytics" (per-quiz breakdown: question accuracy, grade distribution,
weak topics for one quiz) and "Student Progress" (roster-style, cross-quiz,
per-student view across all quizzes/subjects, with at-risk flagging and a
drill-down into per-student detail) are two distinct screens — do not merge.

## Screens (student)
1. Login (email/password; role returned by backend)
2. Home/Dashboard — enrolled subjects as cards, quick stats
3. Subject Overview — landing screen when a subject card is clicked. Shows
   teacher avatars (multi-teacher aware), materials grouped by teacher,
   quizzes for the subject, subject-scoped progress. Entry points into
   subject-scoped Chat and filtered Quizzes.
4. Chat/Q&A — sidebar nav "Chat" opens the most-recently-used subject's chat
   directly (no picker screen). A subject switcher lives inside the chat
   screen itself (top of chat window, not in the header bar) to change
   context without navigating away. Includes:
   - inline numbered citation markers `[1]` `[2]` on AI answers, hover shows
     a tooltip with **teacher name + material filename** (both required,
     every citation, no exceptions — this is the doubt-resolution mechanism)
   - collapsible "Materials Scope" side panel, materials grouped by teacher,
     checkboxes, adjustable per-session (not a one-time setup)
5. Available Quizzes — list/cards, teacher-authored only. No student-facing
   "generate your own quiz" entry point in Phase 1–3.
6. Quiz-taking screen
7. Quiz Results (own) — own score, own weak topics only, no classmate data
8. Flashcard Decks — list of decks, "Generate New Deck" reuses the same
   grouped-by-teacher material-selection UI pattern as the Chat scope panel
9. Flashcard Study — single-card flip view, self-assessment (Still Learning /
   Got It), minimal chrome, no sidebar

## Screens (teacher)
1. Home/Dashboard — class overview stats
2. Resources/Materials — upload + manage own materials; list view shows
   "Owner" column since materials from co-teachers on a shared subject are
   visible too (collaborative, read-visible, not co-editable)
3. Quiz Create/Edit — supports **both** manual authoring and AI-assisted
   generation from uploaded materials (draft-then-edit), Phase 1 scope.
   Student-side quiz generation is NOT in scope — do not wire that up even
   if old Stitch exports show a "Generate Custom Quiz" card on the student
   Quizzes screen; that card should be removed/repurposed.
4. Analytics — per-quiz results: accuracy heatmap, grade distribution, weak
   topics, aggregated across the class for one quiz
5. Student Progress — per-student roster across all subjects/quizzes: avg
   score, completion ratio, last active, at-risk flag, drill-down per student.
   Do NOT build in-app messaging/broadcast to students — flagged out of scope.

## State management
Zustand. Suggested slices: `authStore` (role, user), `subjectStore` (current
subject context — shared between Dashboard, Subject Overview, and Chat's
subject switcher), `materialScopeStore` (per-session selected material IDs,
scoped to current subject, resets are NOT persisted server-side).

## API integration conventions
- `src/api/` — one file per backend resource (materials, subjects, chat,
  quizzes, flashcards), thin wrappers, no business logic in the frontend.
- Citation objects from chat responses must always carry `{teacher_name,
  material_filename, material_id}` — if the backend ever omits one, treat it
  as a bug, not an optional field.
- Material scope selections are sent as part of each chat request payload
  (list of `material_id`s), not persisted as a user setting.
