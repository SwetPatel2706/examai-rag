# Phase 7 Walkthrough — Frontend–Backend Integration (Mock Data → Real API)

## Task goal & outcome
Replaced every frontend mock/hard-coded dataset with live FastAPI calls across
all student and teacher screens, wired auth to role-derived redirects, added
loading/empty/error/retry states, and reconciled
`frontend/Frontend Placeholder & Mock Data Register.md` with a per-screen
Status legend (Resolved / Design-only / Deferred).

Outcome: all 12 screens now talk to the real backend. Verified by a live API
smoke against a running backend (seed data present) for every journey: login →
`/auth/me`, subject list, materials (with teacher attribution), RAG chat with
citations, quizzes list + detail (no answer leak), quiz submit → attempt
round-trip, my-attempts, teacher dashboard stats, quiz analytics,
student-progress roster + drill-down, flashcard decks.

## Decisions & design
- **Test stack:** Vitest + Testing Library with **mocked `fetch`** (jsdom), not
  Playwright. Already installed as devDependencies; `npm run test` (`vitest run`)
  added to `package.json`.
- **Auth:** backend derives role; no client role selector. `Login.jsx` sends
  credentials, backend returns `user.role`, client redirects
  student → `/student`, teacher → `/teacher`. Token persisted in localStorage
  under `examai.auth`; `SessionBootstrap` revalidates via `/auth/me`; a 401 from
  any request clears auth and bounces to `/login?expired=1` with a banner.
- **API layer:** single request wrapper in `src/api/client.js` that unwraps the
  `StandardResponse {success, data, error}` envelope, attaches the bearer
  token, converts backend errors into `ApiError{status, code, message,
  requestId, details}` (network failures get `code: NETWORK_ERROR`), supports
  multipart for upload, and omits empty query params. One thin module per
  resource under `src/api/`.
- **Shared UI states:** `src/components/ui/states.jsx` provides
  `LoadingState` / `EmptyState` / `ErrorState`; `src/lib/useApi.js` is the
  data-fetch hook every screen uses.
- **Key mapping rules (learned by reading the backend, not assumed):**
  - Quiz answers are **option strings keyed by question UUID**; the UI converts
    option indices → option text on submit and parses back on view.
  - Duplicate quiz submission is idempotent — retry returns the existing
    attempt.
  - The student `GET /quizzes/{id}` variant must never leak `correct_option`;
    both `mapQuizSummary` and `getQuiz` leave `correct` as `null`.
  - Chat markers arrive as integers `[1]`; the client renders them as `[1]`.
  - Material upload: subject is chosen **before** upload (multipart
    `file` + `subject_id`); no post-upload PATCH. Status polling via
    `GET /materials/{id}/status` every 4s.
  - Analytics/Progress endpoints were re-verified during integration; the
    roster response nests rows under `data.students`.

## Files/modules changed
Backend (2 real gaps found & fixed during integration):
- `backend/app/routes/materials.py` — list/detail/retry/patch routes now use the
  existing `serialize_material()` so `teacher_name` is populated (the list
  route previously returned `teacher_name: null`, which broke scope-panel
  grouping and the doubt-resolution attribution).
- `backend/tests/test_phase_1.py` — new `test_materials_include_teacher_attribution`
  asserting `teacher_name` on both list and detail responses.
- DB migration `a7c9e5b3d1f4_quiz_questions_seed_key` existed but the local DB
  was behind; applied with `alembic upgrade head` (fixes the live
  `GET /students/me/attempts` `UndefinedColumn` error).

Frontend:
- `src/api/` — `client.js` (envelope/error/token/multipart), `auth.js`,
  `subjects.js`, `materials.js`, `chat.js`, `quizzes.js` (incl.
  submitAttempt/getAttempt/listMyAttempts/mapAttempt), `flashcards.js`,
  `analytics.js`.
- `src/store/authStore.js` (persistence, `setAuth/setUser/clearAuth`),
  `src/App.jsx` (`RequireAuth`, `RequireRole`, `SessionBootstrap`,
  `RedirectIfAuthed`), `src/pages/Login.jsx`, `Sidebar.jsx` logout.
- Shared: `src/lib/useApi.js`, `src/components/ui/states.jsx`.
- Student screens rewired: `StudentDashboard`, `SubjectOverview`, `Chat` (real
  RAG + citation tooltips + subject pills + selection 0-check),
  `Quizzes` (status from own attempts), `QuizTaking` (real getQuiz/submit,
  index→text conversion, timer auto-submit, no sidebar),
  `QuizResults` (attempt state or listMyAttempts fallback, own weak topics),
  `FlashcardDecks` (real decks, generate dialog reuses MaterialScopePanel),
  `FlashcardStudy` (real getDeck/updateCardMastery, no sidebar),
  `StudentMaterials` (server-side subject+search, client-side teacher filter &
  pagination over 100).
- Teacher screens rewired: `TeacherDashboard`, `TeacherMaterials` (upload +
  4s status polling + retry/delete/download), `QuizCreateEdit` (draft/published
  badges, AI generate from ready materials → appended for review),
  `Analytics` (published-quiz selector), `StudentProgress` (roster +
  drill-down, no messaging UI).
- `frontend/Frontend Placeholder & Mock Data Register.md` fully rewritten with
  Status legend and known limitations (3 deferred items: teacher filter
  client-side, pagination client-side, no Material Size field).
- Tests (6 new files, 24 tests): `src/api/client.test.js`, `src/api/chat.test.js`,
  `src/api/quizzes.test.js`, `src/store/authStore.test.js`,
  `src/store/materialScopeStore.test.js`, `src/components/MaterialScopePanel.test.jsx`,
  `src/pages/Login.test.jsx`.
- `frontend/src/test/setup.js` — **localStorage polyfill** (see pitfalls).

## Tests / checks run
- Backend: `./venv/bin/pytest` → **83 passed** (was 77; +5 integration tests for
  my-attempts endpoint, +1 teacher-attribution test).
- Frontend: `npm run test` → **24 passed**; `npm run lint` → passes (warnings
  only, all pre-existing); `npm run build` → 1983 modules, dist 458.55 kB JS.
- Live smoke (uvicorn against seeded Supabase + Qdrant): login, `/auth/me`,
  subjects, materials `teacher_name`, RAG chat with real citations
  (`{teacher_name, material_filename, source_locator}`), quizzes list + detail
  no-leak, quiz submit (score 83, weak_topics) + attempt fetch, my-attempts,
  teacher dashboard-stats, quiz analytics, student-progress roster + drill-down,
  flashcard decks.

## Pitfalls & lessons
- **Node 25 experimental `localStorage`:** the runtime ships a broken,
  method-less `localStorage` stub in test environments, which silently fails
  app code and made every test fail with `localStorage.getItem is not a
  function`. Fixed by installing an in-memory storage on `globalThis` and
  `window` in `src/test/setup.js` before running tests.
- **DB behind migrations:** the local database was at `b8f4a1d9c2e7` while the
  model queried `quiz_questions.seed_key` (migration `a7c9e5b3d1f4`). Symptom
  was a 500 on `/students/me/attempts`. Always run `alembic upgrade head` on a
  shared/stale DB before debugging deeper.
- **`teacher_name` silently missing:** schema documented it as "populated when
  the serialiser has access", but the list route called `model_validate`
  directly. The reusable `serialize_material()` helper existed but was unused —
  don't trust a docstring over the actual serializer path.
- **Analytics/Progress 403s in smoke were correct:** teacher1 isn't registered
  for the DSA subject; pick a subject the teacher actually teaches.
- **Envelope parsing:** several endpoints nest rows under `data.students`
  (roster) vs bare arrays (attempts); the client must match each shape.
- **jsdom navigation warnings** from the 401→redirect test are benign (location
  stub works, virtual console logs are noise).
- Run the backend server detached with `nohup ... &` when smoke-testing from a
  shell tool, otherwise the background process is killed when the session ends.

## Follow-up / known limitations
- 3 Deferred items remain documented in the register (client-side teacher
  filter, client-side pagination, no size field) — acceptable for Phase 1.
- No automated E2E (browser) suite; integration is guarded by the unit tests +
  this manual smoke. A Playwright pass is a possible follow-up.
- Live chat/flashcard generation depend on Qdrant + Gemini being reachable and
  seeded with `--with-rag`; pytest remains fully offline.
