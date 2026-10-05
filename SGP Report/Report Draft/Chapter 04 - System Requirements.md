# Chapter 4 — System Requirements

- USER CHARACTERISTICS
- FUNCTIONAL REQUIREMENT
- ACTIVITY AND PROPOSED SYSTEM
- NON FUNCTIONAL REQUIREMENT
- HARDWARE AND SOFTWARE REQUIREMENTS

## 4.1 User Characteristics

ExamAI has three kinds of users. **Students** can view enrolled subjects, scope study sessions to approved materials, ask questions, attempt published quizzes, review feedback, and generate and study flashcards. **Teachers** can manage subject materials (upload, monitor, retry, delete), author and publish quizzes manually or with AI assistance, and inspect quiz analytics and student progress. **Administrators** manage teacher/student accounts, subjects, and teacher assignments / student enrollments through the admin console (`/api/admin/*`, `/admin/*` Users, Subjects, Membership pages); they use no subject workspace and never bypass subject membership checks. No special technical knowledge is needed — the interface is designed to be usable by anyone comfortable browsing a normal website, and no user is assumed to understand vector search or language-model operation.

## 4.2 Functional Requirement

| ID | Requirement |
|----|---|
| FR-01 | The system shall authenticate a provisioned user with email and password and derive the role (student, teacher, or admin) from the backend profile. |
| FR-02 | The system shall allow teachers to upload PDF, PPTX and DOCX materials for a subject, within the configured size limit. |
| FR-03 | The system shall process uploaded material and expose processing, ready, and failed status with retry and delete. |
| FR-04 | The system shall allow enrolled students to select ready materials to scope a study session. |
| FR-05 | The system shall return RAG answers with numbered citations identifying teacher, file, and source location. |
| FR-06 | The system shall allow teachers to create manual or AI-assisted quiz drafts in a common question shape. |
| FR-07 | The system shall require teacher publication before a quiz becomes available to students. |
| FR-08 | The system shall grade attempts on the server and return per-question feedback with weak topics. |
| FR-09 | The system shall generate personal flashcard decks from student-selected material, with mastery tracking. |
| FR-10 | The system shall provide per-quiz analytics and cross-quiz student progress views to teachers. |
| FR-11 | The system shall allow administrators to manage teacher/student accounts, subjects, and teacher assignments / student enrollments via `/api/admin/*` and the `/admin/*` console, gated by `require_admin`. |

Table 4.2: Functional requirements.

## 4.3 Activity and Proposed System

A typical student activity begins with login and subject selection. The student opens the material-scope panel, chooses which ready materials should ground the session, and asks a question; the system returns an answer whose numbered citations identify the teacher and file behind each claim. The student may then attempt a published quiz under its time limit, review per-question feedback and weak topics, and generate a flashcard deck from the same or another material selection for revision.

A typical teacher activity begins with subject access, continues through material upload and ingestion monitoring, then quiz authoring — written manually or drafted by the AI from ready material and edited — followed by publication and analytics review. AI-generated quizzes always remain drafts until a teacher reviews and publishes them, keeping the teacher, not the model, responsible for assessment content. Saving personal study state is the student's domain; publishing shared assessment is the teacher's; provisioning accounts, subjects, and memberships is the administrator's; the system never mixes the three.

## 4.4 Non Functional Requirement

| Category | Requirement |
|---|---|
| Security | Role and subject-membership authorization enforced in services (including global `require_admin` for administration; admins cannot create other admins); access tokens kept in memory, refresh via HttpOnly cookie; CORS allow-list. |
| Reliability | Malformed model output, failed ingestion, retry/delete races, and concurrent operations handled without corrupting state. |
| Performance | Blocking parser/embedding work kept off the event loop; frontend uses route splitting, bounded caching, request deduplication, and stale-response protection. |
| Maintainability | Thin routes, schemas separate from ORM models, business logic in services; shared contracts via API envelopes. |
| Usability | Loading, empty, failure, and success states throughout; the active material scope always visible to the student. |
| Traceability | Every citation retains teacher, file, and source-location metadata from ingestion to answer. |

Table 4.4: Non-functional requirements.

## 4.5 Hardware and Software Requirement

**Hardware Requirement.** As a web application, ExamAI needs no special hardware — any device that can run a modern browser can use it.

- Processor: any modern dual-core processor or above.
- RAM: 4 GB or more (8 GB recommended for local backend development with local embeddings).
- Internet connection: required to reach the API and its managed services.
- Input/Output: a screen with keyboard/mouse or touchscreen.

**Software Requirement.**

| Layer | Technology / version (as used in this project) |
|---|---|
| Frontend | React 19, Vite 8, React Router 7, Zustand 5, Tailwind CSS 4 |
| Backend | Python 3.14, FastAPI, Uvicorn, SQLAlchemy 2 + Alembic, Pydantic 2 |
| AI / retrieval | sentence-transformers (`all-MiniLM-L6-v2`), qdrant-client ≥ 1.16, Gemini (`gemini-2.5-flash` configured default — verify per deployment) |
| Data & files | Supabase Postgres + Auth + private Storage |
| Tooling | Git & GitHub; FastAPI Swagger UI (`/docs`); pytest (103 backend tests); Vitest + Testing Library (84 frontend tests) |

Table 4.5: Software stack (as used).

**Server Hosting Requirement.** The system is developed and verified as a local prototype and is deployment-ready: the FastAPI backend runs under Uvicorn, the frontend builds to static assets via Vite, and data, authentication, and file storage target managed Supabase (Postgres) with vector search on Qdrant Cloud. The reference production layout is Render.com (backend API) + static frontend hosting + managed Supabase and Qdrant services. The application has not yet been deployed online; deployment remains planned future work.
