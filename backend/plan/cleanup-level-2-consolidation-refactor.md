# Cleanup Level 2 — Consolidation & Refactor (behavior-preserving)

Level 2 removes technical debt by consolidating duplicated logic and fixing
misconfiguration. **All changes are behavior-preserving** — the test suite
must stay green. No new features.

**Flow:** do the items in order → run verification → commit → tell the user
you're done so we proceed to Level 3.

---

## Item 2.1 — Create `app/utils/retry.py` and consolidate 3 duplicated retry helpers

**Problem:** the structured-output retry pattern (call `llm.generate_json`,
on `StructuredOutputError` rebuild the prompt with the verbatim error + raw
response, retry once, then raise 502) is copy-pasted in three places:

| File | Lines | Notes |
|---|---|---|
| `app/services/rag/chat_service.py` | 27–45 (loop), 54–59 (`_retry_prompt`) | + custom source-marker validation |
| `app/services/quiz/ai_generate_service.py` | 39–61 (`_generate_with_retry`), 74–82 (`_retry_prompt`) | + wraps non-`StructuredOutputError` as API error |
| `app/services/flashcards/generate_service.py` | 23–44 (inline try/except + manual retry) | flashcard count validation |

`backend/agents.md:91` already documents a `utils/retry.py` ("error-aware
structured-output retry helper") in the folder structure — but the file was
never created. This item makes the docs true and removes ~3 copies of the same
logic.

**Create `backend/app/utils/retry.py`:**

```python
"""Error-aware structured-output retry helper.

Wraps the GeminiClient's ``generate_json`` so a StructuredOutputError retries
once with a prompt that includes the verbatim validation error and the full
bad response (per the LLM usage guidance in backend/agents.md), then raises
a 502 HTTPException if the retry also fails.
"""
from typing import TypeVar

from fastapi import HTTPException
from pydantic import BaseModel

from app.utils.gemini_client import GeminiClient, StructuredOutputError

T = TypeVar("T", bound=BaseModel)


def generate_json_with_retry(
    llm: GeminiClient,
    prompt: str,
    schema: type[T],
    *,
    retry_prompt_builder,
    http_error_detail: str,
) -> T:
    last_error = None
    for attempt in range(2):
        try:
            return llm.generate_json(prompt, schema)
        except StructuredOutputError as exc:
            last_error = exc
            prompt = retry_prompt_builder(prompt, exc)
            if attempt == 0:
                # log optional; mirrors current behavior of each service
                pass
    raise HTTPException(status_code=502, detail=http_error_detail) from last_error
```

> The exact signature is a guideline. The goal is ONE shared helper that all
> three services call, with per-service validation (source markers, question
> count, card count) done by the caller **after** a successful parse, or by a
> small validator callback. Choose the cleanest API that preserves the current
> external behavior (200 with data, or 502; never a crash).

**Then refactor each service to use it:**

1. `chat_service.py` — keep `ChatService._prompt`; delete `_retry_prompt`
   (fold it into the retry-prompt builder passed to the helper); keep the
   `invalid_markers` check but do it on the returned output after the helper
   returns (inside the loop is also fine if you keep the marker check in a
   callback).
2. `ai_generate_service.py` — keep `_prompt`; delete `_retry_prompt` and
   `_generate_with_retry`; move the question-count validation into a callback
   (or raise `StructuredOutputError` from it). Preserve the "wrap non-SOE API
   errors as StructuredOutputError" behavior.
3. `generate_service.py` — replace the inline two-try block with the shared
   helper; move the card-count check into a callback.

**Update** `backend/agents.md` folder-structure section so `utils/retry.py` is
described accurately (it now exists).

**Why:** single source of truth for retry semantics; removes ~60 lines of
duplication; the docs reference is no longer a lie.

---

## Item 2.2 — Resolve `update_material_status` (tests-only dead code)

**What:** `app/services/material_service.py:14–15` (`MaterialNotFoundError`)
and `:124–167` (`update_material_status`) implement a state machine that the
ingestion flow no longer uses. Grep shows the ONLY references are:
`tests/test_phase_1.py:16` (import), `:211`, `:219`. Real ingestion
(`material_ingestion_service.py`, `ingestion/pipeline.py`) mutates
`Material.status` directly.

**Recommended action — remove:**
1. Delete `MaterialNotFoundError` (`material_service.py:14–15`).
2. Delete `update_material_status` (`material_service.py:124–167`).
3. Delete the import at `test_phase_1.py:16`.
4. Delete the test class that exercises it — the status-transition tests
   around `test_phase_1.py:196–220`.

> Alternative (only if you prefer to restore a single status authority):
> route the real ingestion/delete flows through `update_material_status`.
> That's a larger refactor; removal is the cleaner fix for a function that is
> dead in production code. Pick one — do not leave both the dead function and
> the duplicated transitions.

---

## Item 2.3 — Migrate `@app.on_event("shutdown")` → lifespan

**What:** `app/main.py:114–117` uses the deprecated `@app.on_event`
("shutdown") to call `close_shared_client()` from `app/utils/storage.py`.

**Steps:** replace the hook with a FastAPI `lifespan` context manager:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    from app.utils.storage import close_shared_client
    await close_shared_client()

app = FastAPI(..., lifespan=lifespan)
```

Delete `app/main.py:114–117`. **Why:** `on_event` is deprecated and runs
outside request context; lifespan is the supported mechanism.

---

## Item 2.4 — Fix the pyrefly misconfiguration (root cause of 36 ignore comments)

**Problem:** `.vscode/settings.json` sets:

```json
"python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python"
```

That points at the **stale root `.venv`** (documented unusable — it's missing
the parser libs), so the in-editor pyrefly checker can't resolve fastapi /
sqlalchemy / pydantic / httpx / alembic / google-genai. 36 `# pyrefly: ignore
[missing-import]` comments in `backend/app/` (+ 2 in `tests/test_smoke.py`,
+ 3 in `migrations/env.py`) exist purely to suppress that misconfiguration.

**Steps:**
1. Edit `.vscode/settings.json`:
   ```json
   "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
   ```
2. Remove every `# pyrefly: ignore [missing-import]` comment across the repo
   once the interpreter is correct:
   ```bash
   rg -l "pyrefly: ignore" backend/app backend/tests backend/migrations
   ```
   Delete each line. Watch for the comment on a line BY ITSELF (e.g.
   `routes/me.py:1`) vs. trailing an import — remove the whole line either
   way, being careful not to delete the import itself when the comment shares
   its line.
3. Verify no stragglers: `rg "pyrefly" backend/` should return nothing.

**Why:** 41 suppressors hide real import errors and mislead readers. Fixing
the interpreter makes them unnecessary.

---

## Item 2.5 — Dependencies: move `reportlab` to dev; drop `python-dotenv`

**What (verified by grep):**
- `reportlab` is imported ONLY by `tests/test_phase_2.py:49` (synthesizes a
  PDF fixture). It is not a runtime dependency.
- `python-dotenv` is never imported anywhere. `pydantic-settings` pulls it in
  transitively (it's installed in `backend/venv` as `python-dotenv-1.2.2`).

**Steps:**
1. Create `backend/requirements-dev.txt`:
   ```
   -r requirements.txt
   reportlab>=4.0.0
   ```
2. Remove `reportlab>=4.0.0` from `backend/requirements.txt`.
3. Remove `python-dotenv>=1.0.1` from `backend/requirements.txt`.
4. Update `backend/README.md` + root `README.md` setup instructions to also
   run `./venv/bin/pip install -r requirements-dev.txt` for tests.

**Why:** smaller production install; honest dependency manifest. Do NOT remove
`reportlab` from `requirements-dev.txt` — the PDF fixture tests need it.

---

## Item 2.6 — Test hygiene: shared fixtures + fix `test_phase_1.py` leakage

**Problem A — leaked override:** `tests/test_phase_1.py:36` sets
`app.dependency_overrides[get_db] = override_get_db` at MODULE IMPORT time and
only ever clears the `get_current_user` override (`:47–48`). The `get_db`
override therefore leaks into any later test module that doesn't overwrite it
(only harmless today because `test_smoke.py` doesn't touch the DB). Also
`Base.metadata.create_all` runs at import (line 39).

**Fix:** move the engine/`override_get_db`/`create_all` into a module-scoped
fixture (like the clean `ctx()` fixture already used in `test_phase_4.py:26–48`),
so the override is scoped and torn down per test/module.

**Problem B — duplicated scaffolding:** `mock_auth`, `make_user`,
`make_subject`, `make_quiz`, `seed_subject` are copy-pasted between
`test_phase_4.py:51–129` and `test_phase_5.py:49–169`; `FakeLLM`/`FakeRetriever`
live only in `test_phase_4.py:597+`.

**Fix:** extract the shared helpers/fixtures into `tests/conftest.py` (pytest
auto-imports it) and import them in `test_phase_4.py` / `test_phase_5.py`.
Keep the tests' behavior identical.

**Why:** removes ~120 lines of duplication and makes the suite order-safe.

---

## Item 2.7 — Remove unused imports (verified)

| File | Line | Symbol |
|---|---|---|
| `app/main.py` | 13 | `ErrorDetail` |
| `app/routes/subjects.py` | 5 | `List` (typing) |
| `app/routes/materials.py` | 2 | `status` (fastapi) |
| `app/models/subject.py` | 4 | `Table` (sqlalchemy) |
| `app/services/material_ingestion_service.py` | 1 | `datetime` |
| `app/services/material_ingestion_service.py` | 3 | `status` (fastapi) |
| `app/services/material_service.py` | 2 | `select` (sqlalchemy) |
| `app/services/quiz/ai_generate_service.py` | 1 | `UUID` (uuid) |

**Why:** lint-clean imports reduce noise and false reader assumptions.

---

## Item 2.8 — Remove unused `require_any_role`

**What:** `app/auth/dependencies.py:79` defines
`require_any_role = RoleChecker(["teacher", "student"])` — never imported or
used anywhere in app or tests.

**Steps:** delete line 79. **Why:** dead dependency; any authenticated user
role already implies membership in this set.

---

## Item 2.9 — Single-source the "25 MiB" size-limit message

**What:** the 413 message string `"Material exceeds the 25 MiB size limit"` is
hard-coded in two places: `app/services/material_ingestion_service.py:22` and
`app/routes/materials.py:28` (the latter already imports `MAX_BYTES`).

**Steps:** define the message once next to `MAX_BYTES`
(`material_ingestion_service.py:12`):
```python
MAX_BYTES = 25 * 1024 * 1024
MAX_BYTES_MESSAGE = "Material exceeds the 25 MiB size limit"
```
and use `MAX_BYTES_MESSAGE` in both raise sites. **Why:** messages can't drift.

---

## Verification (the gate)

Backend (from `backend/`):

```bash
./venv/bin/pip install -r requirements-dev.txt
./venv/bin/pytest          # expect 87 passed (minus removed dead-code tests)
rg -n "pyrefly" app tests migrations   # expect no output
rg -n "update_material_status|MaterialNotFoundError" app tests   # expect no output
```

Frontend (from `frontend/`) — only touched if a frontend file changed:

```bash
npm run lint && npm run build && npm test
```

## Completion criteria

- [ ] `app/utils/retry.py` created; 3 services use it; no duplicated retry loop remains
- [ ] `update_material_status` + `MaterialNotFoundError` + its tests removed
- [ ] `main.py` uses `lifespan`; no `@app.on_event`
- [ ] `.vscode/settings.json` → `backend/venv/bin/python`; zero `pyrefly` comments
- [ ] `reportlab` moved to `requirements-dev.txt`; `python-dotenv` removed
- [ ] Shared test fixtures in `tests/conftest.py`; `test_phase_1.py` leakage fixed
- [ ] 8 unused imports removed; `require_any_role` removed
- [ ] `MAX_BYTES_MESSAGE` constant used in both sites
- [ ] `./venv/bin/pytest` green; frontend gate green

**After commit, tell the user Level 2 is done before starting Level 3.**
