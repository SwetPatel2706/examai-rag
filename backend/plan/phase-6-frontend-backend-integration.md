# Phase 6 — Frontend-Backend Integration

## Goal

Replace the frontend's placeholder data and navigation shortcuts with real API calls in one controlled, standalone integration phase. Preserve the existing Stitch-aligned visual behavior while making every connected screen handle real loading, empty, error, authorization, processing, and retry states.

## Already done

- Phases 0–5 define and contract-test the backend API/error surfaces needed by the frontend.
- The frontend contains route-level screens, Zustand stores, reusable components, and the mock register at `frontend/Frontend Placeholder & Mock Data Register.md`.
- Analytics and Student Progress remain separate backend services and frontend routes.

## Not to be done in this phase

- Do not add new product features or change backend ownership/authorization rules.
- Do not reintroduce signup, client role selection, student material uploads, personalized quizzes, messaging, planner, PYQ analysis, admin, or telemetry.
- Do not remove a mock until its replacement endpoint is connected and covered by an integration or browser smoke test.
- Do not hide backend failures behind indefinite spinners or silently fall back to stale mock metrics.

## Work items

1. Add a single frontend API client with the configured `VITE_API_BASE_URL`, authenticated request handling, typed response/error envelopes, and safe logout/session-expiry behavior.
2. Replace auth, subject, subject overview, and material metadata mocks. Wire server-derived role redirects, teacher ownership display, subject membership, pagination, filtering, and secure download URL handling.
3. Replace teacher upload/status mocks and connect the complete upload → processing → ready/failed state flow.
4. Replace chat and flashcard mocks. Send `subject_id` and fresh `selected_material_ids` on every request; render attributable citations, source locations, teacher/material names, scope reset, generation errors, and ingestion-not-ready states.
5. Replace quiz mocks and navigation-state-only results. Wire teacher create/edit/generate/publish and student list/take/submit/results flows against shared quiz APIs.
6. Replace analytics, Student Progress, teacher dashboard, student dashboard, resources, roster, subject tabs, and selector mocks using the Phase 5 contracts.
7. Add consistent loading, empty, retry, unauthorized, forbidden, processing, failed, and session-expired states across connected screens.
8. Remove or quarantine every functional mock listed in the mock register only after its real endpoint and test exist. Record intentional design-only fixtures and deferred items.
9. Add frontend store/component tests and a browser smoke suite covering role-specific navigation and the critical journeys.

## Integration contract

- Browser configuration uses `VITE_API_BASE_URL`; backend CORS allows only the documented local/staging/production origins.
- The client never receives service-role keys, raw storage paths, or unrestricted student data.
- Request payloads preserve server authorization boundaries; client-controlled IDs are not treated as proof of access.
- All API failures are rendered from the shared error envelope with a recoverable action where appropriate.

## Verification

- The mock register has no unaccounted-for functional mocks.
- Browser smoke tests pass for login, subject/material visibility, teacher upload/status, student scoped chat/citations, flashcard generation/study, quiz authoring/attempt/results, analytics, and progress.
- Responsive screens preserve the existing design while using real data and real empty/error states.
- Session expiry, unauthorized resource access, failed ingestion, and transient API failure are visible and recoverable.

## Exit criteria

All Phase 1–5 user journeys run through real APIs in a local environment, the frontend placeholder register is reconciled, and the integrated build is ready for the Phase 6.7 performance and loading pass. Phase 7 hardening and deployment follow Phases 6.7 and 6.8.
