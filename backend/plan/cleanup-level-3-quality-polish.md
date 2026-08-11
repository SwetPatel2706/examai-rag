# Cleanup Level 3 — Quality Polish + Docs Sync

Level 3 is the deepest pass: low-severity code smells, small refactors for
readability/maintainability, and reconciling documentation with reality.

**Flow:** do the items in order → run verification → commit. This is the final
cleanup level; the walkthrough is written after it.

---

## Item 3.1 — Merge `retrieve`/`retrieve_for`; drop unused `max_chars`

**What:** `app/services/rag/retriever.py:50–51` — `retrieve_for` is a no-op
delegate of `retrieve`; only `retrieve_for` is called by services
(`chat_service.py:22`, `ai_generate_service.py:29`,
`generate_service.py:19`).

**Steps:**
1. Delete `retrieve` (rename `retrieve_for` → `retrieve`), or keep one
   canonical method and update the 3 call sites. Pick the name that reads
   best and update all callers.
2. `build_context(chunks, max_chars=None)` (`retriever.py:54–73`) — the
   `max_chars` param is never supplied by any caller (all use the default).
   Either drop the param and use `settings.RAG_MAX_CONTEXT_CHARS` directly,
   or keep it only if a caller needs it. Recommended: drop the param.
   Also clean the trailing whitespace on lines 64, 67, 70.

---

## Item 3.2 — Dedupe quiz serialization

**What:** `app/routes/quizzes.py:47–91` — `_summary_out`, `_teacher_detail_out`,
`_student_detail_out` repeat the same id/subject/teacher/topic/source/status/
time_limit/created_at block three times; only `questions` differs. And
`_attempt_out` (`:94–95`) is a pointless wrapper over `serialize_attempt`.

**Steps:**
1. Extract a private `_base_fields(quiz) -> dict` (or a helper that builds the
   shared kwargs) and reuse it in all three output builders.
2. Replace `_attempt_out(attempt)` call sites (`:206`, `:216`) with
   `serialize_attempt(attempt)` directly and delete `_attempt_out`.

**Why:** one place to change when a quiz field is added; removes ~20 lines.

---

## Item 3.3 — Single `HTTPBearer()`

**What:** `app/auth/dependencies.py:14` and `app/routes/auth.py:18` each
instantiate `HTTPBearer()`. (Route uses its own instance for the login/refresh
endpoints that must NOT be protected — verify that intent before merging; if
the route instance is genuinely used for unprotected endpoints it may still be
shareable since `HTTPBearer` is stateless.)

**Steps:** confirm both instances are interchangeable, then import the single
`security` from `app.auth.dependencies` in `routes/auth.py` and delete the
duplicate.

---

## Item 3.4 — `async def` handlers doing sync DB work → `def`

**What:** these handlers are `async def` but only call synchronous DB/ORM code
inside the event loop (only `create_material` genuinely awaits I/O):

| File | Lines |
|---|---|
| `app/routes/subjects.py` | 19, 30, 50 |
| `app/routes/materials.py` | 33, 68, 79, 84, 92, 103, 118 |

**Steps:** convert the listed handlers to plain `def` (keep `create_material`
and `material_download` / `retry_material` / `delete_material` as `async` —
they await `StorageClient`). **Why:** prevents blocking the event loop;
matches the style already used in `routes/quizzes.py`, `routes/me.py`,
`routes/analytics.py`.

---

## Item 3.5 — Consistent UUID column type

**What:** `app/models/user.py:10` uses the generic `sqlalchemy.Uuid` while
every other model uses `postgresql.UUID`.

**Steps:** change `from sqlalchemy import ... Uuid` → `from
sqlalchemy.dialects.postgresql import UUID` and use `UUID(as_uuid=True)`.

> Note: this does NOT require a migration on Postgres (both render as `UUID`);
> the SQLite test engine handles both. If the generic `Uuid` was chosen for
> SQLite portability, document that decision instead of changing it — but the
> rest of the codebase already uses `postgresql.UUID`, so consistency wins.

---

## Item 3.6 — Extract shared grade-band helper

**What:** grade-band aggregation is duplicated in two styles:
- `app/services/analytics/quiz_analytics.py:34–51` (`_grade_band`,
  `get_grade_distribution` — Python `Counter`)
- `app/services/analytics/dashboard.py:29–36` + `:78–96` (SQL `CASE` + manual
  loop). Both derive from the shared `GRADE_BANDS` constant
  (`dashboard.py:22` imports it from `quiz_analytics`).

**Steps:**
1. Extract one helper (e.g. `build_grade_bands(counts_by_band) ->
   list[GradeBandOut]`) that maps a `{band: count}` dict to `GradeBandOut`s
   with percentages.
2. Use it in both `get_grade_distribution` and the dashboard aggregation.
3. Replace `_empty_bands()` (`dashboard.py:39–40`) with a direct call to the
   shared helper with `{}`.

**Why:** band→percentage math is subtle (zero-handling, ordering); keep one
copy.

---

## Item 3.7 — Document/clean dead branch in `config.py` validator

**What:** `app/config.py:116–130` `validate_production_settings` only checks
the `GEMINI_MODEL` placeholder; the docstring admits live model verification
is deferred.

**Steps:** either (a) implement the live check as a startup check that warns
(not raises) in non-production, or (b) trim the docstring to describe exactly
what it does today (placeholder check only) and remove the misleading "do
that in an explicit startup check, not here" comment if it's not going to be
done. Prefer (b) for a truthful, minimal diff.

---

## Item 3.8 — Package `__init__.py` docstrings

**What:** `app/services/analytics/__init__.py` and
`app/services/quiz/__init__.py` are empty; sibling packages (`ingestion`,
`rag`, `flashcards`) carry a one-line docstring.

**Steps:** add a one-line module docstring to each (e.g.
`"""Analytics read-model services (quiz analytics, student progress)."""`).

---

## Item 3.9 — Whitespace / long-line cleanup

**Steps:** using `rg` / an editor, clean trailing whitespace and break
>140-char lines. Known offenders:
- `app/services/rag/retriever.py:64,67,70`
- `app/config.py:48,74,94,111`
- `app/routes/quizzes.py:45,98,134,190`
- `app/routes/flashcards.py:51`
- `app/schemas/quiz.py:91,182`
- seed files (`app/seed.py`, `app/seed_data.py`)
- `app/services/material_ingestion_service.py:11` (long `ALLOWED_TYPES` line)

Do NOT reformat wholesale — only trailing whitespace and egregiously long
lines, so diffs stay reviewable.

---

## Item 3.10 — Docs sync (task-4 spill-over)

Update these docs to match reality (verify numbers before writing them):

1. **Root `README.md`**:
   - Line 65: "77 tests" → actual count (87 backend as of this pass).
   - Line 69: "No frontend test suite yet" → WRONG; there is a Vitest suite
     (63 tests as of this pass). State `npm test`.
   - Line 46–48 venv note stays; consider pointing to the `.vscode` fix.
2. **`backend/agents.md`**:
   - Test count "83 tests" → actual (87).
   - Folder structure: `utils/retry.py` now exists (Level 2) — describe it.
   - `LLM_DEBUG_LOGGING` flag (`agents.md:255`) does NOT exist in code — either
     implement it or strike the paragraph. Prefer implementing a minimal
     opt-in flag gated to local `APP_ENV` if the logging guidance is to be
     kept, otherwise delete the paragraph.
   - `# pyrefly` guidance: mention the interpreter path fix.
3. **`frontend/agents.md`**: test count "31 tests" → actual (63).
4. **`backend/to-do.md`**: reconcile against reality — verify whether the
   Alembic indexing / PK-index tasks were completed by migration
   `b8f4a1d9c2e7`; mark done items or keep them as explicit follow-ups. Remove
   the "requirements pinned" and "time_limit enforcement" deferral notes only
   if they are now tracked elsewhere (otherwise keep — they're honest notes).
5. **`backend/README.md`**: add `requirements-dev.txt` install step (Level 2).

---

## Item 3.11 — Optional (clearly-marked follow-ups, do not block)

- **RAG test coverage gap:** there is no `tests/test_phase_3.py`; the RAG
  chat/citation/retriever/flashcard layer is untested. Adding a Phase-3 test
  file is recommended but is a NEW feature (tests), not cleanup — schedule it
  separately if you want it.
- **`frontend/to-do.md`** lists two real UI bugs (teacher filter on student
  materials page; sidebar Home staying highlighted). These are bug fixes, not
  cleanup — schedule separately.

---

## Verification (the gate)

Backend (from `backend/`):

```bash
./venv/bin/pytest          # green
./venv/bin/pytest tests/test_smoke.py -q
```

Frontend (from `frontend/`):

```bash
npm run lint && npm run build && npm test
```

Docs check:

```bash
rg -n "77 tests|83 tests|31 tests|No frontend test suite" README.md backend/README.md backend/agents.md frontend/agents.md
```

## Completion criteria

- [x] `retriever` single method; `build_context` param resolved
- [x] Quiz serialization deduplicated; `_attempt_out` removed
- [x] Single `HTTPBearer`
- [x] Sync-DB handlers converted to `def` where appropriate
- [x] `user.py` UUID type consistent with the codebase
- [x] Grade-band helper extracted and shared
- [x] `config.py` validator docstring truthful
- [x] Package `__init__` docstrings added
- [x] Trailing-whitespace / long-line pass done
- [x] Docs (READMEs, agents.md, to-do.md) reconciled with reality
- [x] Full backend + frontend gates green

**Done — ready for commit.** Verification: backend `82 passed` (1 pre-existing
StarletteDeprecationWarning), frontend lint 0 errors (11 pre-existing warnings),
`npm run build` OK, `npm test` 63 passed. `LLM_DEBUG_LOGGING` implemented as a
minimal opt-in flag in `app/config.py` + `app/utils/gemini_client.py`, forced off
in any non-local `APP_ENV`.

**After commit: report Level 3 done.** Then remaining work: `examai-resume-detail.md`,
temp/cache cleanup, root `.gitignore` update, and the Phase 7.10 walkthrough.
