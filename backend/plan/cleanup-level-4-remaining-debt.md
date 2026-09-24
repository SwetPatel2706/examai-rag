# Cleanup Level 4 — Remaining Debt (safe removals, concurrency, frontend polish, docs/cache)

Follow-up to Levels 1–3. This pass targets the residual technical debt found in a
fresh review after the Level-3 completion commit. It is split into: **safe
removals** (no behavior change), **one concurrency fix** (threadpool for blocking
ingestion), **frontend polish** (dark-mode removal, hook-deps warnings, font
dedup), and the **cache/docs/.gitignore** wrap-up (tasks 3–4 of the health pass).

---

## A — Safe backend removals (verified, behavior-preserving)

### A1. Convert no-await `async def` handlers → `def`
- `app/routes/health.py:21` `health_check` — no `await`
- `app/routes/health.py:29` `health_dependencies` — no `await`
- `app/routes/auth.py:147` `get_me` — pure sync ORM read
Prevents unnecessary event-loop scheduling; matches `routes/quizzes.py` style.

### A2. Remove 8 unused imports (AST-verified via `pyflakes`-style walk)
| File | Import | Reason |
|---|---|---|
| `app/routes/quizzes.py` | `QuizAttemptResponse` | never referenced; attempts use `serialize_attempt` |
| `tests/test_phase_1.py` | `datetime` | unused |
| `tests/test_phase_4.py` | `Subject`, `User` | unused in module |
| `tests/test_phase_5.py` | `Material`, `Quiz`, `QuizAttempt`, `QuizQuestion`, `Subject`, `User` | unused in module |

### A3. Merge duplicate module import
`app/routes/materials.py:10` and `:15` both import from
`app.services.material_ingestion_service` (one for `upload_material`/`start_retry`/
`mark_deleting`, one for `MAX_BYTES`/`MAX_BYTES_MESSAGE`). Combine into one line.

### A4. Drop unused `RetrievedChunk.score`
`app/services/rag/retriever.py:19` defines `score`; `:48` populates it via
`getattr(point, "score", None)`. No caller reads it. Remove both.

### A5. Remove unused `LOG_LEVEL` setting
`app/config.py:39` defines `LOG_LEVEL`; nothing reads it. Remove (logging is
configured by uvicorn, not the app).

### A6. Hoist mid-file router imports to top
`app/main.py:124` imports routes after `include_router(health.router)` and the
exception handlers. Move to the top import block.

---

## B — Concurrency: move blocking ingestion off the event loop (Option B)

The pipeline is already thread-safe by design (striped `RLock`s per material,
`SELECT … FOR UPDATE` guards, version-safe conditional `UPDATE`s). Wrap the
blocking sync calls in `await asyncio.to_thread(...)`:

- `app/services/material_ingestion_service.py:37` — `IngestionPipeline().process(...)`
- `app/routes/materials.py:96` — `IngestionPipeline().process(...)` in retry
- `app/routes/materials.py:107` — `IngestionPipeline().qdrant.delete_material(...)` in delete

The request's SQLAlchemy session is only ever touched from one thread at a time
(the handler thread, or the worker thread for the wrapped call), so no session
sharing race. FastAPI/Starlette will not complain; tests call services directly
and are unaffected. Add a note in `backend/agents.md` documenting the threadpool
decision.

---

## C — Frontend polish

### C1. `materialScopeStore.js:10` — ternary-as-statement
Replace
```js
next.has(id) ? next.delete(id) : next.add(id);
```
with an `if/else` (fixes oxlint `no-unused-expressions`).

### C2. `tailwind.config.js` — duplicate `background` key
Line 14 `background: "hsl(var(--background))"` is dead (the Stitch value
`#f7f9fb` at line 63 wins). Remove the shadcn `hsl(var(--background))` entry so
`bg-background` has one definition.

### C3. Remove unused dark theme
`frontend/src/index.css` `.dark` block (lines 46–78) is never activated — the app
ships light-only. Remove the block and `darkMode: "class"` from
`tailwind.config.js`, plus the now-unused `--chart-*`, `--sidebar-*` oklch vars
if they are not referenced by Stitch token classes (keep `--background` etc. used
by `:root`).

### C4. Fix `exhaustive-deps` warnings from `subjects` object identity
`subjectStore` re-renders with a new object every store update, so deps on
`subjects`/derived arrays fire every render. Select primitive fields
(`subjectsId`, `currentSubjectId`, …) or wrap with `useShallow` so effects/memos
only re-run when the actual subject list changes:
- `src/pages/Chat.jsx:94`
- `src/pages/FlashcardDecks.jsx:97`
- `src/pages/StudentMaterials.jsx:59,63,74`

### C5. Duplicate Geist font
`index.html` loads Geist via Google Fonts CDN **and** `src/index.css:3` imports
`@fontsource-variable/geist` (bundled). Keep the fontsource import (offline,
bundled), remove the Geist `<link>` from `index.html`. Keep the Material Symbols
CDN link (no bundled equivalent).

### C6. `StudentProgress.jsx:19` — `export { n }` fast-refresh
Remove the re-export if nothing imports `n` from `StudentProgress`. If it is
imported elsewhere, import from `@/lib/utils` directly instead.

---

## D — Cache / temp files (task 3)

Cataloged in the session report. Actions:
- Delete stale root `.pytest_cache/` and repo-root `.venv/` (1.1 GB stale
  duplicate of `backend/venv/`).
- Delete `frontend/node_modules/.vite/` (regenerated) — optional before next
  `vite` run; `frontend/dist/` is regenerable build output (leave or remove, it
  is gitignored).
- Keep `backend/venv/` (canonical), `frontend/node_modules/`, and
  `~/.cache/huggingface/` (embedding model re-download ~90 MB if removed).

---

## E — Root `.gitignore` + untrack (task 4)

Add to root `.gitignore`:
```gitignore
__pycache__/
*.py[cod]
.pytest_cache/
.venv/
backend/venv/
.DS_Store
frontend/.stitch/
```
Then untrack without deleting working copies:
```bash
git rm -r --cached $(git ls-files '*.pyc')
git rm -r --cached frontend/.stitch
```

---

## F — Docs sync

- `frontend/README.md:62` — "no automated frontend test suite yet" is wrong;
  state `npm test` (63 tests).
- `frontend/README.md:73` — ui listing mentions "Tabs"; `tabs.jsx` was removed in
  Level 1. Update the list.
- `backend/to-do.md` — remove moot Level-2 items (`test_material_status_transitions`
  moot note; `update_material_status` already removed). Keep the honest deferred
  notes (Alembic indexing, time-limit enforcement, pinned requirements).
- `backend/agents.md` — document the threadpool decision (Section B) and confirm
  the `utils/retry.py` + `LLM_DEBUG_LOGGING` descriptions are accurate.

---

## Verification (the gate)

Backend (from `backend/`):
```bash
./venv/bin/pytest
rg -n "QuizAttemptResponse|LOG_LEVEL" app tests   # expect no output
```

Frontend (from `frontend/`):
```bash
npm run lint
npm run build
npm test
```

Git:
```bash
git status --short          # pyc/stitch untracked; working copies intact
```

## Completion criteria
- [ ] A1–A6 applied; backend tests green
- [ ] B applied (3 `asyncio.to_thread` sites) + agents.md note
- [ ] C1–C6 applied; lint/build/test green (warnings reduced)
- [ ] `examai-resume-detail.md` written at repo root (project facts only)
- [ ] Cache cleanup performed; stale `.venv`/`.pytest_cache` gone
- [ ] Root `.gitignore` covers bytecode/caches/venvs/stitch; pyc+stitch untracked
- [ ] Docs (frontend README, backend to-do.md) reconciled
- [ ] `Phase 7.10 fixes Walkthrough.md` written
