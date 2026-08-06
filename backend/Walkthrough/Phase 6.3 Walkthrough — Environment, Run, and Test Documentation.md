# Phase 6.3 Walkthrough — Environment, Run, and Test Documentation

## Goal
Make the exact Python venv path and the run/test commands explicit at every
level of the repo (root, `backend/`, `frontend/`) so future agents — and new
contributors — never have to rediscover them. The root `README.md` was also a
one-line placeholder, so it needed a real quickstart.

## Key finding (why this doc task mattered)
There are **two virtualenvs** in the repo:

- `backend/venv/` — the canonical, fully-provisioned venv (Python 3.14.6,
  91 packages, includes the parser libs: pypdf, python-pptx, python-docx,
  reportlab, lxml, pillow, python-multipart).
- `.venv/` (repo root) — a stale partial duplicate created from
  `backend/venv/bin/python`, missing 10 packages including all the parser
  libraries. It will break ingestion if used.

The backend README already used `./venv/bin/…` but never stated *which* venv
that means or that you must run from `backend/`. `app/config.py` loads
`.env.local` from the current working directory, so running from the repo
root silently picks up no local env file.

## Changes Made

### 1. `agents.md` (root)
Added an **"Environment — how to run, test, and verify (read this first)"**
section right after Stack: canonical venv = `backend/venv/`, do-not-use note
for root `.venv/`, two-terminal quick-start, one-time backend setup (pip
install / .env.local / alembic / seed / provision_qdrant), offline test
commands, and the frontend commands with the no-proxy `VITE_API_BASE_URL`
note.

### 2. `README.md` (root)
Replaced the one-line placeholder with a full project README: what the
project is, monorepo layout, prerequisites (Python 3.14 + Node 20.19+/22.12+),
two-terminal run, backend one-time setup, test commands, and the demo login
table (pointer to `backend/README.md` for the full table).

### 3. `backend/agents.md`
Added an environment section at the top: `./venv/bin/<tool>` from `backend/`,
why CWD matters for `.env.local`, API/migration/seed/provision commands, and
the offline test gate (no Python linter/typecheck config; pytest is the gate;
`# pyrefly: ignore` comments are for the in-editor checker).

### 4. `backend/README.md`
Added a venv callout block after the intro clarifying `backend/venv/` is
canonical, `.venv/` is stale, and all `./venv/bin/…` commands run from
`backend/`.

### 5. `frontend/agents.md`
Added an environment section: Node version requirement, `npm install/dev/
lint/build/preview`, explicit statement that there is no automated test suite
yet (lint + build + manual browser check is the gate), and the no-proxy /
`VITE_API_BASE_URL` note.

### 6. `frontend/README.md`
Added a "Running the full stack" section (backend + frontend terminals,
including the `backend/venv/bin/uvicorn` command) and a note that the dev
server has no proxy; added a test-gate note under Lint.

## Checks run
- `backend/venv/bin/uvicorn --version`, `alembic --version`, `pytest --version`
  — all resolve inside `backend/venv/`.
- `./venv/bin/pytest` from `backend/` — **77 passed** (~1.3 s), fully offline.
- `./venv/bin/pytest tests/test_smoke.py -q` — **15 passed**.
- Confirmed root `.venv/` is missing parser libs vs `backend/venv/` via
  `comm` on `pip list` output.
- `rg` verified each of the 6 doc files has exactly one new "## Environment"
  section / venv mention — no duplicates introduced.

## Pitfalls / lessons
- macOS default filesystem is case-insensitive: `agents.md` and `AGENTS.md`
  are the same file — only one exists per level, no need to write both.
- The backend reads `.env.local` from the process CWD, not from the repo
  root — this is the single most common source of "missing config" confusion.
- The root `.venv/` should ideally be deleted or refreshed so it can't be
  picked up by mistake; left in place for now since it is gitignored and
  unused.

## Follow-up / limitations
- Optional: delete repo-root `.venv/` or refresh it if anyone ever wants a
  root-level convenience venv. Note the `.venv/bin/pip` path only refers to
  `backend/venv/` when run from `backend/`. To rebuild the root venv, run from
  the repository root: `.venv/bin/pip install -r backend/requirements.txt` (the
  equivalent command from `backend/` is `../.venv/bin/pip install -r
  requirements.txt`, since the root `.venv/` is a sibling of `backend/`).
- READMEs link to `backend/README.md` for the full seed-account table and
  phase-by-phase manual verification steps — those were not duplicated.
