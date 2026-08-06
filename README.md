# ExamAI

AI-powered exam prep platform. Students ask questions (RAG) over teacher-approved
materials, take teacher-authored shared quizzes, and study AI-generated
flashcards. Teachers upload materials, author/generate quizzes, and monitor
class performance.

- **Backend** — FastAPI (Python) in `backend/`
- **Frontend** — React + Vite in `frontend/`
- **Stack** — Gemini · Qdrant Cloud · Supabase (Postgres/Auth/Storage) · local
  sentence-transformers · Render.com deployment

Architecture and behavior conventions live in `agents.md` (root),
`backend/agents.md`, and `frontend/agents.md` — read those before changing code.

## Prerequisites

- Python 3.14 (canonical venv already provisioned at `backend/venv/`)
- Node.js 20.19+ or 22.12+ (repo currently runs on v25)
- Backend env: copy `backend/.env.example` → `backend/.env.local` and fill in
  real Supabase / Qdrant / Gemini values. The backend reads `.env.local` from
  its working directory — run all backend commands from `backend/`.

## Run the app (two terminals)

```bash
# Terminal 1 — API server → http://localhost:8000  (Swagger docs: /docs)
cd backend
./venv/bin/uvicorn app.main:app --reload

# Terminal 2 — Vite dev server → http://localhost:5173
cd frontend
npm run dev
```

> **Venv note:** the canonical virtualenv is `backend/venv/`. The root-level
> `.venv/` is a stale partial duplicate and must not be used. Always invoke
> Python via `backend/venv/bin/…` (i.e. `./venv/bin/…` from inside `backend/`).

## Backend one-time setup (all from `backend/`)

```bash
./venv/bin/pip install -r requirements.txt     # install/refresh deps
./venv/bin/alembic upgrade head                # apply Postgres migrations
./venv/bin/python -m app.seed                  # seed demo users/subjects/quizzes
# optional — for RAG Chat and Flashcard generation:
./venv/bin/python -m app.provision_qdrant      # create the Qdrant collection
./venv/bin/python -m app.seed --with-rag       # also embed synthetic materials
```

## Tests

```bash
cd backend
./venv/bin/pytest          # full suite — 77 tests, runs offline (no external services)
./venv/bin/pytest tests/test_smoke.py -q   # single file
```

Frontend: `npm run lint` (oxlint) and `npm run build`. No frontend test suite yet.

## Demo logins

Seeded with password `Password123!` — see `backend/README.md` for the full
table:

| Role | Email | Subjects |
|---|---|---|
| Teacher | `teacher1@examai.com` | Software Engineering; Advanced Database Systems |
| Student | `student1@examai.com` | Software Engineering; Data Structures & Algorithms |
