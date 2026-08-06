# Phase 6.4 fixes Walkthrough

## Goal
Verify each inline/nitpick code-review finding against the current code, fix
only the ones that are still valid, and keep the changes minimal. Six findings
were reported: two in `backend/app/seed.py`, one in the Phase 6.3 walkthrough,
two in `README.md`/`backend/README.md` (plus a doc-consistency sweep of
`agents.md` and `backend/agents.md`), and one nitpick in
`backend/tests/test_review_fixes.py`.

All six were still valid against the code at review time; none were skipped.

## Changes Made

### 1. `backend/app/seed.py` — reconcile quiz questions by a stable dataset key
**Problem:** `_reconcile_quiz_questions` matched existing rows by exact
`question_text`. If an operator edited a seeded question's text in
`seed_data.py`, a re-seed dropped the old row (delete-orphan) and inserted a
replacement with a new PK — orphaning `QuizAttempt.answers` entries that are
keyed by `str(question_id)`.

**Fix:** introduced a stable, immutable dataset identifier, `seed_key`, and
persisted it on every seeded question:
- `backend/app/models/quiz.py` — new nullable `seed_key` column on
  `QuizQuestion` (NULL for teacher-authored / AI-generated questions, which the
  seeder never reconciles).
- `backend/migrations/versions/a7c9e5b3d1f4_quiz_questions_seed_key.py` — adds
  the column.
- `_question_seed_key(quiz_topic, index)` derives the key as
  `"{quiz_topic}::q{index}"`. Because the key is derived from the dataset
  position (not the text), editing a question's text or options never changes
  its key. The convention "append new questions, don't re-insert" is documented
  in the helper docstring and the data file.
- `_reconcile_quiz_questions(quiz_topic, existing, incoming)` matches incoming
  questions by `seed_key`, updates **all** mutable fields in place (now
  including `question_text`, plus `options`, `correct_option`, `topic_tag`,
  `difficulty`), and keeps the original PK so `QuizAttempt.answers` stay valid.
  Legacy rows with `seed_key IS NULL` are matched once by `question_text` to
  backfill their key (one-time upgrade path).
- The create branch in `seed_data()` also assigns the derived `seed_key`, so
  freshly seeded rows match on the next re-run.

### 2. `backend/app/seed.py` + `backend/app/seed_data.py` — environment-guarded seed password
**Problem:** the credential block claimed "the seeder will abort when
`APP_ENV=production` and the variable is absent" but only printed a warning, so
a bare demo password could still reach a live Supabase tenant. Separately, all
four `TEACHERS` rows in `seed_data.py` hard-coded `"password": "Password123!"`,
so `provision_user` used the demo password for teachers regardless of
`SEED_PASSWORD`.

**Fix:**
- The module-level block now reads `settings.APP_ENV` (loaded via the existing
  `app.config` import chain) and raises `RuntimeError` when
  `APP_ENV == "production"` and `SEED_PASSWORD` is unset, before any
  `provision_user` call can run. The `Password123!` fallback + warning is kept
  for non-production environments.
- Removed the hard-coded `"password"` from the four `TEACHERS` dicts so every
  seeded account goes through the env-driven `PASSWORD`.

### 3. `backend/Walkthrough/Phase 6.3 …Documentation.md`
The "Follow-up / limitations" tip suggested `./venv/bin/pip install -r
requirements.txt` to refresh the root venv — `./venv/bin` is only valid from
`backend/`. Rewrote it to state the root-level command
`.venv/bin/pip install -r backend/requirements.txt` and the equivalent from
`backend/` (`../.venv/bin/pip install -r requirements.txt`).

### 4. `README.md` + `backend/README.md` — demo-login wording
Both files claimed every seeded account uses `Password123!` unconditionally.
Updated to the source of truth: seeded accounts use the configured
`SEED_PASSWORD`, with `Password123!` only the non-production/local fallback,
and `backend/README.md` now states the seeder refuses to run in production
without `SEED_PASSWORD`. Account tables were left consistent (they list
roles/emails/subjects, no passwords).

### 5. `README.md`, `agents.md`, `backend/README.md`, `backend/agents.md` — clean-checkout venv provisioning
The docs assumed `backend/venv/` already existed ("canonical venv already
provisioned"). Added the clean-checkout provisioning steps (create
`backend/venv/` with `python3.14 -m venv …` and install deps) to the
Prerequisites/Venv sections of all four files, with both the root-level and
`backend/`-relative command forms.

### 6. `backend/tests/test_review_fixes.py` — extended reconciliation assertions
The existing reconciliation test now:
- Seeds two `QuizQuestion`s with `seed_key`s (`Algorithms::q0`, `Algorithms::q1`)
  and captures their IDs before reconciling.
- Asserts `apply_material_updates` updates `display_name` and `notes`.
- Reconciles a fixture where q0's text changes and q1 is unchanged, then after
  `session.commit()` + reload verifies: the unchanged question keeps its ID and
  its reconciled `options`/`correct_option`; the changed question keeps its ID
  while its text/options/correct_option/topic_tag/difficulty update in place;
  and the question set is exactly the two original IDs (no replacement created).

## Validation Results
- `./venv/bin/pytest -q` from `backend/` — **77 passed** (~1.2 s), fully
  offline.
- `./venv/bin/alembic upgrade head --sql` — renders the expected
  `ALTER TABLE quiz_questions ADD COLUMN seed_key VARCHAR;` and confirms
  `a7c9e5b3d1f4 (head)`.
- Import-time password guard verified in three scenarios: `APP_ENV=local`
  (fallback `Password123!` + warning), `APP_ENV=production` without
  `SEED_PASSWORD` (raises `RuntimeError`), and `APP_ENV=production` with
  `SEED_PASSWORD` set (uses the env value).

## Pitfalls / lessons
- The `QuizQuestion` PK is the stable reference that `QuizAttempt.answers`
  JSON points at — the whole fix is about never churning that PK for a question
  that still exists in the dataset. Text was never a safe identity because text
  is exactly the mutable field.
- `seed_key` is derived (topic + position), not hard-coded in `seed_data.py`.
  That is deliberate: minimal diff and stable across text edits. The trade-off
  is positional stability — inserting/reordering questions shifts keys, which
  is why the "append, don't insert" convention matters. Documented in the
  helper docstring and the new walkthrough.
- Legacy rows (seeded before this change) have `seed_key IS NULL`; the
  text-based backfill runs once so existing dev databases upgrade idempotently.
  A question whose text changed in the *same* commit as this upgrade would not
  backfill-match; going forward the key path handles all text edits.
- The environment guard reads `settings.APP_ENV`, not raw `os.environ`, because
  pydantic-settings merges shell env + `.env.local` — someone running the seed
  from `backend/` with `APP_ENV=production` only in `.env.local` must still be
  caught.
- Hard-coded passwords anywhere in the dataset silently bypass `SEED_PASSWORD`;
  a security review of the seed should keep all credentials env-driven.

## Follow-up / known limitations
- The one-time legacy backfill caveat above (text edited in the same commit as
  the `seed_key` upgrade) can produce a duplicate for that single question.
- The `PYC`/`__pycache__` files under `backend/` are tracked in git from earlier
  sessions and show as modified after test runs; they are not part of the fix.
