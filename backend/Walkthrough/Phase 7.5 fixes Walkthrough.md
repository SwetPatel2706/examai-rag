# Phase 7.5 fixes Walkthrough

## Goal and outcome

Worked through a list of review findings (backend + frontend) covering quiz
attempt pagination, quiz payload correctness, accessibility/robustness fixes
across student and teacher screens, and the auth token-storage hardening that
moves the refresh token out of `localStorage` and into an HttpOnly cookie.

Two findings were verified as already satisfied by the current code and needed
no change; every other finding was fixed. All backend tests (83), frontend
tests (30), lint, and the production build pass.

## Findings verified against current code

### Backend
- **`POST /api/materials`** returned `MaterialResponse.model_validate(material)`
  directly inside the envelope, so the response lacked `teacher_name` (a
  material property the frontend table/owner column relies on). Fixed to use
  the canonical `serialize_material(material)` and dropped the now-unused
  import.
- **`list_own_attempts`** loaded the student's full attempt history with
  `.all()` and no bound, and `GET /api/students/me/attempts` returned a bare
  array. Fixed with `page`/`size` (offset/limit) + a total count, and a
  paginated envelope `{ items, total, page, pages, size }`.
- The ordering test relied on request timing for `submitted_at`; it now pins
  explicit timestamps so the documented `submitted_at DESC, id DESC` contract
  is actually asserted.

### Frontend
- `App.jsx` `RequireRole` called `clearAuth()` in the render path before the
  `<Navigate to="/login">`. Removed — redirecting alone is correct.
- `toQuestionInput` (quiz authoring) sent `q.correct` (a 0-based option
  *index* from the editor) as `correct_option`, but the backend grades option
  *text*. Now resolves the index to the actual option string (non-numeric
  values from AI drafts pass through).
- `states.jsx` decorative icon spans in `EmptyState`/`ErrorState` lacked
  `aria-hidden="true"`.
- `initials()` used `part[0]`, which mis-slices names with astral-plane
  characters (surrogate pair). Now `[...part][0]` (first Unicode code point).
- `Chat.jsx` had no empty-state branch when the student belongs to zero
  subjects. Added.
- `FlashcardDecks.jsx` didn't reset the generation scope when re-opening the
  dialog or switching subject chips.
- `QuizCreateEdit.jsx`: validation didn't require the chosen answer option to
  actually have text; the Publish button's rejection left the error banner
  silent (only `quizzesApi.reload()`).
- `QuizResults.jsx` read `attempt.weakTopics.length` without a fallback.
- `QuizTaking.jsx` routed submission failures into the load-error state (with
  a full-page `window.location.reload` retry); now has a dedicated in-page
  `submitError` banner with a Retry button.
- `StudentMaterials.jsx` fired a server search request on every keystroke;
  debounced via `useDeferredValue`.
- `SubjectOverview.jsx` mapped attempts with `new Map(...)` so an older
  attempt for the same quiz could overwrite the newest one; now keeps the
  newest per quiz.
- `TeacherDashboard.jsx` `timeAgo()` could render `NaN d ago` for a malformed
  date; now returns `—`.
- `TeacherMaterials.jsx` upload zone was clickable with zero subjects, opening
  a dialog that could never upload; now renders disabled with guidance.
- `StudentProgress.jsx` drill-down panel relied on the implicit single grid
  column; made `lg:col-span-1` explicit.

### Auth token storage (highest priority)
- Previously the refresh token was persisted in `localStorage` under
  `examai.auth` — the flagged XSS exposure. Now:
  - Backend `POST /api/auth/login` sets the refresh token as an HttpOnly
    cookie scoped to `/api/auth`; `POST /api/auth/refresh` exchanges it
    (Supabase rotates it, cookie re-issued); logout clears it.
  - Frontend persists only identity (`user`, `role`); the access token is
    memory-only and re-minted from the cookie on reload via `SessionBootstrap`;
    `client.js` sends `credentials: 'include'` and on 401 tries one silent
    refresh + replay before the login redirect.

## Important design decisions

- **Paginated attempts envelope:** quiz attempts are now returned as
  `{ items, total, page, pages, size }`; the frontend `listMyAttempts`
  consumer returns the same shape and the three call sites read
  `attempts.items`. Ordering is `submitted_at DESC, id DESC`.
- **Cookie path-scoping:** `examai_refresh` is sent only to `/api/auth/*`
  (`path="/api/auth"`), `SameSite=Lax`, `HttpOnly`, and `Secure` only in
  production (local dev is plain HTTP).
- **One-refresh replay in `client.js`:** a module-level in-flight guard
  collapses concurrent 401s into a single refresh; the replay is safe because
  an expired/revoked token means the original request never executed
  server-side. `/api/auth/login` and `/api/auth/refresh` are excluded from the
  auto-refresh path.
- **Findings already satisfied:** `StudentDashboard` already retries via
  `useApi` reload (no `window.location.reload`), and `Analytics` needs no
  `subject_id` parameter because quiz UUIDs are globally unique and the
  backend authorizes by the teacher's subject membership on the quiz.

## Files and modules changed

- `backend/app/routes/materials.py` — POST returns `serialize_material(...)`;
  removed unused `MaterialResponse` import.
- `backend/app/services/quiz/grading_service.py` — `list_own_attempts` now
  paginated with a total; ordering unchanged.
- `backend/app/routes/me.py` — attempts endpoint accepts `page`/`size` and
  returns the paginated envelope.
- `backend/tests/test_phase_4.py` — envelope assertions + explicit-timestamp
  ordering test (bound ids via `uuid.UUID(...)`).
- `backend/app/routes/auth.py` — HttpOnly refresh cookie on login,
  `/api/auth/refresh` endpoint, cookie cleared on logout.
- `backend/app/auth/supabase_client.py` — added `refresh(refresh_token)`.
- `frontend/src/store/authStore.js` — persists `user`/`role` only; access token
  in memory; added `setAccessToken`.
- `frontend/src/api/client.js` — `credentials: 'include'`, exported
  `refreshAccessToken` with in-flight guard, 401 → one refresh + replay.
- `frontend/src/api/auth.js` — login no longer surfaces a refresh token;
  added `refreshSession()`.
- `frontend/src/App.jsx` — `SessionBootstrap` re-mints the token from the
  cookie on load; `RequireRole` no longer calls `clearAuth()`.
- `frontend/src/pages/Login.jsx` — no refresh token into the store.
- `frontend/src/pages/{Chat,FlashcardDecks,QuizCreateEdit,QuizResults,QuizTaking,StudentMaterials,StudentProgress,SubjectOverview,TeacherDashboard,TeacherMaterials}.jsx` — fixes above.
- `frontend/src/components/ui/states.jsx`, `frontend/src/lib/utils.js`,
  `frontend/src/api/quizzes.js` — accessibility/utility/contract fixes.
- Frontend tests: `authStore.test.js`, `client.test.js`, `quizzes.test.js`
  updated + new cases (silent-refresh replay, index→text mapping, paginated
  attempts envelope, memory-only token persistence).
- `agents.md` (root) — frontend test count 27 → 30; `frontend/agents.md` —
  replaced the localStorage refresh-token note with the cookie design.

## Checks run

- `cd backend && ./venv/bin/pytest` — 83 passed (offline).
- `cd frontend && npm run lint` — passed (12 pre-existing warnings, no new
  errors).
- `cd frontend && npm run build` — production build succeeded.
- `cd frontend && npm run test` — 30 passed across 7 files.

## Notable pitfalls or lessons

- SQLAlchemy `Uuid` columns reject plain strings on comparison
  (`'str' object has no attribute 'hex'`); bind `uuid.UUID(id)` in tests, since
  JSON-serialized responses return strings.
- A 401 handler that redirects unconditionally also clobbers the login screen's
  bad-credentials error; keep `/api/auth/login` out of the auto-refresh path.
- With `StrictMode`, dev effects double-fire; the in-flight refresh guard in
  `client.js` also prevents duplicate refresh calls at app bootstrap.
- `vite build` fails hard on a missing named export — exporting
  `refreshAccessToken` from `client.js` was required before `auth.js` could
  import it.
- `useDeferredValue` debounces the *request* while keeping the controlled input
  instant — a lighter-weight alternative to a `setTimeout` debounce.

## Follow-up

- `LoginResponse` still carries `refresh_token` in its body for contract
  compatibility; the frontend ignores it and the cookie is the storage
  channel. Removing the field from the response is a future hardening step.
- The client-side material search debounce uses the deferred value; if a manual
  debounce with a fixed delay is preferred for heavier queries, revisit.
- The teacher table still caps at `size: 100` per page; a future pass could add
  a page-size control.
