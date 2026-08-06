# Phase 6.5 fixes Walkthrough

## Task goal and outcome
Batch of code-review findings across seed, Qdrant, the Supabase auth client,
documentation, and one test. Each finding was verified against current code;
only still-valid issues were fixed, changes were kept minimal, and the whole
backend suite (77 tests) plus frontend lint were re-run green.

## Changes

### `backend/README.md`
- Prerequisites now say **Python 3.14** (was "Python 3.10+") to match the
  canonical venv (`backend/venv/`, Python 3.14.6).
- The `curl` login example now uses the shell-expanded `$SEED_PASSWORD`
  placeholder instead of hardcoding `Password123!`. The surrounding prose
  already stated that `Password123!` is only the fallback when `SEED_PASSWORD`
  is unset, so no further text change was needed there.

### `backend/app/auth/supabase_client.py`
- Added `logger = logging.getLogger(__name__)` following the module logging
  convention used elsewhere (e.g. `services/ingestion/pipeline.py`).
- The pagination loop in `_admin_get_user_by_email` is now bounded
  (`while page <= max_pages`, `max_pages = 100`), preserving normal early
  termination on short/empty batches.
- Logs a warning with HTTP status before breaking on non-200 responses, and
  logs the JSON parsing exception before breaking on decode failures.

### `backend/app/seed.py`
- `_reconcile_quiz_questions`: the legacy (`seed_key IS NULL`) text fallback
  now uses `legacy_by_text.pop(question_text, None)` instead of `.get(...)`,
  so two incoming questions with the same `question_text` can never reuse the
  same existing ORM object (duplicate-key reuse would have updated/returned
  the same row twice).
- `seed_rag_content`: skips a material (with a printed note) when
  `chunk_documents` or `embedder.embed` returns an empty result, before any
  `vectors[0]` indexing — the `--with-rag` run now continues past such
  materials. Removed the redundant `qdrant.ensure_collection(...)` call;
  `QdrantStore.upsert` performs collection initialization after validation.
- Moved SEED_PASSWORD resolution + the production guard out of module-level
  initialization into `resolve_seed_password()`, called at the top of
  `seed_data()`. `seed_data()` passes the resolved password as the default
  (`u.get("password", seed_password)`), preserving explicit per-user
  passwords. **Importing `app.seed` no longer raises** in production; the
  guard fires only when seeding actually starts.
- The answer-generation flow now builds `question_map` from
  `sorted(quiz.questions, key=lambda q: (q.seed_key or "", str(q.id)))`, so
  deterministic random draws (existing `pair_rng` logic untouched) no longer
  depend on database row order.

### `backend/app/utils/qdrant_client.py`
- `upsert`: length-consistency validation now runs **before** the
  `if not vectors` early return, so mismatched `vectors`/`payloads`/`ids`
  always raise the `ValueError`; fully empty, matching inputs still return
  early.
- `ensure_collection` caches the verified dimension per `QdrantStore`
  instance (`self._verified_dimension`), short-circuiting repeat calls.
- `query` retains the empty-vector validation but no longer calls
  `ensure_collection` per request — only when the cached dimension differs.
  Reads no longer create collections as a side effect after the dimension is
  established (write/setup path via `upsert`/`provision_qdrant` owns
  creation).

### `backend/tests/test_review_fixes.py`
- `test_admin_get_user_by_email_paginates` now wraps its body in
  `async with client.client:`, guaranteeing the `httpx.AsyncClient` is closed
  even if the assertion fails.

### `frontend/package.json` + `frontend/package-lock.json`
- Root `engines.node` changed from `>=20.19.0 || >=22.12.0` to
  `^20.19.0 || >=22.12.0`, matching Vite 8.1.5's engine range (excludes
  Node 21). The frontend guide's prose ("20.19+ or 22.12+") was left
  unchanged per the "keep README requirements unchanged" instruction.

## Validation
- `backend`: `./venv/bin/pytest` → **77 passed** (~1.4 s).
- `backend`: production-import smoke — `APP_ENV=production` with
  `SEED_PASSWORD` unset imports cleanly and `resolve_seed_password()` raises
  `RuntimeError`; with `SEED_PASSWORD` set it returns the env value; with no
  env it warns and returns `Password123!`.
- `frontend`: `npm run lint` → clean (only pre-existing warnings in unrelated
  files). Lockfile still valid JSON and root engine range matches Vite 8.1.5.

## Pitfalls / lessons
- The dimension cache in `ensure_collection` is deliberately keyed on exact
  dimension; a mismatch still raises, and a fresh `QdrantStore` instance (as
  `provision_qdrant` creates) re-verifies on first use.
- Moving the production guard to call time changes observable behavior only
  in production; tests were unaffected because they import `app.seed` (which
  previously would have been fine only because tests set `APP_ENV=test`).

## Follow-up / limitations
- No new tests were added for the resolver or pagination bound; existing
  coverage exercises the surrounding logic. A dedicated unit test for
  `resolve_seed_password()` (prod raise / env value / fallback) would close
  the gap if desired.
