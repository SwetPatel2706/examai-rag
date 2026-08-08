# Phase 6.7 — Frontend Performance and Loading Experience

## Goal

Reduce initial load and route-transition time, improve perceived responsiveness, and prevent avoidable loading waterfalls in the integrated frontend. Make performance decisions from measurements taken against the real API integration, not from blanket caching or premature memoization.

This phase comes after Phase 6 because it needs real request patterns and real loading/error behavior. It comes before UI polish and Phase 7 so the final visual review is performed on the interaction model users will actually experience.

## Already done

- Phase 6 connects the role-specific screens to the backend and defines loading, empty, error, retry, processing, and session-expiry behavior.
- The frontend has a shared API client and `useApi` hook, but the hook currently fetches independently and does not provide cross-screen cache or in-flight request deduplication.
- `frontend/src/App.jsx` statically imports all route pages, so the initial bundle includes screens that are not needed for the first route.
- Several screens already parallelize independent requests with `Promise.all`; those patterns should be retained and measured rather than replaced with sequential fetching.
- The existing `LoadingState` is a spinner-style fallback. It can remain for short actions and app-wide session restoration, while data-heavy screens may need layout-preserving skeletons.

## Not to be done in this phase

- Do not change backend contracts, authorization rules, material ownership, quiz semantics, or RAG behavior.
- Do not add a large client-state library solely for caching without first measuring whether the existing API boundary can support a small, tested cache layer. An SWR-style library is acceptable only if its bundle and invalidation trade-offs are justified.
- Do not cache chat answers, quiz generation/submission, flashcard generation, uploads, mutations, processing-status polls, or signed download URLs as ordinary reusable GET data.
- Do not use `localStorage` for access tokens or unrestricted protected API responses. Any in-memory cache must be isolated by authenticated user/session and cleared on logout or session replacement.
- Do not hide slow requests behind indefinite skeletons, stale data without a freshness policy, or silent fallback to mock data.
- Do not optimize every component with `memo`, `useMemo`, or `useCallback` without a measured render or bundle problem.

## Work items

1. Establish a repeatable frontend baseline in a production build against a seeded local/staging dataset. Record initial bundle/chunk sizes, cold-load and warm-load timings, route transition timings, API request count, duplicate requests, largest contentful paint, cumulative layout shift, and interaction delay for the login, student home, chat, quizzes, materials, teacher dashboard, analytics, and student-progress journeys.
2. Map request waterfalls and duplicate fetches. Start independent requests together, remove avoidable fetch-on-render chains, and add cancellation or stale-result protection where changing subjects, pages, or selectors can leave an obsolete request in flight.
3. Split route-level page bundles with `React.lazy`/dynamic imports and a shared `Suspense` fallback. Keep the login/session bootstrap path small and preload a likely next route on explicit user intent (for example, sidebar hover/focus) only where measurements show a benefit.
4. Add reusable skeleton primitives and screen-level skeleton layouts for data-heavy dashboard cards, tables, quiz lists, analytics, progress, materials, and chat scope content. Match the final content dimensions closely enough to reduce layout shift; retain semantic loading announcements and accessible retry/error states.
5. Add a small, explicit client data policy for safe GET requests. It should support stable query keys, in-flight deduplication, a short per-resource freshness window, stale-while-revalidate where useful, and targeted invalidation after uploads, deletes, retries, quiz mutations, and other writes. The policy must distinguish immutable/detail data, frequently changing lists, and processing status.
6. Scope cache entries to the authenticated identity and relevant subject/resource IDs. Clear or namespace cache state on logout, session expiry, role change, and account replacement. Never reuse one user's protected data for another user in the same browser session.
7. Reduce render cost on long material, quiz, roster, and chat lists through pagination/virtualization or `content-visibility` where appropriate. Preserve keyboard navigation, citation access, responsive behavior, and the existing Stitch visual hierarchy.
8. Add performance-focused tests: cache hit and dedup behavior, mutation invalidation, user/session isolation, stale-request cancellation, skeleton-to-content transitions, route fallback rendering, and no duplicate initial requests for shared data. Add a documented manual performance run against the seeded dataset.
9. Record before/after measurements and a short decision log. If a proposed cache or optimization does not improve the baseline or creates correctness risk, remove it and document why.

## Performance contract

- Every screen has a bounded loading state and a visible failure/retry path; skeletons are placeholders, not a substitute for timeout or error handling.
- Safe GET caching is in-memory, identity-scoped, freshness-bounded, and invalidated by relevant writes. It is never used to bypass authorization or make a client-controlled ID trusted.
- Requests for independent data do not wait on one another unless there is a documented dependency.
- Route-level lazy loading must preserve direct navigation, role guards, browser refresh, and a usable fallback while a chunk is loading.
- Protected data, chat responses, generated content, mutations, and expiring URLs follow explicit no-cache or short-lived policies.
- Performance improvements must not regress citation attribution, material scope freshness, quiz attempt correctness, accessibility, or responsive layout.

## Verification

- Production frontend build completes and reports the expected route chunks.
- Baseline and post-change measurements are captured for the agreed journeys, with request count and duplicate-request comparisons.
- Frontend lint and tests pass, including cache/session-isolation and lazy-route tests.
- A browser pass confirms direct URL loads, refreshes, session expiry, slow network behavior, retry behavior, and responsive layouts.
- The performance checklist records remaining bottlenecks and assigns backend/external-service issues to Phase 7 rather than masking them in the client.

## Exit criteria

The integrated frontend has evidence-backed improvements to initial load and route transitions, stable skeleton and error behavior, safe deduplicated reuse for eligible GET data, and regression coverage for correctness-sensitive cache boundaries. It is ready for Phase 6.8 UI consistency and navigation polish.
