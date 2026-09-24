# Phase 6.8 fixes Walkthrough — Middle-Ground Subject Enrollment in Seed Data

## Goal and outcome

Follow-up to the integration seed data. The demo dataset previously used
hand-written partial enrollment (16–17 students per subject, each student in
2–3 of the 4 subjects). Reviewers found every subject's roster and dashboard
statistics differed, and asked whether making every student enrolled in every
subject would be correct/simpler/better.

Decided (after analysis) on a **middle-ground** enrollment: all 26 demo
students are now enrolled in all four subjects except a deliberate ~2-student
exclusion set per subject. Outcome: teacher rosters and per-subject analytics
`class_size`/`completion_pct` are near-identical and directly comparable across
subjects, while a live "not enrolled" path (403 / missing from the class
roster) still exists for demos and reviews to observe the authorization model
being enforced.

Resulting pattern: every subject has exactly **24 enrolled students** (2
excluded); **18 students are in all 4 subjects**, **8 students are in exactly
3** (each excluded from exactly one subject, none from two).

## Important decisions

- **Middle ground over full enrollment.** Full enrollment (every student,
  every subject) is the simplest for a demo but silently defeats the
  load-bearing authorization story: `student_subjects` is the gate that denies
  subject access (403) when no row exists. If every student were in every
  subject, no live user could ever observe that enforcement. Keeping a small
  exclusion set preserves a demonstrable 403 while still giving near-uniform
  rosters.
- **Deterministic, explicit exclusions.** Exclusions are hand-picked per
  subject (with name comments) in a dedicated `_SUBJECT_EXCLUSIONS` dict, then
  `SUBJECT_ENROLLMENTS` is derived from the full `STUDENTS` list minus the
  exclusions. This keeps the roster greppable and tweakable by an operator
  while eliminating the risk of typos that literal 26x4 lists would bring.
  Consistent with the module's "kept predictable so the demo roster stays
  reproducible" principle.
- **No exclusions double up on a student.** Each excluded student loses exactly
  one subject, so everyone remains in 3–4 subjects — realistic course-load
  variation in completion/comparison is preserved, and no student accidentally
  ends up with a near-empty dashboard.

## Files changed

- `backend/app/seed_data.py` — replaced the literal `SUBJECT_ENROLLMENTS`
  lists (16–17 students per subject) with `_ALL_STUDENT_EMAILS` +
  `_SUBJECT_EXCLUSIONS` + a derived `SUBJECT_ENROLLMENTS`; updated the inline
  comment to document the middle-ground policy and its intent.

## Why nothing else changed

- `backend/app/seed.py` derives the attempt mixer's `enrolled_students`
  directly from `SUBJECT_ENROLLMENTS` (seed.py:331), so published-quiz attempt
  generation scales automatically — no seed-logic change required.
- Services (`subject_service.py`, `analytics/student_progress.py`,
  `analytics/quiz_analytics.py`, `analytics/dashboard.py`) all read
  `student_subjects` generically; no schema or query changes.
- No tests reference `SUBJECT_ENROLLMENTS`; every test module builds its own
  isolated Postgres/SQLite fixtures (see `tests/conftest.py`), so the suite is
  independent of seed contents.
- No docs carried the old roster counts except the `seed_data.py` comment
  itself and the historical `Phase 6.0` walkthrough (left as-is).

## Verification

- `./venv/bin/python -m app.seed_data` import sanity check (from `backend/`,
  no external services): asserted each subject has exactly 24 enrolled
  students, every student email is a member of `STUDENTS`, and every student
  appears in 3–4 subjects with the expected 18/8 split. Passed.
- `./venv/bin/pytest` from `backend/`: **82 tests passed** in 0.83 s
  (unchanged from baseline; one pre-existing Starlette deprecation warning
  about `httpx`/`starlette.testclient`).

## Pitfalls and lessons

- **"Simpler" isn't always "better" for a demo.** Populating an authorization
  table trivially removes failure paths rather than exercising them. The
  enforcement logic is a primary review surface (403-not-404, IDOR guards), so
  the demo data should keep at least one reachable denied state per subject.
- **Seed hotspots propagate silently.** `SUBJECT_ENROLLMENTS` directly drives
  generated quiz-attempt volume. Going from ~16 to 24 students per subject
  raises seeded `QuizAttempt` rows by roughly 45% (8 published quizzes × up to
  24 students) — demo analytics totals shift, which is expected but worth
  knowing before re-seeding.
- **Re-seeding is idempotent.** `seed.py` skips existing
  `StudentSubject` rows and only inserts new (subject, student) pairs, so
  applying this change to an already-seeded local DB only adds the previously
  missing pairings.

## Follow-up / known limitations

- A live `./venv/bin/python -m app.seed` run against local Supabase (and
  optionally `--with-rag` for Qdrant content) is available if the demo DB
  should be refreshed; not performed here to avoid touching external services.
- The exact excluded student set is a demo-data choice, not semantics; update
  `_SUBJECT_EXCLUSIONS` in `seed_data.py` if different "not enrolled" names are
  preferred.