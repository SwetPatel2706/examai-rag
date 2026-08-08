# Phase 6.7.2 fixes Walkthrough — Fast In-App Page Navigation

## Goal and outcome

This follow-up reduced the delay and blank-screen feeling when moving between
frontend pages. Standard authenticated routes now keep the shared sidebar and
main shell mounted, safe destination data can be warmed before a click, and
cached data is available during the destination's first render.

## Important decisions

- The existing in-memory cache was retained instead of adding a new state
  library. A new `prefetch()` helper shares its in-flight map with `useApi`.
- Prefetching is intent-based: hover, focus, and pointer-down may warm route
  chunks and safe GET data. Chat answers, writes, generation, polling, and
  expiring download URLs are never prefetched.
- Quiz-taking, quiz-results, and flashcard-study routes remain full-screen;
  standard student and teacher pages use the persistent shell.
- Composite subject and quiz requests were split into canonical cache keys so
  route prefetch and page mount cannot issue duplicate requests.

## Files and modules changed

- `frontend/src/App.jsx` and `frontend/src/components/layout/AppLayout.jsx`
  keep the authenticated shell outside standard lazy page content and place
  route fallbacks inside the main area.
- `frontend/src/lib/apiCache.js`, `useApi.js`, `lazyRoutes.js`,
  `navigationIntent.js`, and `navigationPerformance.js` implement synchronous
  cache snapshots, route-aware safe-GET warming, intent handlers, and manual
  navigation marks.
- Student and teacher dashboard, subject, quiz, result, and flashcard pages
  now use canonical keys and dynamic destination intent handlers. Quiz and
  material mutation invalidation was aligned with those keys.
- `frontend/docs/performance-run.md` and the Phase 6.7 plan record the measured
  build output and the remaining live seeded-browser procedure.

## Verification

- `npm run test`: **58 tests passed across 14 test files**.
- `npm run lint`: passed with existing repository warnings only.
- `npm run build`: passed; route chunks remain split and the bootstrap measured
  299.40 kB raw / 95.99 kB gzip.

## Pitfalls and follow-up

- The build still reports unresolved font asset references already present in
  the project; this does not block the JavaScript build.
- The automated run did not start a seeded backend/browser session, so live
  request counts, duplicate requests, LCP/CLS, and route timing tables still
  need to be captured using `frontend/docs/performance-run.md`.
- The bootstrap is close to the 300 kB raw review threshold. If future route
  metadata pushes it over that threshold, move more warmer definitions behind
  dynamic imports before considering vendor chunk changes.
