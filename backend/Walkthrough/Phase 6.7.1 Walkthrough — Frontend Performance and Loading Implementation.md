# Phase 6.7.1 Walkthrough — Frontend Performance and Loading Implementation

## Task goal and outcome

Implemented the Phase 6.7 frontend performance/loading plan
(`backend/plan/phase-6.7-frontend-performance-and-loading.md`): route-level code
splitting, a small custom in-memory GET cache with in-flight dedup, skeleton
loading screens, and `content-visibility` on long tables — all gated on the
measurements recorded in `frontend/docs/performance-run.md`.

Outcome, verified by the full frontend gate (`npm run lint`, `npm run build`,
`npm run test`):

- Initial JS bundle **461.85 kB → 279.53 kB raw (−39%)**, gzip 135.69 kB →
  89.09 kB (−34%). Every route page is now a lazy chunk; per-route chunks stay
  small (largest `QuizCreateEdit` 13.81 kB).
- 52 tests pass (31 pre-existing + 21 new); oxlint clean; production build OK.
- Duplicate cross-screen fetches (subject lists, material lists, stats, quiz
  lists) are now identity-scoped, freshness-bounded cache reads.

## Design decisions

- **Custom in-memory cache over SWR.** The app already routes every GET through
  `useApi` with explicit, per-screen calls; a cache layer that wraps the
  fetcher with a key was the smallest change with no new dependency. Keys are
  identity-scoped (`<userId>:` or `role:<role>:` or `anon:`), so one student's
  protected data can never be served to another user in the same tab. The cache
  clears automatically on identity change via an `authStore` subscription
  (logout, session expiry, role change, account replacement).
- **Cache vs no-cache split.** Only safe, list-style GETs are cached
  (30–60 s freshness). Chat answers, uploads, deck generation, quiz
  submission, status polls and expiring download URLs never get a key, so they
  bypass the cache entirely.
- **Write-path invalidation.** `api/materials.js`, `api/quizzes.js`,
  `api/flashcards.js` invalidate matching key prefixes after mutations
  (upload/retry/delete/update material; create/update/delete/publish quiz;
  submit attempt; generate deck; update card mastery). Prefix invalidation
  (`invalidate(['quizzes'])` drops `…/quizzes/overview`, `…/quizzes`) means
  list caches never go stale after a mutation.
- **Intent-based route preload (kept, low cost).** `Sidebar` calls
  `preloadRoute(path)` on NavLink hover/focus; it shares the route's lazy
  loader so the chunk is fetched on intent and resolved on click. The decision
  log keeps it because it only fires on user intent and the chunks are small.
- **No vendor `manualChunks` split.** Lazy imports already separate React
  internals into shared chunks; hand-rolled vendor splitting would add config
  churn with no measured benefit.
- **`content-visibility` only on long tables** (roster, materials,
  recent-activity). Chat thread and card grids are short/bounded, so they were
  left alone to avoid layout-shift risk.

## Files changed

- `frontend/src/lib/apiCache.js` — new cache core: `buildCacheKey`, `readCache`,
  `getOrFetch` (fresh short-circuit, in-flight dedup, stale refetch, invalidated
  results discarded), `invalidate(parts)`, `clear()`, plus the authStore
  identity subscription.
- `frontend/src/lib/useApi.js` — `useApi(fetcher, deps, { key, staleMs,
  enabled })` → `{ data, loading, error, validating, reload }`. `reload()`
  invalidates the key and refetches. Uncached path (no `key`) behaves exactly
  as before.
- `frontend/src/lib/lazyRoutes.js` — route→dynamic-import loader map +
  `preloadRoute(path)`.
- `frontend/src/App.jsx` — all route pages switched to `lazy(...)`, wrapped in
  `Suspense` with `RouteFallback`; exported `AppRoutes` (routes + session
  bootstrap, no router) so tests can use `MemoryRouter`. Session bootstrap
  behaviour and route guards unchanged.
- `frontend/src/components/layout/RouteFallback.jsx` — Suspense fallback
  (`aria-busy`).
- `frontend/src/components/layout/Sidebar.jsx` — `preloadRoute` on NavLink
  mouse-enter/focus.
- `frontend/src/components/ui/skeletons.jsx` — `Skeleton`/`SkeletonText`
  primitives, `SkeletonScreen` (role="status"), stat cards, card grid, table,
  scope-panel skeleton, plus 9 screen-level skeletons (StudentDashboard,
  TeacherDashboard, Chat, SubjectOverview, Materials, Analytics, Progress,
  QuizCreateEdit).
- `frontend/src/api/{materials,quizzes,flashcards}.js` — invalidation helpers
  called on every write path.
- All 10 data-heavy pages wired with cache keys + skeleton loading branches:
  StudentDashboard, SubjectOverview, Chat, Quizzes, TeacherDashboard, Analytics,
  StudentMaterials, FlashcardDecks, TeacherMaterials, StudentProgress,
  QuizCreateEdit (+ uncached quiz-detail/attempt reads in QuizTaking,
  FlashcardStudy, QuizResults, which use the 30 s attempt/quiz caches where
  safe).
- `frontend/src/index.css` — `.cv-auto` (`content-visibility: auto` +
  `contain-intrinsic-size`).
- `frontend/docs/performance-run.md` — after-measurements + decision log.
- Tests: `src/lib/apiCache.test.js`, `src/lib/useApi.test.js`,
  `src/App.routes.test.jsx`, `src/pages/StudentDashboard.test.jsx`,
  `src/components/layout/RouteFallback.test.jsx`, and a
  `window.matchMedia` polyfill in `src/test/setup.js`.

## Tests and checks run

- `cd frontend && npm run test` → 52/52 pass (31 existing + 21 new: cache
  freshness/dedup/invalidation/identity-scoping, hook cached-vs-uncached/
  stale-revalidate/`reload`/stale-response cancellation, lazy route rendering
  for student + teacher, unauthenticated and role-guard redirects, route
  fallback rendering, skeleton→content transition).
- `npm run lint` (oxlint) → clean (only pre-existing warnings; the
  `LoadingState` undefined-reference warnings introduced by earlier edits were
  fixed by restoring the import where the small panel spinners are still used).
- `npm run build` → production build OK; chunk sizes recorded above.

## Notable pitfalls and lessons

- **Import-surgery drift.** When swapping `LoadingState` → skeleton on a page,
  the old import was dropped in three files (Chat, FlashcardDecks,
  StudentProgress, Analytics) while an inline `LoadingState` usage remained for
  a nested panel (scope panel, drill-down, analytics body). oxlint caught the
  `jsx-no-undef` warnings. Lesson: after editing imports, re-scan the file for
  remaining usages of the removed symbol.
- **Prefix-match separator.** Cache keys join parts with `/`; invalidation
  matches `key === prefix || key.startsWith(prefix + '/')`. Keep both `['x']`
  and `['x','…']` keys consistent with this so prefix invalidation always
  reaches the nested keys.
- **`matchMedia` in jsdom.** `Sidebar` queries `window.matchMedia` on mount,
  which jsdom lacks — the lazy-route tests crashed until a stub was added to
  `src/test/setup.js`. Any future test mounting `AppLayout` needs it.
- **Stale-revalidation test timing.** The stale-render test uses a 10 ms
  freshness window with a real sleep (40 ms) to avoid the fake-timer +
  `waitFor` interplay; deterministic enough and fast.
- **App.jsx rewrite risk.** The original file was read truncated before the
  rewrite; a `git diff` of `frontend/src/App.jsx` was used to confirm no routes
  were dropped (`/student-old`, `/teacher-old` already existed) and nothing but
  imports + the App/AppRoutes split changed.

## Follow-up / known limitations

- Live after-measurements (Network/LCP/CLS per journey) still pending against
  the seeded backend; the cache-key dedup and bundle numbers are verified at
  the code/build level. Fill the journey table in
  `frontend/docs/performance-run.md` and revisit the preload keep/remove
  decision if the numbers warrant it.
- Cache is in-memory only — a full page reload drops it (by design; the
  identity-scoped guarantee is simplest that way). If a future phase wants
  cross-reload reuse, sessionStorage persistence would need the same identity
  scoping, not raw `localStorage`.
- `content-visibility` is applied to long tables only; chat threads remain
  full-render (bounded in practice).
