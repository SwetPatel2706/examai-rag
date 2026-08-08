# Phase 6.7 Walkthrough — Frontend Performance and UI Consistency Planning

## Task goal and outcome

Introduce the missing post-integration phases between Phase 6 and Phase 7. The plan now separates frontend performance/loading work (Phase 6.7) from UI consistency/navigation polish (Phase 6.8), while keeping deployment hardening as Phase 7.

The plan is evidence-led: it calls for baseline measurements before optimization, allows skeleton screens and safe GET caching where they are justified, and explicitly protects authentication, material-scope freshness, citation attribution, quiz correctness, and responsive accessibility.

## Important decisions

- Route-level lazy loading is a concrete optimization target because `frontend/src/App.jsx` statically imports every page.
- The existing `useApi` hook is the natural place to evaluate small, tested request deduplication and identity-scoped in-memory caching. The plan does not mandate adding a new caching dependency before measurements.
- Skeletons are reserved for data-heavy page sections and must preserve approximate layout dimensions. Spinners remain appropriate for short actions and session restoration.
- The sidebar issue is caused by prefix matching: the `/student` and `/teacher` `NavLink` entries do not use exact matching. Phase 6.8 makes exact home matching and regression tests an explicit deliverable.
- Phase 7 retains backend and external-service tuning, but broad frontend performance and navigation polish are now completed and measured before deployment hardening.

## Files changed and why

- `backend/plan/README.md` — inserted Phases 6.7 and 6.8 into the phase table and documented their ordering.
- `backend/plan/phase-6-frontend-backend-integration.md` — made the next gate after integration explicit.
- `backend/plan/phase-6.7-frontend-performance-and-loading.md` — added measurement, loading, bundle, request reuse, caching, and performance verification scope.
- `backend/plan/phase-6.8-ui-consistency-and-navigation-polish.md` — added active navigation, shared UI-state, responsive, accessibility, and regression-test scope.
- `backend/plan/phase-7-hardening-deployment-and-demo-readiness.md` — clarified that Phase 7 consumes the frontend baseline and focuses its slow-path work on backend/external services.
- `backend/Walkthrough/Phase 6.7 Walkthrough — Frontend Performance and UI Consistency Planning.md` — recorded the planning task, decisions, checks, and follow-up.

## Checks run

- Inspected `frontend/agents.md`, the Phase 6 and Phase 7 plans, the frontend route imports, `Sidebar.jsx`, `AppLayout.jsx`, `useApi.js`, shared loading states, and API usage patterns.
- Read the applicable React performance guidance for parallel requests, route-level dynamic imports, intent-based preloading, request deduplication, memoization discipline, and long-list rendering.
- Ran `git diff --check` after editing the plan and walkthrough files.
- No application code or runtime behavior was changed in this planning task, so frontend/backend test suites were not rerun.

## Follow-up

Implement Phase 6.7 first, capture before/after measurements, then implement Phase 6.8 and verify the sidebar active-state regression. Do not treat caching as complete until logout/session replacement isolation and mutation invalidation are tested.
