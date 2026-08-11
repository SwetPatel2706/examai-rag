# Phase 7.10 fixes Walkthrough — Codebase Health Pass (Level-4 cleanup, resume detail, cache, gitignore, docs)

## Goal and outcome

A four-part codebase-health session requested by the user: (1) a fresh dead-code /
technical-debt audit **after** the completed Cleanup Levels 1–3, with a detailed
fix plan; (2) an agent-consumable `examai-resume-detail.md`; (3) a temp/cache
file audit with a written catalog; (4) docs + root `.gitignore` updates.

**Outcome:** backend 82 tests pass, frontend lint **0 warnings / 0 errors**
(previously 11 warnings), build OK, 63 frontend tests pass. 77 tracked `*.pyc`
files and the 51-file Stitch export cache untracked; stale root `.venv` (1.1 GB)
and root `.pytest_cache` deleted. Full plan documented in
[`backend/plan/cleanup-level-4-remaining-debt.md`](../plan/cleanup-level-4-remaining-debt.md).

## Important design/implementation decisions

1. **Threadpool for blocking ingestion (user chose "Option B").** The
   upload/retry/delete handlers wrap the CPU/network-bound pipeline work in
   `await asyncio.to_thread(...)` instead of running it on the event loop. This
   is safe because the pipeline was already built thread-safe: per-material
   striped `RLock`s, `SELECT … FOR UPDATE` guards, and version-safe conditional
   `UPDATE`s (`backend/app/services/ingestion/pipeline.py`). The request
   SQLAlchemy session is only ever touched from one thread at a time. Decision
   documented in `backend/agents.md` under Ingestion.
2. **Dark-mode removal nuance.** The `.dark` CSS block in `frontend/src/index.css`
   was deleted, but `darkMode: "class"` in `tailwind.config.js` was **kept**.
   Removing it would make Tailwind v4 fall back to a `prefers-color-scheme`
   media query, which would *re-enable* the shadcn `dark:` classes on
   dark-OS browsers. Keeping class-based dark mode means those variants stay
   inert (the app never applies a `.dark` class). This is documented as a
   comment in the config so nobody "cleans it up" later.
3. **Resume file = project facts only.** Per the user, their resume-builder agent
   already holds personal/education data; `examai-resume-detail.md` therefore
   contains only verifiable project facts, quantifiable metrics, and suggested
   angles.
4. **Stitch exports:** added `frontend/.stitch/` to `.gitignore` and untracked
   the 51 tracked design files (regenerable via `frontend/fetch_screens.cjs`).
   The working copies were kept on disk (`git rm --cached` only).
5. **`RetrievedChunk.score` removed:** populated at
   `retriever.py:48` but never read by any caller; the dataclass field and the
   `getattr(point, "score", None)` argument were dropped, and 3 test call sites
   in `tests/test_phase_4.py` were updated.

## Files/modules changed and why

### Backend (`backend/`)
- `app/routes/health.py`, `app/routes/auth.py` — `async def` handlers with no
  `await` converted to `def` (avoid pointless event-loop scheduling).
- `app/routes/quizzes.py` — removed unused `QuizAttemptResponse` import.
- `app/routes/materials.py` — merged the duplicate
  `material_ingestion_service` import (two lines → one block); added
  `asyncio`; wrapped the retry `process()` and Qdrant `delete_material()` calls
  in `asyncio.to_thread`.
- `app/services/material_ingestion_service.py` — wrapped the pipeline
  `process()` call in `asyncio.to_thread` (restored the blank line after imports).
- `app/services/rag/retriever.py` — dropped unused `score` field.
- `app/config.py` — removed unused `LOG_LEVEL` setting.
- `app/main.py` — hoisted the mid-file router import block to the top import
  section.
- `tests/test_phase_1.py`, `tests/test_phase_4.py`, `tests/test_phase_5.py` —
  removed 8 AST-verified unused imports; updated the 3 `RetrievedChunk(...)`
  constructor calls to the 2-arg form.
- `plan/cleanup-level-4-remaining-debt.md` — new Level-4 plan doc.
- `to-do.md` — reconciled: removed the moot Level-2 items, kept the honest
  deferred structural notes.
- `agents.md` — documented the threadpool concurrency decision.
- `README.md` — no changes needed (test counts already accurate).

### Frontend (`frontend/`)
- `src/store/materialScopeStore.js` — replaced the ternary-as-statement in
  `toggleMaterial` with an `if/else` (fixes oxlint `no-unused-expressions`).
- `tailwind.config.js` — removed the dead duplicate `background` key (the Stitch
  `#f7f9fb` value is the live one); kept `darkMode: "class"` with an explanatory
  comment (see decision 2).
- `src/index.css` — removed the unused `.dark` theme block.
- `index.html` — removed the duplicate Geist Google-Fonts `<link>`; the bundled
  `@fontsource-variable/geist` import in `index.css` remains as the single
  source. Kept the Material Symbols CDN link.
- `src/pages/Chat.jsx`, `src/pages/FlashcardDecks.jsx`, `src/pages/StudentMaterials.jsx` —
  `const subjects = subjectsApi.data || []` → `?? EMPTY_SUBJECTS` with a stable
  module-level `EMPTY_SUBJECTS` constant, silencing the `exhaustive-deps`
  warnings caused by a fresh `[]` each render.
- `src/pages/TeacherMaterials.jsx` — refactored the ingestion-status polling
  effect to depend on a stable `processingKey` string + destructured
  `reloadMaterials`, fixing the two `exhaustive-deps` warnings without behavior
  change.
- `src/pages/StudentProgress.jsx` — removed the unused `export { initials }`
  (fast-refresh warning).
- `src/components/ui/button.jsx` — removed `buttonVariants` from the export
  (only used internally).
- `README.md` — corrected "no automated frontend test suite" → 63 Vitest tests;
  removed the deleted `Tabs` from the ui listing; updated the mock-data note.

### New root files
- `examai-resume-detail.md` — project-facts detail file for the resume agent
  (see task 2).
- `.gitignore` — added `__pycache__/`, `*.py[cod]`, `.pytest_cache/`,
  `.venv/`, `backend/venv/`, `.DS_Store`, `frontend/.stitch/`.

### Cache/temp cleanup (task 3)
Deleted: stale root `.venv/` (1.1 GB), stale root `.pytest_cache/`,
`backend/.pytest_cache/`, `frontend/node_modules/.vite/`, and the build output
`frontend/dist/` (regenerated by `npm run build`). Kept: canonical
`backend/venv/`, `frontend/node_modules/`, `~/.cache/huggingface/` (the
`all-MiniLM-L6-v2` embedding model, re-downloadable). Full catalog with
generation triggers and delete guidance is in the Level-4 plan doc.

### Git hygiene (task 4)
- `git rm -r --cached` all **77 tracked `*.pyc`** files and the **51 tracked
  `frontend/.stitch/`** design files (working copies preserved; now ignored).

## Tests / checks run (all green)

- Backend: `./venv/bin/pytest` → **82 passed** (~1.6 s, 1 pre-existing
  StarletteDeprecationWarning).
- Frontend: `npm run lint` → **0 errors, 0 warnings** (was 11 warnings);
  `npm run build` → OK; `npx vitest run` → **63 passed** (14 files).
- Grep checks: no `LOG_LEVEL`, no `QuizAttemptResponse` import in routes, no
  `async def` left in `health.py`, `asyncio.to_thread` present at the 3 sites.
- `git status` clean of pyc/stitch after untracking; `.gitignore` rules verified
  with `git check-ignore`.

## Notable pitfalls / lessons

- **`rg -r` is ripgrep's *replace* flag.** During the audit, `rg -rn "\binitials\b"`
  silently replaced every match with `"n"`, producing a false "import { n }"
  finding. Verify suspicious findings with a second, explicit grep.
- **Tailwind v4 dark-mode default.** Removing `darkMode: "class"` silently
  switches `dark:` variants to `prefers-color-scheme`, re-enabling dead dark
  styling on dark-OS browsers — the opposite of "removing" it. Keep the config
  key (with a comment) when the goal is to make dark variants inert.
- **`|| []` creates a new array every render**, which makes `useEffect`/`useMemo`
  deps on `subjects` fire every render (the 6 frontend warnings). A stable
  module-level `EMPTY_SUBJECTS` constant fixes it without memoizing.
- **Verifying "unused import" claims matters**: the AST-walk heuristic flags
  imports that are only used via SQLAlchemy table constructors or re-exports;
  every flagged import was re-verified with explicit greps before deletion.

## Follow-up / known limitations

- **RAG test coverage gap** remains: there is no `tests/test_phase_3.py` for the
  chat/citation/flashcard services. Deferred by user decision to a separate task.
- **`--chart-*` / `--sidebar-*` CSS variables** in `:root` were kept even though
  they are currently unused — they are the shadcn component contract; leaving
  them avoids breaking future shadcn component generation.
- **Alembic indexing, PK `index=True`, `lower(email)` unique index, pinned
  requirements / pip-audit CI, and server-side `time_limit` enforcement** remain
  documented follow-ups in `backend/to-do.md`.
- The `frontend/to-do.md` two UI bugs (student-materials teacher filter; sidebar
  Home highlight) are tracked separately as bug fixes.
