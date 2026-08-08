# Phase 7.2 fixes Walkthrough

## Goal and outcome

Verified the pasted review findings against the current frontend and fixed the findings that were still valid. The changes cover authentication/error handling, null-safe rendering, quiz validation, stable API reloads, shared formatting/grouping/initials helpers, material download behavior, newest-attempt selection, and accessibility states.

## Important decisions

- 401 handling now clears auth and invokes the redirect before attempting JSON decoding, so empty or non-JSON responses cannot bypass session cleanup.
- `useApi.reload` is stable through `useCallback`, allowing polling effects to depend on it safely.
- Unknown/null values remain visibly unknown (`—` or neutral badges); numeric zero is preserved as a valid value.
- The existing refresh-token localStorage contract remains because the backend does not currently provide an HttpOnly refresh-cookie flow. The accepted capstone trade-off and XSS follow-up are documented in `frontend/agents.md`.
- Shared `formatDate`, `initials`, and `groupByTeacher` utilities replace duplicated page-local implementations.

## Files and modules changed

- `frontend/src/api/client.js` and tests: early 401 handling plus injectable redirect coverage.
- `frontend/src/store/authStore.js` and tests: state-preserving persistence for auth updates.
- `frontend/src/lib/format.js`, `src/lib/utils.js`, and `src/lib/materials.js`: shared helpers.
- `frontend/src/components/ui/states.jsx`: status/alert semantics and decorative spinner hiding.
- Student and teacher pages: null-safe statistics/progress, stable loading/error behavior, download errors, shared helpers, quiz validation, status handling, and accessible roster rows.
- `frontend/src/App.jsx`: invalid role sessions now clear and return to login.
- `frontend/agents.md`: refresh-token storage rationale.

## Checks run

- `cd frontend && npm run test -- --run` — 7 test files, 27 tests passed.
- `cd frontend && npm run lint` — passed with existing/non-blocking warnings.
- `cd frontend && npm run build` — production build succeeded.
- `git diff --check` — passed.

## Findings intentionally not changed

- The guarded-layout `Outlet` route refactor was skipped because it is structural rather than a minimal correctness fix and the existing guarded routes preserve the same paths and behavior.
- Teacher-material action in-flight deduplication was not added; upload already has a guard, while retry/delete/download need a more explicit UI busy-state design to avoid disabling unrelated row actions.
- SubjectOverview’s direct progress endpoint was not introduced because no per-subject progress API wrapper is present; the existing student-subjects response remains the available source.
- The optional no-argument `listMyAttempts` test was not added because the implementation already uses the undefined-params path and existing API coverage passed.

## Follow-up

Consider extracting the remaining page-specific retry/loading patterns and replacing refresh-token localStorage persistence once the backend supports secure cookie rotation.
