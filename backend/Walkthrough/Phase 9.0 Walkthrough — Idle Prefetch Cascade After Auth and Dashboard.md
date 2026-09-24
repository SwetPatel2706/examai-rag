# Phase 9.0 Walkthrough — Idle Prefetch Cascade After Auth and Dashboard

## Goal and outcome
Minimise perceived loading at two moments: (1) the auth → dashboard transition
(first page after login), and (2) every subsequent navigation while the user
reads the current page. Both roles (student, teacher) get the same treatment:
the page you are looking at warms the data for the pages you are most likely
to visit next, during browser idle time, so the next click renders from cache
instead of mounting into skeletons.

All checks pass: `npm run lint` (oxlint clean), `npm run test` (14 files,
63 tests), `npm run build` (Vite success).

## Key observation before the change
Most of the machinery already existed and only needed connecting:

- `src/lib/apiCache.js` — identity-scoped, freshness-bounded GET cache with
  in-flight dedupe. A page mount racing a prefetch still makes one request.
- `src/lib/lazyRoutes.js` — `preloadRoute` (chunk + data per path),
  `preloadAllChunks` (fired from `main.jsx`), and `preloadRoleData(role)`
  (warms every role-reachable default once the token is known).
- `src/lib/navigationIntent.js` — hover/focus/pointer-down prefetch for
  param routes (quiz detail/results, subject overviews).
- `SessionBootstrap` in `App.jsx` already called `preloadRoleData` — but only
  on the **reload** path (re-mint from HttpOnly cookie). The **login** path in
  `Login.jsx` set auth and navigated immediately with zero warming, so the
  dashboard always mounted cold after a fresh login.
- Per-subject fan-out was partial: students warmed each subject's ready
  materials, but not the Subject Overview bundle (detail + quizzes) or the
  materials-page per-subject filter variants; teachers warmed only the "All"
  aggregates, never the per-subject tab/filter variants their pages actually
  key on.

## Design decisions
- **Warm, never block.** Every warmer swallows its own failures; a slow
  endpoint degrades to the old on-mount fetch. Login still navigates
  immediately — warming runs alongside the router transition and the
  dashboard's `useApi` hooks adopt the in-flight request via cache dedupe.
- **Exact cache-key parity is the whole trick.** Each warmer uses the same
  `parts` array and fetcher arguments as the destination page's `useApi`
  call (verified per page, e.g. materials filter key
  `['students','me','materials', subjectId, '']`, teacher materials key
  `['materials', subjectId, 1]`). A mismatched key would fetch but never hit.
- **Cap the fan-out.** Per-subject warming is capped at 8 subjects and quiz
  analytics at the first 3 published quizzes, so a large department doesn't
  flood the API on login.
- **Idle scheduling, not eager loops.** New `runWhenIdle` helper
  (`requestIdleCallback` with `setTimeout` fallback) keeps the visible page
  interactive; effects are mount-scoped (`[]`) or depend on the already-stable
  subjects array, and StrictMode double-invocation is harmless (idempotent).
- **No chat/generated content is ever prefetched** — only safe GETs, same rule
  as the existing registry.

## Files changed and why
- `frontend/src/lib/idlePrefetch.js` (new) — `runWhenIdle(task)` helper.
- `frontend/src/lib/lazyRoutes.js` — new per-subject variant warmers with
  page-matching keys (`warmStudentMaterialsVariant`,
  `warmTeacherDashboardSubject`, `warmTeacherMaterialsSubject`,
  `warmTeacherProgressSubject`, `warmQuizAnalyticsDetail`); `warmStudentDeep`
  / `warmTeacherDeep` chained into `preloadRoleData` so login *and* reload
  both fill per-subject data; new idle-cascade entry points
  `preloadStudentDashboardIdle`, `preloadTeacherDashboardIdle`,
  `preloadStudentMaterialsIdle`, `preloadTeacherMaterialsIdle`,
  `preloadStudentSiblingsIdle`, `preloadTeacherSiblingsIdle`.
- `frontend/src/pages/Login.jsx` — after `setAuth`, fire `preloadRoute(target)`
  + `preloadRoleData(role)` before `navigate`, closing the auth→dashboard gap.
- Dashboards — `StudentDashboard.jsx` / `TeacherDashboard.jsx` idle-warm
  subject-card/overview bundles (e.g. Advanced Database Systems, Software
  Engineering) plus sibling defaults once subjects load.
- Materials pages — `StudentMaterials.jsx` / `TeacherMaterials.jsx` idle-warm
  the remaining per-subject filter/tab variants plus sibling defaults (the
  "All"/active-tab default was already warm from the dashboard).
- Sibling-default idle effects (deep-link coverage) — `Quizzes.jsx`,
  `SubjectOverview.jsx`, `Chat.jsx`, `FlashcardDecks.jsx` (student) and
  `Analytics.jsx`, `StudentProgress.jsx`, `QuizCreateEdit.jsx` (teacher).
  Param/detail navigation (quiz cards, subject cards) was already covered by
  hover prefetch via `navigationIntentProps` — no change needed there.

## Tests and checks run
- `npm run lint` — clean (one self-caught duplicate `const subjectList`
  fixed by renaming to `dashboardSubjects`).
- `npm run test` — 14 files, 63 tests, all pass.
- `npm run build` — succeeds; route chunks unchanged in shape (small
  per-page growth from the added imports only).

## Pitfalls and lessons
- Cache keys include `null` vs `undefined` subtly (`selectedSubjectId` starts
  as `null`); warmer and page must pass the *same* value shape, not just the
  same endpoint.
- `StudentMaterials` debounces search, so the warmed variant key uses the
  empty-search suffix `''` — matching only the default (un-searched) filter
  state, which is exactly the landing state worth prefetching.
- Teacher analytics per-quiz warming is deliberately shallow (first 3
  published); the quiz selector still fetches on demand for the rest.

## Follow-ups / known limitations
- No prefetch for quiz-taking detail beyond hover (answers are per-attempt and
  must stay fresh anyway) and no flashcard-study prefetch (generated decks
  change after generation).
- If subject counts grow large, consider prioritising by `recentMaterials` /
  last-visited subject instead of list order.
- Manual browser pass recommended: login → dashboard should show data with no
  skeleton flash on a warm backend, and dashboard → subject → materials hops
  should render instantly from cache.
