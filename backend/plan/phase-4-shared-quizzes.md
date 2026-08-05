# Phase 4 — Shared Teacher-Authored Quizzes

## Goal

Implement one comparable quiz per topic/subject: teachers author questions manually or generate an AI draft from approved materials, review/edit it, publish it, and students take the shared published quiz. Attempts are graded per student and feed later analytics.

## Already done

- The shared-quiz rule, database shape, draft/published lifecycle, and manual/AI-assisted parity are documented.
- The frontend contains quiz list, quiz-taking, result, and teacher create/edit screens.
- The mock register identifies the intended endpoints and confirms that the student custom-quiz card must not be wired.
- The RAG retriever and structured-output retry helper are available conceptually from Phase 3.

## Not to be done in this phase

- Do not generate a different quiz per student.
- Do not expose a student-facing “Generate Custom Quiz” flow.
- Do not show classmate scores on a student's result screen.
- Do not publish AI output without teacher review/approval.
- Do not build analytics in the quiz service; Phase 5 owns read models and reporting.

## Work items

1. Implement quiz, question, and attempt schemas/models with subject and teacher ownership checks. Support `manual` and `ai_generated` source tags.
2. Implement manual draft creation/editing with validation for question text, options, correct option, topic tag, and difficulty. Prevent malformed short option lists.
3. Implement AI draft generation from selected ready materials and topic using the same retriever and structured-output retry conventions as chat. Return draft questions without inserting them as published.
4. Implement draft review/update/delete and publish.  **Resolved contract: published quizzes are immutable once any attempt exists.**  A `POST /quizzes/{quiz_id}/publish` call transitions status from `draft` to `published`.  Once the first `quiz_attempt` row is created for a quiz, all edit and delete operations on that quiz and its questions must be rejected (HTTP 409).  Scoring and answer explanations always use the question rows as they existed at the moment of the attempt — no versioning table needed because the questions are frozen.  If the team later needs post-publish corrections, that is an explicit v2 scope item.
5. Implement student list/detail of published quizzes for accessible subjects. Hide drafts and quizzes outside subject membership.  **Use separate response schemas for teachers and students**: the teacher/internal schema includes `correct_option`; the student-facing `GET /quizzes/{quiz_id}` response includes `question_text` and `options` but **must never include `correct_option`**.  Define a `QuizQuestionStudentOut` Pydantic model that omits `correct_option` and use it exclusively in student-facing serialisation paths.
6. Implement attempt creation, answer validation, idempotent submit behavior, score calculation, weak-topic calculation, and own-result retrieval. Do not trust a client-supplied score.  **Idempotency contract**: enforce a `UNIQUE (quiz_id, student_id)` database constraint on `quiz_attempts` so a second insert from a client retry raises a conflict that the service catches and maps to the existing attempt (return 200 with the existing attempt rather than 409 or a duplicate row).  **Atomicity**: score calculation and the `submitted_at` update must occur within a single database transaction — a mid-flight crash must not leave a row with answers but no score, or a score without a submitted timestamp.
7. Add duplicate-attempt policy (enforced by the uniqueness constraint above), timeout policy if a quiz has a time limit, and safe handling for submitted/expired attempts.  Add test coverage for: repeated submissions (same client, same answers), client retries after a simulated timeout (same idempotency semantics), and score recalculation if the endpoint is called twice.
8. Finalize and contract-test the quiz API boundary for create/edit, generation, publish, take, submit, and results flows. Defer replacing quiz mocks and wiring screens to the standalone frontend-backend integration phase.

## Core API surface

- `GET /quizzes`, `GET /quizzes/{quiz_id}`
- `POST /quizzes`, `PATCH /quizzes/{quiz_id}`, `POST /quizzes/{quiz_id}/publish`
- `POST /quiz/generate` with `{subject_id, material_ids, topic, question_count?}`
- `POST /quiz-attempts` with `{quiz_id, answers}`
- `GET /quiz-attempts/{attempt_id}`

## Verification

- A teacher can only author for an authorized subject and only generate from authorized ready materials.
- A student sees only published quizzes for accessible subjects and can submit only once according to the chosen policy.
- Scores, correct answers, and weak topics are computed server-side.
- AI-generated questions validate against the schema; malformed output is retried or rejected as a draft-generation error.
- A student result contains only that student's score, answers/result feedback, and weak topics.
- The quiz APIs support complete teacher and student flows with stable response/error contracts. Frontend wiring and removal of mock arrays/navigation shortcuts are verified in the standalone integration phase.

## Exit criteria

A teacher can create a manual quiz, optionally generate and edit a draft, publish it, and see students take the same quiz. Students receive a server-calculated personal result; all attempt records are ready for Phase 5 analytics.

# The following things were not created during planning but instead during implementation of Phase 4

## Implementation status

Implemented in `app/models/quiz.py`, `app/schemas/quiz.py`,
`app/services/quiz/` (`manual_service.py`, `ai_generate_service.py`,
`grading_service.py`), `app/routes/quizzes.py`, and the migration
`migrations/versions/b8f4a1d9c2e7_phase_4_quiz_time_limit_and_unique_attempts.py`.
The manual verification account matrix and curl/Swagger walkthrough are
maintained in [`backend/README.md`](../README.md).

Automated verification covers teacher create/update/delete/publish, malformed
option validation, role and subject-membership authorization, student
visibility (no `correct_option` leak), server-side grading, idempotent
submission (service-level and DB-level), post-attempt immutability (409), and
the AI draft-generation retry machinery. Run `cd backend && PYTHONPATH=.`
`./venv/bin/pytest -q` before manual testing — 58 tests pass. A walkthrough of
this phase lives in
[`backend/Walkthrough/Phase 4.0 Walkthrough — Shared Teacher-Authored Quizzes.md`](../Walkthrough/Phase%204.0%20Walkthrough%20—%20Shared%20Teacher-Authored%20Quizzes.md).
