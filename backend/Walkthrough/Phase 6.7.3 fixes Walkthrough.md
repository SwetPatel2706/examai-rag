# Phase 6.7.3 fixes Walkthrough — Cache Invalidation, Navigation Timing, and Subject-Store Hydration

## Goal and outcome

Follow-up review-response pass covering five frontend defects: keyboard users
never started navigation timing, the mobile sidebar close button referenced an
undefined variable, `invalidate()` let an in-flight request deliver stale data
to a mounted page, route paths with query/hash segments never matched the
navigation ready mark, and the subject store was only hydrated when a fetcher
actually ran (not on cache hits).

All five findings were verified against the current code and fixed; one test
was added and the full frontend gate passes.

## Important decisions

- **Invalidation generation counter.** `invalidate()` now bumps a module-level
  `generation` in `apiCache.js`. Each fetch attempt captures the generation it
  started under; if the generation changes mid-flight (an invalidation
  happened), `getOrFetch` restarts the fetch instead of resolving the stale
  value. If a newer in-flight request already exists for the key (e.g. a
  `reload()` that invalidated then re-fetched), the obsolete request adopts it
  rather than issuing a third request, preserving the module's single-in-flight
  dedup guarantee.
- **Separate `clearCount` for `clear()`.** Logout / role change calls `clear()`,
  not `invalidate()`. A fetch resolving after `clear()` must not repopulate the
  cache, so `clearCount` gates the final cache write while `generation` gates
  the refetch decision. (Without this, a logout mid-flight could re-store stale
  data under the old identity's key.)
- **Refetch inside `getOrFetch` (self-contained).** Chosen over a
  reject-with-sentinel design that would have spread the refetch logic into
  `useApi.js`. `useApi` is unchanged.
- **Navigation path normalization in one place.** `normalizePath` strips
  `?query` and `#hash` segments and is applied at the top of both
  `markNavigationStart` and `markNavigationReady`, so the pending map, both
  `performance.mark` names, and the emitted `detail.path` all agree. `App.jsx`
  already calls ready with `location.pathname` (query/hash-free), so the fix
  targets the raw start paths from the sidebar and navigation intent helpers.
- **Keyboard activation reuses the pointer-down preparation.** The sidebar
  NavLink `onClick` now runs `markNavigationStart(item.to)` + `closeDrawer()`
  (same as `onPointerDown`), so Enter-activated links time correctly. Pointer
  users get two start marks (pointerdown + click); the second overwrites the
  pending start with the activation time and `preloadRoute` is idempotent, so
  this is harmless.
- **Store hydration moved out of fetchers.** `setSubjects` no longer lives
  inside the `useApi` fetcher; a `useEffect` syncs the store from
  `subjects.data`. This hydrates `subjectStore` even when `useApi` serves a
  fresh cache hit (fetcher never runs) and applies the same pattern in both
  Dashboard and Chat.

## Files and modules changed

- `frontend/src/components/layout/Sidebar.jsx` — keyboard-safe nav timing on
  NavLink click; mobile close button now calls `closeDrawer()` directly
  (removed the undefined `item.to` reference that would have thrown).
- `frontend/src/lib/apiCache.js` — `generation`/`clearCount` counters;
  `getOrFetch` restarts or adopts on invalidation and discards post-`clear()`
  results; `invalidate()` and `clear()` bump the counters.
- `frontend/src/lib/apiCache.test.js` — new test "refetches when invalidate
  fires while a request is in flight" covering the stale-result suppression and
  refetch path.
- `frontend/src/lib/navigationPerformance.js` — `normalizePath` applied to
  start/ready; normalized path used for pending storage, marks, and the emitted
  `detail.path`.
- `frontend/src/pages/StudentDashboard.jsx` and
  `frontend/src/pages/Chat.jsx` — plain fetcher passed to `useApi` plus a
  store-sync `useEffect` for subject hydration on cache hits.

## Verification

- `npm run test`: **59 tests passed across 14 test files** (was 58; +1 new
  apiCache test).
- `npm run lint`: passed with repository warnings only (all pre-existing).
- `npm run build`: passed; route chunks remain split, bootstrap 299.66 kB raw /
  96.09 kB gzip (unchanged profile).

## Pitfalls and lessons

- **Microtask timing in the new test.** After resolving the first deferred, the
  retry's second `fetcher()` call runs in a microtask, so the test needed
  `await Promise.resolve()` before asserting the call count.
- **Two counters, not one.** A single generation counter made post-`clear()`
  results eligible to re-store; splitting `generation` (refetch trigger) from
  `clearCount` (write gate) keeps invalidate-refetch and clear-discard
  semantics independent.
- **Hooks before early returns.** The new store-sync effect in
  StudentDashboard had to sit before the `loading`/`error` early returns to
  respect the Rules of Hooks.

## Follow-up

- `useApi.reload()` still invalidates then bumps its own reload key; the
  adopt-newer path in `getOrFetch` keeps a manual reload during an in-flight
  fetch to a single network request. Worth a regression test if reload-timing
  behavior is touched again.
- No live seeded-backend browser run was performed in this pass; navigation
  timing under real conditions can be captured via the existing manual
  performance run.
