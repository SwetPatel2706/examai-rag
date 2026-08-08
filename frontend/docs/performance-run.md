# Frontend Performance Run — Manual Procedure & Measurements

Phase 6.7 requires that performance decisions are made from measurements, not
from blanket caching or premature memoization. This document is the repeatable
procedure for measuring the integrated frontend against a seeded dataset, plus
the recorded before/after numbers.

## Prerequisites

1. Backend seeded with RAG-enabled demo data (from `backend/`):
   `./venv/bin/python -m app.seed --with-rag`
2. Backend running: `./venv/bin/uvicorn app.main:app --reload`
3. Production frontend build + preview (from `frontend/`):
   `npm run build && npm run preview` → http://localhost:4173
4. A logged-in browser (seeded student and teacher accounts).

## Metrics

- **Bundle sizes**: read from the `npm run build` output (chunk name, raw, gzip).
- **Request count / duplicates**: Chrome DevTools → Network. Count requests per
  journey and flag any identical URL fetched twice in one navigation.
- **Route transition timing**: DevTools → Performance, or a manual stopwatch
  from click to first meaningful content.
- **LCP / CLS**: Chrome DevTools → Lighthouse (performance) on each journey, or
  the Performance panel LCP/CLS markers.
- **Cold vs warm**: "cold" = hard reload (Cmd+Shift+R, network throttled to
  Slow 4G); "warm" = in-app navigation after first load.

## Journeys

| # | Journey | Role | Key screens touched |
|---|---------|------|---------------------|
| 1 | Login | both | `/login` → role home |
| 2 | Student home | student | `/student` |
| 3 | Chat | student | `/student/chat`, subject switch, ask question |
| 4 | Quizzes | student | `/student/quizzes`, take quiz, results |
| 5 | Materials | student | `/student/materials` |
| 6 | Teacher dashboard | teacher | `/teacher` |
| 7 | Analytics | teacher | `/teacher/analytics`, quiz switch |
| 8 | Student progress | teacher | `/teacher/students`, drill-down |

For each journey record: request count, duplicate requests, LCP, CLS, and
cold/warm transition time.

## Baseline (Phase 6.7 start — before changes)

Build output:

- `dist/index.html` — 1.15 kB (0.59 kB gzip)
- `dist/assets/index-C73itO6D.js` — 461.85 kB (135.69 kB gzip) — single
  bundle containing every route page (all pages statically imported)
- `dist/assets/index-BIE82wg2.css` — 116.61 kB (20.00 kB gzip)

| Journey | Requests | Duplicates | Notes |
|---------|----------|-----------|-------|
| (to be filled from live run) | | | |

Known pre-change characteristics (from code inspection):

- No route-level code splitting: initial JS includes Chat, Analytics, all
  teacher screens, etc.
- `getStudentSubjects` is fetched independently on StudentDashboard,
  SubjectOverview, Quizzes, StudentMaterials, and FlashcardDecks — duplicate
  fetches across screens with no reuse.
- `getTeacherSubjects` likewise on TeacherDashboard, TeacherMaterials,
  Analytics, StudentProgress, QuizCreateEdit.
- Subject materials list is fetched again on Chat, SubjectOverview,
  FlashcardDecks, and QuizCreateEdit without reuse.

## After (Phase 6.7 end)

Build output (measured 2026-08-08):

- `dist/index.html` — 1.15 kB (0.59 kB gzip)
- `dist/assets/index-B0yiAx9T.js` — 279.53 kB (89.09 kB gzip) — the eager
  bootstrap (React entry, auth, shared UI) only; every route page is a lazy
  chunk loaded on navigation
- `dist/assets/index-C1RBi-gk.css` — 117.02 kB (20.12 kB gzip)
- Largest route chunks: `QuizCreateEdit` 13.81 kB (3.94 kB gzip),
  `StudentMaterials` 12.58 kB (3.71 kB gzip), `TeacherMaterials` 10.79 kB
  (3.43 kB gzip). Shared chunks: `dialog` 54.20 kB (18.18 kB gzip),
  `subjects` 22.62 kB (7.28 kB gzip).
- Initial JS dropped **461.85 kB → 279.53 kB raw (−39%)**, **135.69 kB →
  89.09 kB gzip (−34%)** with no vendor `manualChunks` split (lazy imports
  already separate React internals into shared chunks).

Duplicate-request fixes (verified by cache-key wiring, not yet by a live
Network capture):

- `getStudentSubjects` / `getTeacherSubjects` now hit once per 60 s window,
  shared across every screen that reads them (identity-scoped cache key).
- Subject material lists (`subjects/:id/materials?status=ready`) shared across
  Chat, FlashcardDecks and QuizCreateEdit within 60 s.
- Student/teacher dashboard stats, quiz lists, attempts and analytics are
  freshness-bounded (30 s) and invalidated on the write paths that change them.

| Journey | Requests | Duplicates | Notes |
|---------|----------|-----------|-------|
| (to be filled from live run against seeded backend) | | | |

## Decision log

- **Intent-based route preload (kept).** Sidebar link hover/focus triggers
  `preloadRoute(path)`; it shares the route's lazy loader so the chunk is
  fetched on intent and resolved on click, with no duplicate loading. Keeping
  it is low-cost (only fires on user intent, chunks are small) and it converts
  hover time into navigation time. Revisit only if the route-transition
  measurement shows no gain and the extra fetches show up as noise.
- **No vendor `manualChunks` split.** The post-change build shows lazy imports
  already pull React/router/UI-shared code into the bootstrap chunk and
  per-route chunks stay small. A hand-rolled vendor split would add config
  churn without a measured benefit; revisit if the bootstrap chunk grows
  past ~300 kB raw.
- **Custom in-memory GET cache kept over SWR.** Matches the app's explicit,
  per-screen `useApi` calls; no new dependency; identity-scoped so protected
  data never crosses users. Freshness-bounded (30–60 s) rather than
  indefinitely stale.
- **content-visibility used only on long tables** (roster, materials,
  recent-activity). The chat thread and card grids stay untouched because they
  are short or already bounded — the utility would only add layout-shift
  risk. The materials scope panels (Chat side panel, FlashcardDeck generate
  modal) use a compact `SkeletonScopePanel` while subject materials load
  instead of a spinner.
