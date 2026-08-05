# Phase 5 — Teacher Analytics and Student Progress

## Goal

Provide the two distinct teacher reporting views as backend read models calculated from real shared-quiz attempts. This phase defines and verifies analytics contracts; it does not wire the frontend.

## Already done

- The frontend has separate Analytics and Student Progress routes and screens.
- The backend guide defines separate services: `quiz_analytics.py` for one-quiz reporting and `student_progress.py` for cross-quiz/per-student reporting.
- Shared quiz attempts and grading contracts are established in Phase 4.

## Not to be done in this phase

- Do not merge Analytics and Student Progress into one service or screen.
- Do not add messaging/broadcast controls to an at-risk panel.
- Do not expose one student's private result to another student.
- Do not treat hardcoded mock metrics as backend fallback data.
- Do not wire frontend stores, screens, or API wrappers; Phase 6 owns that integration.

## Work items

1. Implement per-quiz analytics: question accuracy, grade distribution, weak topics, attempt counts, and clearly defined denominator/empty-state behavior. Before returning `GET /analytics?quiz_id={id}`, verify the requesting teacher belongs to the quiz's subject and that the quiz belongs to that subject. Return 403 for unauthorized teachers and add IDOR tests.
2. Implement cross-quiz student progress: roster, average score, completion ratio, last active, at-risk flag, subject filtering, and drill-down detail. Verify teacher membership for every queried subject and related detail endpoint. Add IDOR tests.
3. Define the at-risk rule as a documented, testable policy. Keep it configurable if the team expects to tune it after observing demo data.
4. Add teacher dashboard stats and recent activity read models. Avoid N+1 queries; use aggregate SQL or explicit read-model queries where helpful.
5. Add student dashboard stats, accessible subject cards, recent materials, and paginated/filterable student materials endpoint contracts.
6. Define download URL, owner attribution, teacher roster, subject tabs, and quiz-selector response contracts needed by the frontend integration phase.

## Core API surface

- `GET /analytics?quiz_id={id}`
- `GET /student-progress?subject_id={id}` and `GET /student-progress/{student_id}` for authorized teachers
- `GET /teacher/dashboard-stats`, `GET /students/me/stats`
- `GET /students/me/materials`, with page/course/teacher/search filters
- `GET /teachers/me/subjects`, `GET /students/me/subjects`
- Quiz selectors through the existing quiz list contract

## Verification

- Analytics totals match hand-calculated fixtures for zero, one, and many attempts.
- Student Progress aggregate values match the same fixtures across multiple quizzes and subjects.
- At-risk status is deterministic and visible only to authorized teachers.
- Student dashboard and resources endpoint contracts support pagination/filter parameters and never return unrelated student data.
- API schemas, error envelopes, and authorization behavior are covered by backend contract tests.

## Exit criteria

Analytics and Student Progress are distinct, authorized, fixture-tested backend capabilities with stable contracts ready for Phase 6 frontend integration.
