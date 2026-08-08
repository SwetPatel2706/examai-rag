# Phase 6.8 — UI Consistency and Navigation Polish

## Goal

Resolve integration-era UI inconsistencies and make navigation state, feedback, spacing, responsive behavior, and accessibility predictable across student and teacher journeys. Preserve the Stitch-aligned visual language while fixing behavior that makes the interface appear stuck or contradictory.

## Already done

- Phase 6 provides the route map, role-specific sidebars, shared state components, and real API-driven screen states.
- `frontend/src/components/layout/Sidebar.jsx` uses React Router `NavLink`, but the home links are prefix matches because they do not opt into exact matching. As a result, Home/Dashboard can remain highlighted while a child route such as Chat, Quizzes, or Materials is selected.
- Loading, empty, and error primitives exist in `frontend/src/components/ui/states.jsx`, but not every screen necessarily uses the same layout, wording, spacing, or action treatment.

## Not to be done in this phase

- Do not redesign the product, replace Stitch tokens, add dark-mode telemetry, or introduce new navigation destinations.
- Do not merge Analytics and Student Progress, add messaging, add a planner, or reintroduce student-generated quizzes.
- Do not solve data freshness by changing API ownership or persisting material scope as a permanent user setting.
- Do not mark a route active merely because it shares a path prefix; active state must reflect the intended navigation hierarchy.

## Work items

1. Correct sidebar active matching. Configure exact matching for student `/student` and teacher `/teacher` home links, define intentional descendant matching for any parent navigation item that should remain active, and ensure only the intended item receives active styling and `aria-current`.
2. Add regression tests using a memory router for every student and teacher sidebar route, including subject, quiz-taking/results, flashcard-study, and legacy-redirect paths. Verify that focus, keyboard activation, mobile drawer close behavior, and browser back/forward preserve the correct active state.
3. Audit every route against a shared UI-state matrix: initial loading/skeleton, background refetch with existing data, empty result, recoverable API error, forbidden/unauthorized response, mutation progress, success feedback, and session expiry. Normalize labels, retry placement, disabled states, and layout height without hiding useful content.
4. Normalize shared page chrome: sidebar/top-bar spacing, page headers, breadcrumbs, tabs, selected filters, buttons, cards, tables, dialogs, badges, and responsive breakpoints. Reuse existing tokens and shared components; keep screen-specific styling only where the information hierarchy genuinely differs.
5. Review active and selected states beyond the sidebar: subject tabs, material filters, quiz selectors, pagination, scope checkboxes, flashcard controls, and teacher/student route tabs. Selected state must be visible, keyboard reachable, and not depend on color alone.
6. Fix layout-shift and overflow issues found during the Phase 6.7 slow-network pass, especially long filenames, citation tooltips, table columns, chat messages, dialogs, mobile navigation, and pages with delayed API sections.
7. Add accessibility and responsive checks for semantic landmarks, link/button semantics, focus-visible styles, `aria-current`, `aria-busy`/status announcements, contrast, touch targets, reduced motion, and viewport widths used by the demo runbook.
8. Add focused component/browser coverage for the active sidebar bug and representative state variants. Capture a small screenshot or manual review checklist only where visual comparison adds value; do not make pixel snapshots the only source of truth.

## UI consistency contract

- Exactly one sidebar destination is active for a valid role-specific route, or none is active when the route is intentionally outside the primary navigation.
- Home/Dashboard is active only for its exact home route unless a documented parent-match rule says otherwise.
- All asynchronous screens communicate loading, success, empty, error, and retry states consistently and remain usable on slow or failed requests.
- Visual changes use existing design tokens and do not reintroduce out-of-scope themes or features.
- Navigation and interactive controls work with mouse, keyboard, mobile drawer, browser history, and direct URL refresh.
- Responsive layouts do not introduce horizontal scrolling or conceal required citation, ownership, score, or status information.

## Verification

- Frontend lint, unit/component tests, and production build pass.
- Active-link regression tests pass for all role-specific routes, including nested routes where Home previously stayed highlighted.
- A manual browser pass covers student and teacher desktop/mobile navigation, direct URL entry, refresh, back/forward, slow loading, empty/error states, and key dialogs.
- The review checklist records any intentional visual deviations from Stitch and any remaining issues deferred to Phase 7.

## Exit criteria

Navigation accurately communicates the current location, shared UI states and controls follow one consistent interaction language, responsive/accessibility checks pass for the demo journeys, and the frontend is ready for Phase 7 hardening, deployment, and demo readiness.
