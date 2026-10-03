# Chapter 11 — Appendices

- BUSINESS MODEL
- PRODUCT DEPLOYMENT DETAIL
- API AND WEB SERVICE DETAILS

## 11.1 Business Model

ExamAI is currently built and presented as an academic project rather than a commercial product. If extended toward institutional use, it would naturally fit a department-level service model — the platform hosted for a department or coaching organization with teacher-managed subjects, private file storage, and usage-based AI limits. Any such model would require clear privacy, data-retention, accessibility, and service-cost policies. The current report makes no commercial deployment claim.

## 11.2 Product Deployment Detail

For local development, the backend runs from the `backend/` directory with Python 3.14 and its canonical virtual environment; migrations apply via Alembic, demo data seeds through the project seed command, and the FastAPI service exposes its API and documentation. The frontend starts with Vite and targets the configured API base URL.

| Component | Hosting | Role |
|---|---|---|
| Frontend | Static build (Vite output) | Serves the React application to users |
| Backend | Render.com (FastAPI via Uvicorn) | Serves the REST API |
| Database/Auth/Storage | Supabase (managed Postgres) | Users, subjects, materials, quizzes, attempts, decks; private files |
| Vector search | Qdrant Cloud (single collection) | Embedded material chunks with filterable payloads |
| Generation | Gemini API | Structured chat, quiz, and flashcard generation |

Online deployment is planned but not yet carried out; the current delivery is a verified local prototype with a defined production layout as tabulated above.

## 11.3 API and Web Service Details

ExamAI exposes its functionality through a RESTful API built with FastAPI. Every endpoint is documented automatically and can be explored interactively at `/docs` on the backend. Responses use a standardized envelope with request identification.

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Log in a provisioned user; role derived from profile |
| GET | /api/subjects | List accessible subjects for the current role |
| POST | /api/materials | Teacher upload of PDF/PPTX/DOCX with status tracking |
| POST | /api/chat | Ask a question over subject + selected material IDs |
| GET/POST | /api/quizzes | List / create (manual or AI-assisted) quizzes; publish flow |
| POST | /api/quizzes/{id}/attempts | Submit an attempt; server-side grading with weak topics |
| GET/POST | /api/flashcards/decks | List / generate personal decks; mastery updates |
| GET | /api/analytics/quiz/{id} | Per-quiz heatmap, distribution, weak topics |
| GET | /api/analytics/progress | Cross-quiz roster with at-risk flags |

Authentication is session/token based: the access token is kept in memory on the client with a HttpOnly refresh cookie, and every subject-scoped call re-checks enrollment or membership in the service layer.
