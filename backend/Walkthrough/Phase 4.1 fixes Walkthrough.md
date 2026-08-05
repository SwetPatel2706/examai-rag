# Phase 4.1 fixes Walkthrough

## Goal
Address code-review findings against Phase 4 (Shared Teacher-Authored Quizzes),
verifying each against current code, fixing valid issues, and skipping
inapplicable ones with reasons.

## Findings addressed (7 applied)

### 1. `ai_generate_service.py` — API errors escape retry loop
**Issue:** Exceptions from `llm.generate_json` other than `StructuredOutputError`
(timeouts, transport, quota, auth) escaped the retry loop and became HTTP 500s.

**Fix:** Added an inner try/except around `generate_json` that catches any
non-`StructuredOutputError` exception and wraps it in a `StructuredOutputError`,
keeping the existing retry + final `HTTPException(502)` flow intact.

### 2. `grading_service.py` — Weak-topic accuracy counts unanswered questions
**Issue:** `stats["total"]` incremented for every tagged question in the quiz,
even those the student didn't answer, inflating the denominator and skewing
accuracy.

**Fix:** Guarded the increment with `if question_id in answers`, so only
answered tagged questions contribute to per-topic accuracy.

### 3. `manual_service.py` — `questions: null` clears quiz questions
**Issue:** When `QuizUpdateRequest` includes `"questions": null`, Pydantic sets
`questions` to `None` but `model_dump(exclude_unset=True)` still includes the
key, causing the update path to call `.clear()` and then crash on iterating
`None`.

**Fix:** Added `and request.questions is not None` to the guard so the
replacement path is skipped when questions is explicitly null.

### 4. Migration deduplication before unique constraint
**Issue:** The migration creates `UNIQUE(quiz_id, student_id)` on
`quiz_attempts` without first de-duplicating existing rows, which would fail if
any duplicates exist.

**Fix:** Added a `DELETE FROM quiz_attempts` using `DISTINCT ON` to retain only
the newest attempt per (quiz_id, student_id) pair before creating the
constraint. Uses PostgreSQL-specific `DISTINCT ON`.

### 5. `manual_service.py` — N+1 queries on quiz list endpoints
**Issue (nitpick):** Both `list_teacher_quizzes` and `list_student_quizzes`
returned bare `Quiz` objects without eager-loading `questions` or `teacher`,
causing N+1 queries when the route serializer accessed them.

**Fix:** Added `.options(joinedload(Quiz.questions), joinedload(Quiz.teacher))`
to both list queries.

### 6. `quiz.py` schema — Whitespace normalization in `validate_question_shape`
**Issue (nitpick):** Options were stripped for blank and uniqueness checks but
the raw (possibly whitespace-padded) values were kept. `correct_option` wasn't
normalized at all for the membership check, so `" A"` would fail even if `"A"`
was an option.

**Fix:** The function now strips all options and `correct_option` once upfront,
uses the normalized values for all checks, and returns them. Both
`QuizQuestionInput` and `QuizQuestionLLMItem` model validators assign the
normalized values back to their fields.

### 7. `test_phase_4.py` — Use real `QuizGenerateRequest` schema in AI tests
**Issue (nitpick):** Three tests used `type("Req", (), {...})()` dynamic objects
instead of real `QuizGenerateRequest` instances, and one assertion caught bare
`Exception` instead of `HTTPException`.

**Fix:** Replaced all three with `QuizGenerateRequest(...)` and changed
`pytest.raises(Exception)` to `pytest.raises(HTTPException)`.

## Findings skipped (1)

### `grading_service.py` — Server-side time_limit enforcement
**Reason:** Enforcing `quiz.time_limit_seconds` requires a server-side
`started_at` timestamp on `QuizAttempt` plus a "start quiz" endpoint to record
when the student began. This is a structural addition (new model field, new
migration, new endpoint, new route) beyond a minimal fix. Belongs in its own
task.

## Files changed

| File | Change |
|------|--------|
| [ai_generate_service.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/quiz/ai_generate_service.py) | Wrap `generate_json` in inner try/except → `StructuredOutputError` |
| [grading_service.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/quiz/grading_service.py) | Only count answered tagged questions in weak-topic stats |
| [manual_service.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/quiz/manual_service.py) | Guard `questions` replacement + add `joinedload` to list queries |
| [quiz.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/schemas/quiz.py) | Normalize whitespace in `validate_question_shape`, propagate to models |
| [migration b8f4a1d9](file:///Users/swet/Developer/Project/examai-rag/backend/migrations/versions/b8f4a1d9c2e7_phase_4_quiz_time_limit_and_unique_attempts.py) | Deduplicate quiz_attempts before UNIQUE constraint |
| [test_phase_4.py](file:///Users/swet/Developer/Project/examai-rag/backend/tests/test_phase_4.py) | Use `QuizGenerateRequest` + assert `HTTPException` |

## Test results

All 29 tests in `test_phase_4.py` pass (0.72s, no failures).
