# Chapter 3 — Project Management

- PROJECT PLANNING OBJECTIVES
- SOFTWARE SCOPE
- RESOURCE
- PROJECT DEVELOPMENT APPROACH
- PROJECT SCHEDULING
- RISK MANAGEMENT

## 3.1 Project Planning Objectives

- Define clear goals — what the platform must do for students, for teachers, and for administrators — before writing any code.
- Gather requirements from the literature survey, fixing the teacher-owned / shared-assessment / attributable-answer boundaries early.
- Design the system — data model, service boundaries, and API contracts — before building features on top of them.
- Build in dependency order — authentication and data access first, then materials, then ingestion, then retrieval, then quizzes and flashcards, then analytics — so each layer can be checked before the next is built on it.
- Validate risky integrations early (vector retrieval, structured model output, concurrent ingestion) behind service boundaries.
- Test continuously — offline backend and frontend suites run throughout, not only at the end.
- Keep a stable, working build ahead of every review milestone, deferring explicit v2 scope rather than destabilizing the core.

## 3.2 Software Scope

ExamAI is an in-house academic Software Group Project — there is no external company or client. The software scope covers a role-aware web platform with three roles (student, teacher, admin): teacher-owned material ingestion (PDF, PPTX, DOCX), metadata-filtered RAG chat with teacher/file/page citations, shared published quizzes with server-side grading, personal flashcard decks, class-wide analytics, and an administration console (user/subject/membership management via `/api/admin/*` and `/admin/*`). Out of scope (explicit v2): student-generated graded quizzes, in-app messaging/broadcast, mobile clients, hybrid retrieval, and institutional identity integration.

## 3.3 Resource

### 3.3.1 Human Resource

- Internal Guide (Ms. Shreya Bhatt, Assistant Professor, CSE): scope approval, design and RAG-architecture feedback, milestone reviews, report evaluation.
- Patel Swet (IU2341230111) — core development: system architecture, backend services, AI/RAG pipeline, data model and API contracts.
- Khatri Keshav (IU2341230068) — frontend support: study and dashboard interface work.
- Patel Dhairya (IU2341230041) — backend support: route/handler assistance, validation, service-level support.
- End users: students, teachers, and administrators, whose needs define acceptance. (Detailed responsibility split: Section 3.5.4.)

### 3.3.2 Reusable Software Resources

Open-source and managed reusable components (versions as used): React 19, Vite 8, React Router 7, Zustand 5, Tailwind CSS 4; Python 3.14, FastAPI, Uvicorn, SQLAlchemy 2 + Alembic, Pydantic 2; sentence-transformers (`all-MiniLM-L6-v2`), qdrant-client ≥ 1.16, Gemini API (`gemini-2.5-flash` configured default — verify per deployment); Supabase Postgres + Auth + private Storage; Qdrant Cloud; pytest (103 backend tests), Vitest + Testing Library (84 frontend tests).

### 3.3.3 Environment Resource

Local development runs from `backend/` with the canonical `backend/venv/` (Python 3.14.6) plus Node 20.19+/22.12+ for the frontend; migrations via Alembic, demo data via the seed command, Qdrant collection via the provision command. Reference production layout: Render.com (API) + static frontend hosting + managed Supabase and Qdrant services.

## 3.4 Project Development Approach

ExamAI was built with an incremental development model: requirements were converted into data and service contracts, then each phase delivered a vertical slice across backend and frontend, tested offline where possible, and reviewed before the next slice began. External-service risks (model availability, vector-database behaviour, embedding cost) were isolated behind utility and service boundaries, so core logic never depends directly on a vendor response shape. Cleanup and hardening passes followed once features stabilized.

## 3.5 Project Scheduling

### 3.5.1 Basic Principle

The project was built in layers, one on top of the other: authentication and the relational data model first, then subject and material management, then the ingestion pipeline, then RAG chat, then quizzes and flashcards, and finally analytics and hardening. Each layer was verified on its own — for example, retrieval filtering was tested against seeded data before any generation feature consumed it — so problems were caught early, one layer at a time.

### 3.5.2 Compartmentalization

The system was split into clear, separate modules so each part could be built and tested on its own: a data layer (users, subjects, memberships, materials, quizzes, attempts, decks), a backend service layer (ingestion, retrieval, generation, grading, analytics, administration), an API layer of thin route handlers (including `/api/admin/*`), and a frontend layer (pages including the `/admin/*` Users/Subjects/Membership console, stores, API client). The Pydantic schemas shared between the API and the model-output contracts act as the agreed interfaces between modules. Splitting the work this way meant a bug in one module rarely affected the others, and responsibilities could be divided among team members along module lines (Section 3.5.4).

### 3.5.3 Work Breakdown Structure

| Phase | Primary work | Main outcome |
|---|---|---|
| 0 — Foundations | Authentication, schema, migrations, project conventions | Seeded login with role derivation (student, teacher, admin); versioned data model |
| 1 — Subject & material access | Roles, enrollment, teacher-owned material management | Membership-gated subject views; upload with status tracking |
| 2 — Ingestion | PDF/PPTX/DOCX parsing, chunking, embeddings, Qdrant upserts | `processing` → `ready` / `failed` pipeline with retry and safe delete |
| 3 — RAG chat | Filtered retrieval, citation mapping, structured generation | Attributable answers scoped to per-session material selection |
| 4 — Quizzes | Manual + AI-assisted authoring, publish flow, server-side grading | Shared published quizzes with feedback and weak topics |
| 5 — Flashcards | Student-owned deck generation, mastery tracking | Personal revision decks from selected materials |
| 6 — Analytics & performance | Per-quiz and cross-quiz read models; frontend optimization | Teacher dashboards; route splitting, caching, prefetch behaviour |
| 7 — Hardening | Auth hardening, concurrency guards, test suites, cleanup | 103 offline backend tests; 84 frontend tests; audit fixes |
| 8 — Administration console | Admin API (`/api/admin/*`), `/admin/*` Users/Subjects/Membership pages, seed admin | `admin@examai.com` provisioning; `require_admin` gating; 19 backend + 16 frontend admin tests |

Table 3.1: Work breakdown structure.

### 3.5.4 Project Organization

- **Internal Guide (Ms. Shreya Bhatt, Assistant Professor, CSE):** guides and reviews the project — scope approval, design and RAG-architecture feedback, milestone reviews, and report evaluation.
- **Patel Swet (IU2341230111) — core development:** system architecture, backend services and integration, AI/RAG pipeline (ingestion, retrieval, citations, generation, retries), data model and API contracts, and overall technical integration.
- **Khatri Keshav (IU2341230068) — frontend support:** study and dashboard interface work — pages, components, loading/empty/error states, and client-side presentation behaviour.
- **Patel Dhairya (IU2341230041) — backend support:** supporting backend functionality outside the core AI/RAG implementation — route/handler assistance, validation, and service-level support tasks.
- **End users:** students (study, quizzes, revision), teachers (materials, assessments, analytics), and administrators (user/subject/membership provisioning via the admin console), whose needs define acceptance.

This allocation reflects the work actually performed: the core AI/RAG architecture, retrieval pipeline, and system integration were built by Swet; Keshav and Dhairya hold contained, viva-explainable responsibilities in the frontend and supporting backend respectively.

### 3.5.5 Timeline Chart

#### 3.5.5.1 Time Allocation

Development ran over fourteen weeks, from the last week of July 2026 to the last week of October 2026 (repository history: first commit 24 Jul 2026), ahead of the November 2026 submission.

| Phase | Duration | Description |
|---|---|---|
| Requirement analysis | 2 weeks (24 Jul – 6 Aug) | Survey of existing platforms (Chapter 2), scope and role definition. |
| System design | 2 weeks (7 – 20 Aug) | Data model, service boundaries, API contracts, UI layout. |
| Development | 6 weeks (21 Aug – 1 Oct) | Foundations → materials → ingestion → RAG chat → quizzes → flashcards → analytics, in dependency order. |
| Testing | 2 weeks (2 – 15 Oct) | Offline backend suite, frontend suite, manual end-to-end passes, bug fixes. |
| Hardening & documentation | 2 weeks (16 – 29 Oct) | Auth/concurrency review, cleanup, report writing, demo preparation. |

Table 3.2: Time allocation.

#### 3.5.5.2 Task Sets

| Task set | Tasks |
|---|---|
| Requirements | Literature survey (Chapter 2), role/scope definition, API and data-model contracts. |
| Design | Relational schema + migrations, service boundaries, ingestion/retrieval contracts, UI layout. |
| Build | Auth → subjects/materials → ingestion → RAG chat → quizzes → flashcards → analytics, in dependency order. |
| Verification | 103 offline backend tests, 84 frontend tests, manual end-to-end passes, concurrency and auth review. |
| Documentation | Report chapters, figures/screenshots, demo preparation, stable build ahead of review. |

Table 3.3: Task sets.

## 3.6 Risk Management

### 3.6.1 Risk Identification

| Risk | Description | Mitigation Strategy |
|---|---|---|
| LLM model/quota changes | Generation features depend on a live model name, quota and billing. | Verify the live model early per deployment; schema-first prompts with error-aware retries so failures are structured, not silent. |
| Incorrect retrieval scope | Answers could cite material from a subject the student is not enrolled in. | Validate every material ID in Postgres before querying Qdrant; filter by both subject and material IDs (defence in depth). |
| Concurrent ingestion | Simultaneous upload / retry / delete could revive deleted rows or corrupt status. | Per-material locks, row-level guards, and version-safe conditional status updates. |
| Unclear role boundaries | Students reaching teacher functions or other subjects' content; admin misuse. | Service-layer membership checks on every subject-scoped operation plus global `require_admin` on administration endpoints; 403 (not 404) for unenrolled access; admins cannot create other admins or delete themselves. |
| Slow external services | Embedding, vector DB, or model latency hurting responsiveness. | Blocking work off the event loop; bounded caching and request deduplication on the client. |
| Scope creep | Personal quizzes, messaging, mobile apps delaying the core. | Explicit in-scope / future-scope split from Section 1.3, enforced at planning. |
| Time constraints | Any phase overrunning into review milestones. | Stable-build-ahead-of-review rule; risky integrations isolated behind service boundaries. |

Table 3.4: Risk management.

### 3.6.2 Risk Identification Artifacts

The risk register above is the primary artifact: each risk carries a description and a mitigation strategy that maps to a concrete mechanism (Postgres pre-validation + Qdrant subject/material filters, per-material locks with version-safe status updates, service-layer membership checks, schema-first prompts with error-aware retries, bounded client caching with request deduplication). Phase exit criteria (stable build ahead of each review) act as the schedule-risk artifact.

### 3.6.3 Risk Projection

High-impact risks are incorrect retrieval scope and concurrent ingestion (data-integrity class) — projected as low probability after the service-layer guards, but monitored through the offline suites and manual end-to-end passes. Medium-impact risks are LLM model/quota changes and slow external services (deployment-environment class) — contained by configuration and by keeping blocking work off the event loop. Scope creep and time constraints are controlled by the explicit in-scope/future-scope split (Section 1.3) and the stable-build-ahead-of-review rule.
