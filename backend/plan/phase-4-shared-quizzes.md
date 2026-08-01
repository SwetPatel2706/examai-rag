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
4. Implement draft review/update/delete and publish. Define whether published quizzes are immutable or versioned; default to immutable once attempts exist.
5. Implement student list/detail of published quizzes for accessible subjects. Hide drafts and quizzes outside subject membership.
6. Implement attempt creation, answer validation, idempotent submit behavior, score calculation, weak-topic calculation, and own-result retrieval. Do not trust a client-supplied score.
7. Add duplicate-attempt policy, timeout policy if a quiz has a time limit, and safe handling for submitted/expired attempts.
8. Replace quiz mocks with thin frontend API modules and wire create/edit, generation, publish, take, submit, and results flows.

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
- Teacher and student frontend flows work without the mock arrays or navigation-state-only result shortcut.

## Exit criteria

A teacher can create a manual quiz, optionally generate and edit a draft, publish it, and see students take the same quiz. Students receive a server-calculated personal result; all attempt records are ready for Phase 5 analytics.
