# Chapter 3 — Project Management

- PROJECT PLANNING OBJECTIVES
- PROJECT SCHEDULING
- RISK MANAGEMENT

## 3.1 Project Planning Objectives

- Define clear goals — what the platform must do for students and for teachers — before writing any code.
- Gather requirements from the literature survey, fixing the teacher-owned / shared-assessment / attributable-answer boundaries early.
- Design the system — data model, service boundaries, and API contracts — before building features on top of them.
- Build in dependency order — authentication and data access first, then materials, then ingestion, then retrieval, then quizzes and flashcards, then analytics — so each layer can be checked before the next is built on it.
- Validate risky integrations early (vector retrieval, structured model output, concurrent ingestion) behind service boundaries.
- Test continuously — offline backend and frontend suites run throughout, not only at the end.
- Keep a stable, working build ahead of every review milestone, deferring explicit v2 scope rather than destabilizing the core.

## 3.2 Project Scheduling

### 3.2.1 Basic Principle

The project was built in layers, one on top of the other: authentication and the relational data model first, then subject and material management, then the ingestion pipeline, then RAG chat, then quizzes and flashcards, and finally analytics and hardening. Each layer was verified on its own — for example, retrieval filtering was tested against seeded data before any generation feature consumed it — so problems were caught early, one layer at a time.

### 3.2.2 Compartmentalization

The system was split into clear, separate modules so each part could be built and tested on its own: a data layer (users, subjects, memberships, materials, quizzes, attempts, decks), a backend service layer (ingestion, retrieval, generation, grading, analytics), an API layer of thin route handlers, and a frontend layer (pages, stores, API client). The Pydantic schemas shared between the API and the model-output contracts act as the agreed interfaces between modules. Splitting the work this way meant a bug in one module rarely affected the others, and responsibilities could be divided among team members along module lines (Section 3.2.4).

### 3.2.3 Work Breakdown Structure

| Phase | Primary work | Main outcome |
|---|---|---|
| 0 — Foundations | Authentication, schema, migrations, project conventions | Seeded login with role derivation; versioned data model |
| 1 — Subject & material access | Roles, enrollment, teacher-owned material management | Membership-gated subject views; upload with status tracking |
| 2 — Ingestion | PDF/PPTX/DOCX parsing, chunking, embeddings, Qdrant upserts | `processing` → `ready` / `failed` pipeline with retry and safe delete |
| 3 — RAG chat | Filtered retrieval, citation mapping, structured generation | Attributable answers scoped to per-session material selection |
| 4 — Quizzes | Manual + AI-assisted authoring, publish flow, server-side grading | Shared published quizzes with feedback and weak topics |
| 5 — Flashcards | Student-owned deck generation, mastery tracking | Personal revision decks from selected materials |
| 6 — Analytics & performance | Per-quiz and cross-quiz read models; frontend optimization | Teacher dashboards; route splitting, caching, prefetch behaviour |
| 7 — Hardening | Auth hardening, concurrency guards, test suites, cleanup | 82 offline backend tests; 63 frontend tests; audit fixes |

Table 3.1: Work breakdown structure.

### 3.2.4 Project Organization

- **Internal Guide (Ms. Shreya Bhatt, Assistant Professor, CSE):** guides and reviews the project — scope approval, design and RAG-architecture feedback, milestone reviews, and report evaluation.
- **Patel Swet (IU2341230111) — core development:** system architecture, backend services and integration, AI/RAG pipeline (ingestion, retrieval, citations, generation, retries), data model and API contracts, and overall technical integration.
- **Khatri Keshav (IU2341230068) — frontend support:** study and dashboard interface work — pages, components, loading/empty/error states, and client-side presentation behaviour.
- **Patel Dhairya (IU2341230041) — backend support:** supporting backend functionality outside the core AI/RAG implementation — route/handler assistance, validation, and service-level support tasks.
- **End users:** students (study, quizzes, revision) and teachers (materials, assessments, analytics), whose needs define acceptance.

This allocation reflects the work actually performed: the core AI/RAG architecture, retrieval pipeline, and system integration were built by Swet; Keshav and Dhairya hold contained, viva-explainable responsibilities in the frontend and supporting backend respectively.

### 3.2.5 Timeline Chart

#### 3.2.5.1 Time Allocation

Development ran over fourteen weeks, from the last week of July 2026 to the last week of October 2026 (repository history: first commit 24 Jul 2026), ahead of the November 2026 submission.

| Phase | Duration | Description |
|---|---|---|
| Requirement analysis | 2 weeks (24 Jul – 6 Aug) | Survey of existing platforms (Chapter 2), scope and role definition. |
| System design | 2 weeks (7 – 20 Aug) | Data model, service boundaries, API contracts, UI layout. |
| Development | 6 weeks (21 Aug – 1 Oct) | Foundations → materials → ingestion → RAG chat → quizzes → flashcards → analytics, in dependency order. |
| Testing | 2 weeks (2 – 15 Oct) | Offline backend suite, frontend suite, manual end-to-end passes, bug fixes. |
| Hardening & documentation | 2 weeks (16 – 29 Oct) | Auth/concurrency review, cleanup, report writing, demo preparation. |

Table 3.2.5.1: Time allocation.

## 3.3 Risk Management

| Risk | Description | Mitigation Strategy |
|---|---|---|
| LLM model/quota changes | Generation features depend on a live model name, quota and billing. | Verify the live model early per deployment; schema-first prompts with error-aware retries so failures are structured, not silent. |
| Incorrect retrieval scope | Answers could cite material from a subject the student is not enrolled in. | Validate every material ID in Postgres before querying Qdrant; filter by both subject and material IDs (defence in depth). |
| Concurrent ingestion | Simultaneous upload / retry / delete could revive deleted rows or corrupt status. | Per-material locks, row-level guards, and version-safe conditional status updates. |
| Unclear role boundaries | Students reaching teacher functions or other subjects' content. | Service-layer membership checks on every subject-scoped operation; 403 (not 404) for unenrolled access. |
| Slow external services | Embedding, vector DB, or model latency hurting responsiveness. | Blocking work off the event loop; bounded caching and request deduplication on the client. |
| Scope creep | Personal quizzes, messaging, mobile apps delaying the core. | Explicit in-scope / future-scope split from Section 1.3, enforced at planning. |
| Time constraints | Any phase overrunning into review milestones. | Stable-build-ahead-of-review rule; risky integrations isolated behind service boundaries. |

Table 3.3: Risk management.
