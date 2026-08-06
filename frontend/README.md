# ExamAI Frontend

React + Vite client for the ExamAI exam-prep platform. Students use RAG chat, quizzes, flashcards, and shared course materials; teachers upload materials, author quizzes, and monitor class progress.

## Requirements

- Node.js **20.19+** or **22.12+** (required by Vite 8)
- npm

## Setup

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Starts the Vite dev server with HMR. The app expects the FastAPI backend to be
running separately for live API calls; many screens still use mock data during
Phase 1 development.

The dev server has **no proxy** — it calls the API directly at
`VITE_API_BASE_URL` (default `http://localhost:8000`, set in
`frontend/.env.local`). Keep the backend running and the ports in sync.

## Running the full stack

```bash
# Terminal 1 — backend API → http://localhost:8000 (docs: /docs)
cd backend
./venv/bin/uvicorn app.main:app --reload    # canonical venv is backend/venv/

# Terminal 2 — this frontend → http://localhost:5173
cd frontend
npm run dev
```

Backend setup (one-time, from `backend/`): copy `.env.example` → `.env.local`,
then `./venv/bin/alembic upgrade head` and `./venv/bin/python -m app.seed`.
Full details in `backend/README.md`.

## Production build

```bash
npm run build    # output in dist/
npm run preview  # serve the production build locally
```

## Lint

```bash
npm run lint
```

Uses [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) for fast static checks.

> There is no automated frontend test suite yet. Run `npm run lint` and
> `npm run build` as your verification gate before handing off changes.

## Architecture overview

```text
src/
├── api/              # Thin fetch wrappers per backend resource
├── components/
│   ├── layout/       # AppLayout, Sidebar, TopAppBar
│   ├── materials/    # MaterialsTable, cards, type icons
│   └── ui/           # shadcn/base-ui primitives (Button, Tabs, …)
├── pages/            # Route-level screens (Chat, Quizzes, …)
├── store/            # Zustand slices (authStore, subjectStore, …)
├── lib/utils.js      # cn() and shared helpers
└── index.css         # Tailwind 4 + Stitch design tokens
```

### Data flow

1. **Auth** — `authStore` holds role (`student` | `teacher`) and user profile after login.
2. **Routing** — React Router splits student (`/student/*`) and teacher (`/teacher/*`) trees; both share login/signup.
3. **Layout** — `AppLayout` renders a role-specific sidebar and main content. On viewports below `lg`, the sidebar becomes a toggleable drawer.
4. **API layer** — `src/api/` modules call the FastAPI backend. Business logic stays on the server; pages compose API responses into UI state.
5. **Material scope** — Chat and flashcard generation send per-session material selections (not persisted server-side). Citations must always include teacher name and material filename.

### Key conventions

- Path alias `@/` maps to `src/` (configured in `vite.config.js`).
- Visual styling follows Google Stitch exports; see `.stitch/designs/` for reference HTML.
- Zustand slices: `authStore`, `subjectStore`, `materialScopeStore` (see `agents.md` for screen-level detail).

## Stitch screen sync (optional)

To download Stitch design exports into `.stitch/designs/`:

```bash
node fetch_screens.cjs /path/to/screens.json
# or
SCREENS_FILE=/path/to/screens.json node fetch_screens.cjs
```
