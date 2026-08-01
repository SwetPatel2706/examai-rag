# Phase 5 — Teacher Analytics, Student Progress, and Full Frontend Integration

## Goal

Provide the two distinct teacher reporting views and remove the remaining frontend placeholders in a controlled order. Analytics must be calculated from real shared-quiz attempts, while materials/chat/flashcards/quizzes retain the contracts established in earlier phases.

## Already done

- The frontend has separate Analytics and Student Progress routes and screens.
- The backend guide defines separate services: `quiz_analytics.py` for one-quiz reporting and `student_progress.py` for cross-quiz/per-student reporting.
- The mock register maps the remaining placeholders to endpoints, including dashboards, student materials, download URLs, quiz selectors, and subject filters.

## Not to be done in this phase

- Do not merge Analytics and Student Progress into one service or screen.
- Do not add messaging/broadcast controls to an at-risk panel.
- Do not expose one student's private result to another student.
- Do not treat hardcoded mock metrics as production fallback data once the API is connected.
- Do not change the architecture to student-owned material uploads or personalized quizzes.

## Work items

1. Implement per-quiz analytics: question accuracy, grade distribution, weak topics, attempt counts, and clearly defined denominator/empty-state behavior.
2. Implement cross-quiz student progress: roster, average score, completion ratio, last active, at-risk flag, subject filtering, and drill-down detail.
3. Define the at-risk rule as a documented, testable policy rather than a UI guess. Keep it configurable if the team expects to tune it after observing demo data.
4. Add teacher dashboard stats and recent activity read models. Avoid N+1 queries; use aggregate SQL or explicit materialized/read-model queries where helpful.
5. Add student dashboard stats, accessible subject cards, recent materials, and paginated/filterable student materials endpoints.
6. Complete download URL, owner attribution, teacher roster, subject tabs, and all remaining API wrappers listed in the frontend mock register.
7. Add loading, empty, retry, unauthorized, processing, and failed states to every connected page. Do not hide backend errors behind indefinite spinners.
8. Remove or quarantine mock constants only after the real endpoint and an integration test exist. Keep intentional design constraints documented.
9. Add frontend tests for store transitions and critical screen/API behavior, plus a small browser smoke suite for role-specific navigation.

## Core API surface

- `GET /analytics?quiz_id={id}`
- `GET /student-progress?subject_id={id}` and `GET /student-progress/{student_id}` for authorized teachers
- `GET /teacher/dashboard-stats`, `GET /students/me/stats`
- `GET /students/me/materials`, with page/course/teacher/search filters
- `GET /teachers/me/subjects`, `GET /students/me/subjects`
- `GET /quiz selectors` through the existing quiz list contract rather than a duplicate mock-only endpoint

## Verification

- Analytics totals match hand-calculated fixtures for zero, one, and many attempts.
- Student Progress aggregate values match the same fixtures across multiple quizzes and subjects.
- At-risk status is deterministic and visible only to authorized teachers.
- Student dashboard and resources pages use pagination/filter parameters and never load unrelated student data.
- Every item in the mock register is either connected, intentionally retained as a design choice, or explicitly deferred with a reason.
- Desktop and responsive browser smoke tests cover login, student chat/citations, quiz attempt, flashcard study, teacher upload/status, analytics, and progress.

## Exit criteria

All Phase 1–4 user journeys work through real APIs, the two teacher reporting views are distinct and correct, and the frontend placeholder register has no unaccounted-for functional mocks.
