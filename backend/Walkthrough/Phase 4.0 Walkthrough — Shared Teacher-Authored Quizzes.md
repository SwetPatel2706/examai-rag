# Phase 4.0 Walkthrough — Shared Teacher-Authored Quizzes

## Goal and outcome

Phase 4 delivers the teacher-authored, class-shared quiz loop: a teacher can
create a manual draft quiz for a subject they teach, generate an AI draft from
ready materials for review, edit/review it, publish it, and students in that
subject take the same published quiz. Attempts are graded server-side per
student (score, per-question feedback, weak topics) with an idempotent,
atomic submit contract, and the resulting rows are ready for Phase 5 analytics.

## Important decisions

- **One quiz per topic, shared by the whole subject** — no per-student quiz
  generation. `POST /api/quiz/generate` returns a *draft* question set without
  inserting anything; the teacher must save it via `POST /api/quizzes` and
  explicitly publish. There is no student-facing "generate custom quiz" flow.
- **Separate serialisation schemas for teachers vs students.** `correct_option`
  lives only in `QuizQuestionOut` (teacher/internal). `QuizQuestionStudentOut`
  deliberately omits the field and is used exclusively in student-facing
  detail responses, so a correct answer can never leak to a taking student.
- **Published quizzes are immutable once any attempt exists** (HTTP 409 on
  edit/delete). A published quiz with *no* attempts remains editable, per the
  resolved contract. No versioning table is needed because question rows are
  frozen as of the attempt; corrections after attempts are explicit v2 scope.
- **Idempotency is enforced at the database, not just the service.** A
  `UNIQUE (quiz_id, student_id)` constraint on `quiz_attempts` means a retried
  insert (e.g. after a client timeout) raises a unique violation that the
  service catches and maps back to the existing attempt (200), instead of a
  409 or a duplicate row.
- **Atomicity.** Score, answers, and `submitted_at` are written in a single
  transaction — there is no window with answers but no score.
- **Server-side grading.** The client never supplies a score; an extra
  `score` field in the request body is ignored (validated by `dict` schema,
  never read).
- **Weak topics** are computed per `topic_tag`; only questions that carry a
  topic tag contribute, and any topic below 100% accuracy is a weak topic.
- **Time limit** is optional (`quizzes.time_limit_seconds`), surfaced to the
  quiz-taking screen. Deadline enforcement is intentionally client-timer side
  in this phase: there is no `started_at` column in the schema, so the server
  grades whatever arrives on submit.
- **Owner-only edits.** A co-teacher in the same subject can view quizzes but
  only the authoring teacher can edit/delete/publish, mirroring the material
  owner rule. Students get 403 (not 404) for un-enrolled subjects, but drafts
  inside an enrolled subject are hidden with 404.

## Main files

- `app/models/quiz.py` — added `time_limit_seconds` to `Quiz`, the
  `uq_quiz_attempt_student` unique constraint on `QuizAttempt`, and
  delete-orphan cascades on questions/attempts.
- `app/schemas/quiz.py` — request/response schemas, `QuizQuestionStudentOut`
  (no `correct_option`), and the `QuizQuestionLLMOutput` structured-output spec.
- `app/services/quiz/manual_service.py` — draft create/edit/delete/publish,
  role+ownership+immutability gates, teacher/student list & detail retrieval.
- `app/services/quiz/ai_generate_service.py` — RAG retrieval + Gemini draft
  generation with the error-aware retry convention (verbatim error + bad
  response + schema on retry), exact question-count enforcement.
- `app/services/quiz/grading_service.py` — answer validation, score & weak
  topic computation, idempotent submit, own-attempt retrieval, serialisation.
- `app/routes/quizzes.py` — thin API layer (list/detail are role-aware).
- `app/main.py` — registered the quizzes router; removed the quizzes stub.
- `app/routes/stubs.py`, `tests/test_smoke.py` — dropped the now-implemented
  `/api/quizzes` stub and its smoke assertions.
- `migrations/versions/b8f4a1d9c2e7_phase_4_quiz_time_limit_and_unique_attempts.py`
  — adds `quizzes.time_limit_seconds` and the attempt unique constraint.
- `tests/test_phase_4.py` — 29 tests covering the full contract.

## API surface

- `GET /api/quizzes`, `GET /api/quizzes/{quiz_id}` (role-aware)
- `POST /api/quizzes`, `PATCH /api/quizzes/{quiz_id}`, `DELETE /api/quizzes/{quiz_id}`
- `POST /api/quizzes/{quiz_id}/publish`
- `POST /api/quiz/generate` (`{subject_id, material_ids, topic, question_count?}`)
- `POST /api/quiz-attempts` (`{quiz_id, answers}`) — idempotent
- `GET /api/quiz-attempts/{attempt_id}` (own attempt only)

## Checks run

- `./venv/bin/pytest` — **58 passed** (29 pre-existing + 29 new Phase 4).
- `./venv/bin/alembic heads` — `b8f4a1d9c2e7 (head)` on top of the initial schema.
- OpenAPI scan confirms all six quiz paths are registered.

## Pitfalls and lessons

- **Pydantic v2 embeds the original exception in validation-error `ctx`,
  which is not JSON-serializable** — any 422 in this codebase was silently
  turning into a 500. Fixed in `app/main.py`'s validation handler by stringifying
  non-scalar `ctx` values before returning the error envelope.
- **SQLAlchemy instances only hold a *weak* reference to their session.**
  A seeded session that goes out of scope is GC'd and its objects detach
  (`DetachedInstanceError` on lazy load). Tests must keep the seed session
  alive for the duration of the test.
- The malformed-short-option-list rule is enforced twice: `Field(min_length=2)`
  for schema-level rejection and a shared `validate_question_shape()` used by
  both the manual input schema and the AI structured-output schema.
- Retry tests for the AI generator use a fake LLM that returns a wrong
  question count first and the correct count second, proving the error-aware
  retry path fires exactly once before success, and that persistent
  malformed output surfaces as a 502 draft-generation error.

## Follow-up / known limitations

- Frontend wiring and removal of quiz mock arrays is explicitly deferred to the
  standalone frontend-backend integration phase, per the plan.
- Post-publish corrections are v2 scope; this phase freezes question rows via
  the attempt-exists guard only.
- Server-side deadline enforcement for timed quizzes is not implemented (no
  `started_at`); the quiz-taking timer is client-side in this phase.
- Analytics read models over attempts are Phase 5 scope.
