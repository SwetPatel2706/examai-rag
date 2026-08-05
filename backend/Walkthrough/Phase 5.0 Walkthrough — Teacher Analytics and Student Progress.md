# Phase 5.0 Walkthrough — Teacher Analytics and Student Progress

## Goal and outcome

Phase 5 turns real shared-quiz attempts into the two teacher reporting views as
backend read models: **per-quiz analytics** (`quiz_analytics.py`) and
**cross-quiz student progress** (`student_progress.py`), plus teacher/student
dashboard read models and the subject/resource contracts the Phase 6 frontend
integration will consume. It is read-only: no new tables, no migration, and no
mock/hardcoded metrics as a fallback. Zero-attempt quizzes and students have
explicit, documented empty states rather than fabricated numbers.

## Important decisions

- **Two distinct services, never merged.** Per `agents.md`, one-quiz reporting
  lives in `app/services/analytics/quiz_analytics.py` and cross-quiz/per-student
  reporting in `app/services/analytics/student_progress.py`. Dashboard stats get
  a third module (`dashboard.py`) that reuses both services' internals.
- **Read models only from existing tables.** `alembic heads` stays at
  `b8f4a1d9c2e7` — Phase 5 adds zero schema. All aggregation runs as aggregate
  SQL (`GROUP BY`, `func.avg/count/distinct`, a single `CASE` grade-band query),
  not per-row Python loops, to avoid N+1 over attempts.
- **Documented, configurable at-risk policy.** `at_risk = assessed AND
  (avg_score < AT_RISK_MIN_AVG_SCORE OR completion_pct < AT_RISK_MIN_COMPLETION_PCT)`,
  where `assessed` requires ≥1 attempt in scope. Zero-attempt students are never
  flagged. Thresholds are env knobs (`AT_RISK_MIN_AVG_SCORE=60`,
  `AT_RISK_MIN_COMPLETION_PCT=50`) with the weak-topic threshold alongside
  (`WEAK_TOPIC_ACCURACY_THRESHOLD=70`), so the team can tune after demo data.
- **Completion ratio** = attempted published quizzes / published quizzes in
  scope, per student across their enrolled (taught) subjects. The roster builds
  a `published_per_subject` map once and sums it per student — the same map the
  dashboard's `at_risk_map` uses, keeping recent-activity flags consistent with
  the roster.
- **Question accuracy denominator = attempt count.** A validated attempt always
  answers every question (enforced by grading service), so there is no
  "answered vs not" variance; `correct_count / attempt_count`.
- **Authorization = 403 for everything unauthorized.** Teacher endpoints gate on
  `subject_teachers` via `check_subject_access`; a teacher filtering a subject
  they don't teach, or drilling into a student with no shared taught subject,
  gets 403 (never 404) so endpoint existence can't be probed. A *missing*
  student row is the one 404 on detail.
- **Stable contracts.** `app/schemas/analytics.py` defines the response schemas
  (grade bands A–F with count + integer pct, per-question accuracy, weak topics,
  roster rows, quiz history, dashboard stats). Grade bands are canonical
  A(90–100)/B(80–89)/C(70–79)/D(60–69)/F(0–59). All percentages are integers.
- **No frontend wiring.** This phase only exposes read-model endpoints; Phase 6
  owns stores, screens, and API wrappers.

## Main files

- `app/config.py` — added `AT_RISK_MIN_AVG_SCORE`, `AT_RISK_MIN_COMPLETION_PCT`,
  `WEAK_TOPIC_ACCURACY_THRESHOLD` (int, 0–100). `.env.example` documents them.
- `app/schemas/material.py` — `MaterialResponse` gained optional `teacher_name`
  for owner attribution on student-facing lists.
- `app/schemas/analytics.py` — all Phase 5 response schemas
  (`QuizAnalyticsOut`, `StudentProgressRosterOut`, `StudentProgressDetailOut`,
  `TeacherDashboardStatsOut`, `StudentStatsOut`, subject-card schemas, etc.).
- `app/services/analytics/quiz_analytics.py` — `get_quiz_analytics`: quiz +
  `joinedload` questions/subject, `check_subject_access` on the quiz's subject,
  class size, completion %, avg, grade distribution, per-question accuracy,
  weak-topic aggregation. `_grade_distribution`/`GRADE_BANDS` are shared.
- `app/services/analytics/student_progress.py` — `_at_risk`, `_published_per_subject`,
  `_attempt_aggregates` (one grouped query per student: attempt count, distinct
  quiz count, avg score, max submitted_at), `at_risk_map` (dashboard reuse),
  roster + subject filter, and drill-down detail with quiz history.
- `app/services/analytics/dashboard.py` — `get_teacher_dashboard_stats` (one SQL
  `CASE`-band distribution, distinct active students, ready materials, draft +
  published quizzes, avg section score, 10 most recent attempts with at-risk
  flags), `teacher_subject_cards`, `student_subject_cards` (teachers + progress),
  `get_student_stats` (quizzes taken, distinct weak-topic names, avg, recent
  ready materials with attribution).
- `app/routes/analytics.py` — thin teacher-only routes: `GET /api/analytics`,
  `GET /api/student-progress`, `GET /api/student-progress/{student_id}`,
  `GET /api/teacher/dashboard-stats`.
- `app/routes/me.py` — thin routes: `GET /api/teachers/me/subjects`,
  `GET /api/students/me/stats`, `GET /api/students/me/subjects`,
  `GET /api/students/me/materials` (reuses `get_materials` + `serialize_material`).
- `app/services/material_service.py` — `serialize_material` helper filling
  `teacher_name` from the material's teacher.
- `app/main.py` — registered `analytics` and `me` routers.
- `app/routes/stubs.py` + `tests/test_smoke.py` — removed the `/api/analytics`
  501 stub and its smoke assertion.
- `tests/test_phase_5.py` — 19 contract tests.

## API surface

- `GET /api/analytics?quiz_id={id}` (teacher of the quiz's subject)
- `GET /api/student-progress?subject_id={optional}` and
  `GET /api/student-progress/{student_id}` (teacher)
- `GET /api/teacher/dashboard-stats` (teacher)
- `GET /api/students/me/stats`, `GET /api/students/me/subjects`,
  `GET /api/students/me/materials` (`page`/`size`/`subject_id`/`teacher_id`/`search`)
- `GET /api/teachers/me/subjects` (teacher)

## Checks run

- `PYTHONPATH=. ./venv/bin/pytest -q` — **73 passed** (15 smoke + 3 Phase 1 +
  7 Phase 2 + 29 Phase 4 + 19 new Phase 5). The three initially-failing new
  tests were test bugs, not code bugs: a teacher (not a student) posting an
  attempt (rejected by `require_student`), a wrong hand-computed average
  (66.67 → 67, not 50), and a fixture where the "unenrolled" subject actually
  was an enrolled one.
- `./venv/bin/alembic heads` — `b8f4a1d9c2e7 (head)`, unchanged (read-only phase).
- OpenAPI scan confirms all analytics/me/student-progress paths registered and
  `/api/analytics` is no longer a 501 stub.

## Pitfalls and lessons

- **The attempt endpoint is student-only.** In tests, seeding attempts via the
  API requires `mock_auth(student)`; a teacher-mocked post is silently 403.
  Prefer direct `QuizAttempt` inserts with explicit `submitted_at` when a test
  needs deterministic ordering.
- **A student enrolled in multiple subjects legitimately sees all of them.**
  "Never returns unrelated data" must be tested with a subject nobody is
  enrolled in, not by assuming an enrolled student can't see one of their own
  subjects.
- **Round-half-to-even matters for fixtures.** `round()` on 66.67 gives 67;
  assert the actual banker's-rounding output rather than "obvious" integers.
- **A recent-activity row's at-risk flag must use the same policy as the
  roster.** Sharing `at_risk_map` (built from `_attempt_aggregates` +
  `_published_per_subject`) keeps the two views consistent by construction.

## Follow-up / known limitations

- Frontend integration (stores, screens, API wrappers) is Phase 6 scope.
- Per-student personalized quizzes and teacher↔student messaging remain v2 /
  out-of-scope; analytics deliberately report on the shared-quiz model only.
- At-risk and weak-topic thresholds are tunable via env but are not yet exposed
  as admin-configurable runtime settings.
