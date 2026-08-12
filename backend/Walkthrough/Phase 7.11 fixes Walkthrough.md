# Phase 7.11 fixes Walkthrough — Demo-Speed Startup Preload (chunks + role data warming)

## Task goal & outcome

User request: reduce the perceived loading time between pages/toggles for the
R4 demo, accepting a slower app-start/login in exchange.

Outcome: navigation no longer waits on lazy route chunks (all are fetched
upfront) and every screen a role can reach has its reusable GET data warmed in
the `apiCache` right after session restore — so first-click navigation renders
from fresh cache (no skeleton, no Suspense fallback) instead of mounting with
loading states. Startup absorbs ~40 KB gzipped of chunk downloads plus a small
burst of safe-GETs while the user is still on the login/bootstrap path.

## Why this was the right tradeoff

The bottleneck was **not** chunk loading. Route chunks are tiny (2–14 KB each,
~40 KB gzipped for all 14 across both roles). The real first-visit latency was
**per-page API fetches on mount** (each page issues 2–5 GETs) plus the Suspense
"Loading…" flash. Hover/pointer-down prefetch (`navigationIntentProps`,
`Sidebar.jsx`) only helps when the pointer lingers — unreliable for click-through.

## Implementation

Files changed (all frontend):

- `frontend/src/lib/lazyRoutes.js`
  - Added `preloadAllChunks()` — calls every route `loader()` up front (both
    roles), errors swallowed; returned promise never rejects.
  - Added `preloadRoleData(role)` — fires the role's existing warmers in
    parallel via `warmMany`:
    - teacher: home, materials, quiz editor, analytics, student progress.
    - student: home, chat, quizzes, flashcards, materials, plus the new
      per-subject materials warmer.
  - Added `warmSubjectMaterials(subjectId)` and `warmStudentSubjectMaterials()`
    — after the deduplicated subjects request resolves, warm each enrolled
    subject's `ready`-status materials under key
    `['subjects', <id>, 'materials', 'ready']`. This makes Chat's
    subject-switcher toggle (`Chat.jsx:86` refetches materials per subject on
    every switch) and Subject Overview instant too.
- `frontend/src/main.jsx` — `void preloadAllChunks()` at module load, before
  React mounts, so the cost hides behind the login screen.
- `frontend/src/App.jsx` — in `SessionBootstrap`, after `setUser(user)` succeeds,
  fire `void preloadRoleData(user.role)` (warmers need the auth token; chunks
  don't). Warmers cache under the authenticated identity via `apiCache`, so no
  cross-user leakage.

No changes needed to pages, `Sidebar.jsx`, `navigationIntent`, or `apiCache`:
existing hover-prefetch and cache short-circuiting already turn warmed data into
instant, skeleton-free renders.

## Design notes / pitfalls

- **Identity scoping held up:** `prefetch`/`getOrFetch` key on `identity()` from
  `authStore`. Warmers only run after `setUser`, so `user.id` is set and every
  warm entry is scoped to the signed-in user; the existing authStore subscription
  in `apiCache.js` clears on logout/role change.
- **Subject id consistency:** analytics subjects expose `subjectId`, the
  `/api/subjects` API exposes `id`; both are the backend's subject id, and
  `listSubjectMaterials` is keyed on that same value, so one warm key serves both
  Subject Overview cards and Chat's switcher.
- **Fail-open:** all warmers wrap in `.catch(() => null)` — a slow/failed warm
  never blocks startup; the page just falls back to its normal on-mount fetch.

## Checks run (all in `frontend/`)

- `npm run lint` — oxlint, clean.
- `npm run build` — Vite build succeeds (chunk output unchanged in size).
- `npm run test` — 63/63 tests pass across 14 files (new exports are additive;
  existing `lazyRoutes.test.js` and `navigationIntent.test.js` still green).

## Follow-up / known limitations

- Param routes (`/student/subject/:id`, `/student/quiz/:id`,
  `/student/flashcards/:id/study`) can't be prewarmed generically; they rely on
  hover-prefetch. Per-subject materials warming covers most of that first hop
  from Home.
- The Chat subject-switcher materials warming scales with number of subjects
  (one GET each) — fine for a seeded demo, revisit if subject counts grow.
- Manual browser pass recommended before the demo: log in as student, click
  through Home/Chat/Quizzes/Flashcards/Materials and flip the Chat subject
  toggle; confirm no "Loading…" flash. The existing `examai:navigation-ready`
  window event (target `< 300 ms`) can be watched in the console.
