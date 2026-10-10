# ExamAI — Project Detail for Resume Generation

> Purpose: This file is the machine-readable/agent-consumable source of truth about the ExamAI project. It contains **project facts only** (no personal/education data — the resume builder agent supplies that). Use the quantified claims here to build resume bullets. Every claim is verifiable in the repository (`README.md`, codebase, architecture docs).

## 1. One-line summary
ExamAI is a full-stack, AI-powered exam preparation and academic RAG platform that eliminates LLM hallucinations by scoping student inquiries strictly to teacher-uploaded course materials with verified page- and slide-level citations. The system allows students to dynamically adjust material scopes, study AI-generated flashcards, and take teacher-authored quizzes, while providing teachers with automated AI quiz drafting and class-wide analytics including question accuracy heatmaps and at-risk student detection.

## 2. Project type & timeline
- **Type:** Final-year capstone project; full-stack production-grade application engineered as a modular monolith.
- **Timeline / Milestones:** 
  - Review 1: Core ideation, baseline prototype, and teacher-centric scoping pivot (Completed 11/07/2026).
  - Review 2: Analysis & Design, schema specifications, and ingestion foundation (08/08/2026).
  - Review 3: Progress Demo, multi-format RAG pipeline, and citation attribution (22/08/2026).
  - Review 4: Final Demo, anti-cheating quiz taking, class-wide analytics, and admin extension (26/09/2026).
  - Final Capstone Submission: Comprehensive documentation, hardening, and verification (01/10/2026 – 10/10/2026).
- **Development strategy:** Phased iterative delivery across 5 core development phases plus an administrative management extension; every stage is governed by formal architecture documents, design walkthroughs, 100% offline unit/integration test suites, and strict separation between persistence and data contracts.

## 3. Tech stack
- **Backend:** Python 3.14.6, FastAPI (>=0.110.0), SQLAlchemy 2.0 (>=2.0.28), Alembic 1.13, Pydantic v2 (>=2.6.0), `pydantic-settings` (>=2.2.0), `psycopg2-binary` (>=2.9.9), Uvicorn (>=0.28.0), HTTPX (>=0.27.0).
- **Frontend:** React 19 (`^19.2.7`), Vite 8 (`^8.1.1`), React Router DOM v7 (`^7.18.1`), Zustand 5 (`^5.0.14`), Tailwind CSS v4 (`^4.1.18`), Lucide React (`^1.26.0`), Base UI primitives (`@base-ui/react: ^1.6.0`), Geist Font (`@fontsource-variable/geist`).
- **AI / Data / Search:** Google Gemini 2.5 Flash via official `google-genai` SDK (`>=0.7.0`), Qdrant Cloud vector database (`qdrant-client: >=1.16.0`), local embeddings via `sentence-transformers` (`all-MiniLM-L6-v2`, 384-dimensional dense embeddings), multi-format parsing engines (`pypdf >=5.0.0`, `python-pptx >=1.0.0`, `python-docx >=1.1.0`).
- **Auth / Storage / Infra:** Supabase (PostgreSQL 15+, Supabase GoTrue Auth REST API with service-role admin provisioning, Supabase S3-compatible Storage), JWT access token stored strictly in client memory, HttpOnly refresh cookie scoped to `/api/auth`, Render.com cloud deployment.

## 4. Architecture highlights (resume-worthy)
- **Teacher-Centric Scoping & Dynamic Session Filters:** Decoupled vector querying from individual student uploads by making all study materials teacher-owned and subject-scoped. Students pass dynamic `selected_material_ids` per request; the database purposely avoids persisting student material selections, guaranteeing stateless and flexible session-level customization.
- **Composite Defense-in-Depth Pre-Query Authorization:** Eliminated cross-tenant and cross-subject vector data leaks by enforcing a mandatory relational check in PostgreSQL prior to Qdrant searches (`Material.subject_id == subject_id`, `Material.status == 'ready'`). Vector search queries then enforce a secondary combined Qdrant `Filter` on both `subject_id` and `material_id`.
- **Unified Vector Collection with Denormalized Attribution:** Avoided high-latency multi-collection provisioning by maintaining a single Qdrant collection (`exam_materials`). Chunks denormalize `material_id`, `teacher_id`, `teacher_name`, `subject_id`, `filename`, `chunk_index`, and granular `source_locator` (`{type: "page"|"slide"|"paragraph", value: int}`) directly into vector payloads, eliminating database joins during citation resolution.
- **Geometric 2D Shape-Sorting for Slide Decks:** Resolved PowerPoint visual reading order corruption caused by `python-pptx` default shape iteration by engineering a 2D spatial coordinate sorter ($\text{sort\_key} = (\text{shape.top}, \text{shape.left})$). Slide chunks use a 2-slide sliding window with 1-slide overlap and slide title prepending to retain bullet context.
- **Self-Healing Error-Aware Structured Output Pipeline:** Designed a robust two-attempt LLM execution pipeline (`generate_json_with_retry` and `error_aware_retry_prompt`) using Pydantic v2 schemas. If initial generation fails validation, the system reconstructs the prompt with the exact Pydantic validation error and raw invalid response, lifting JSON parsing success from ~50% to >98% before failing cleanly with HTTP 502.
- **Thread-Safe Ingestion with Striped Locks and Optimistic Versioning:** Decoupled heavy document parsing and vector upserting from the main event loop using `asyncio.to_thread`. Managed concurrency via 64 memory-bounded striped `threading.RLock` instances, database row-level locking (`SELECT ... FOR UPDATE`), and atomic conditional SQL updates (`UPDATE ... WHERE ingestion_version = version AND status != 'deleting'`).
- **Secure Dual-Tier Auth Lifecycle & Distributed Transaction Compensation:** Implemented dual-system user provisioning synchronizing Supabase Auth accounts with PostgreSQL profiles using matching UUIDs. If profile creation fails, the system executes an automated compensating rollback that purges the orphan Supabase Auth account. Frontend stores JWTs in memory with automatic silent token rotation via HttpOnly refresh cookies.
- **Idempotent Quiz Evaluation & Anti-Cheating Ingestion:** Guarded quiz submissions with composite database unique constraints (`quiz_id, student_id`), time limit duration checks (`time_limit_seconds`), and idempotent retry handlers. Response serialization sanitizes `correct_option` fields entirely from student-facing payloads while caching detailed diagnostic topic feedback.

## 5. Features (by role / domain)
- **Student Workflows:**
  - **Subject Hub & Material Picker:** Browse enrolled subjects, inspect multi-teacher course faculty, and view uploaded lecture notes grouped by instructor.
  - **Attributed RAG Chat:** Ask natural-language study questions scoped to custom sets of teacher materials with interactive inline citation pills (`[1]`, `[2]`) that display tooltips with teacher names and exact page/slide locators.
  - **Shared Quizzes & Diagnostic Feedback:** Complete timed, teacher-authored quizzes with automatic submission and instant grading breakdowns highlighting weak concepts.
  - **AI Flashcards:** Generate personal multi-card study decks from selected materials with 3D flip card interactions and mastery-tracking states (`learning`, `mastered`).
- **Teacher Workflows:**
  - **Material Management:** Upload PDF, PPTX, and DOCX course materials with real-time ingestion status tracking (`processing`, `ready`, `failed`), retry capabilities, and co-teacher visibility.
  - **Dual-Mode Quiz Authoring:** Create quizzes manually or trigger AI-assisted draft generation over selected materials using Gemini, with full draft-edit-publish workflows.
  - **Quiz Analytics:** Inspect individual quiz metrics including aggregate question difficulty heatmaps, grade distribution histograms, and topic-level student error rates.
  - **Student Progress Roster:** Monitor cross-subject student engagement, average scores, completion ratios, and automated "at-risk" flags based on configurable scoring thresholds.
- **Administrator Workflows:**
  - **User & Subject Governance:** Provision, update, search, and delete teacher and student accounts through the dedicated `/admin` portal.
  - **Membership Assignment:** Assign multiple teachers to shared subjects and manage student course enrollments with relational consistency checks.

## 6. Quantifiable facts (use these in resume bullets)
- **Test suite & coverage:** 187 automated tests passing in total:
  - **Backend:** 103 unit/integration tests running via `pytest` completely offline in ~0.8s without external API or cloud database dependencies.
  - **Frontend:** 84 component and integration tests across 15 test suites running via `vitest` in ~3.0s with mock-server isolation.
  - **Linting:** 100% clean passes using `oxlint` with zero linting warnings across the frontend codebase.
- **Development scale & phases:** 5 core engineering phases (Phase 1 Ingestion, Phase 2 Multi-Teacher Scope, Phase 3 RAG & Citations, Phase 4 Quiz Taking & Timing, Phase 5 Analytics & At-Risk Detection) + Admin Extension and Review 1 hardening; 3 formal Alembic schema migration versions.
- **API Surface:** 47 fully typed REST API endpoints spanning 10 routers (`health`, `auth`, `me`, `subjects`, `materials`, `chat`, `flashcards`, `quizzes`, `analytics`, `admin`). Standardized JSON envelope (`{success, data, error, meta}`) with automated `X-Request-ID` tracing and `X-Process-Time` latency logging headers.
- **Data scale / Seed data:** Realistic, deterministic database seed featuring:
  - **Users:** 32 total users (1 admin, 5 teachers, 26 students).
  - **Curriculum:** 5 academic subjects with multi-teacher assignments and realistic student enrollments.
  - **Course Materials:** 14 multi-format materials containing academic text paragraphs (ready, processing, and failed states for edge testing).
  - **Assessments:** 12 quizzes (8 published, 4 drafts) comprising 68 vetted questions and ~90 participation-modeled student attempts.
  - **Flashcards:** 14 decks containing 114 interactive flashcards.
- **Code health & refactoring:** Strict architectural separation of Pydantic request/response schemas (`app/schemas/`) from SQLAlchemy ORM entities (`app/models/`); bounded 64-stripe locking avoiding unbounded concurrency allocations; zero client-side business logic leakage.
- **Data / AI Pipelines:** 
  - **Chunking rules:** PDF sliding window of 400 words with 50-word overlap; PPTX sliding window of 2 slides with 1-slide overlap.
  - **Embeddings:** Local CPU-optimized `all-MiniLM-L6-v2` generating 384-dimensional dense vectors.
  - **Qdrant parameters:** Upserts batched at 100 points; top_k retrieval default set to 5 chunks; context buffer capped at 18,000 characters.
- **AI / LLM Reliability Engineering:** Gemini 2.5 Flash temperature pinned to 0.2; JSON response schema enforced at the provider level; automated 2-pass error-aware retry; LLM prompt/response debug logging gated exclusively to local environments (`LLM_DEBUG_LOGGING=False` in production) with 2,000-character payload truncation and zero user PII logging.
- **Security & Hardening:** Strict CORS origin whitelisting forbidding wildcards on authenticated routes; HttpOnly cookie isolation for refresh tokens; JWTs confined to memory; role-based route dependencies (`require_admin`, `require_teacher`, `require_student`); pre-query SQL authorization before vector database interaction.

## 7. Engineering practices demonstrated
- **Layered Architecture Separation:** Thin HTTP routes dedicated to serialization and status codes, pushing business logic, authorization rules, and vector mechanics entirely into dedicated services (`app/services/`).
- **Defensive Multi-Tenant Access Control:** Relational database pre-validation prior to vector search execution to guarantee students can never retrieve chunks outside their enrolled subjects or selected materials.
- **Distributed Transaction Compensation:** Synchronous error handling and rollback across disparate stateful systems (PostgreSQL database transactions and Supabase GoTrue Auth accounts).
- **Deterministic Offline Testing:** High-speed, mock-driven test architecture enabling 187 comprehensive frontend and backend tests to execute in under 4 seconds without external cloud dependencies.
- **Concurrency & Lock Guardrails:** Striped memory-bounded locks coupled with database row locks (`SELECT ... FOR UPDATE`) and optimistic versioning to prevent file ingestion race conditions.

## 8. Repository map (for quick reference)
```
examai-rag/
├── AGENTS.md                          # Root architecture guide, deadlines & conventions
├── README.md                          # Quickstart, setup instructions, & test guides
├── INTERVIEW_PREPARATION_GUIDE.md     # In-depth architectural interview master guide
├── backend/
│   ├── alembic.ini                    # Database migration configuration
│   ├── requirements.txt               # Production Python dependencies
│   ├── requirements-dev.txt           # Test-only dependencies (reportlab, etc.)
│   ├── app/
│   │   ├── main.py                    # FastAPI initialization, middleware, & router mounts
│   │   ├── config.py                  # Pydantic BaseSettings environment validation
│   │   ├── auth/                      # Supabase GoTrue client & FastAPI role dependencies
│   │   ├── db/                        # SQLAlchemy engine, SessionLocal, & base models
│   │   ├── models/                    # SQLAlchemy ORM entities (user, subject, quiz, etc.)
│   │   ├── schemas/                   # Pydantic schemas (contracts & LLM prompt targets)
│   │   ├── routes/                    # 10 thin REST controllers (admin, chat, quizzes, etc.)
│   │   ├── services/
│   │   │   ├── ingestion/             # Parsers (PDF, PPTX, DOCX), chunker, & pipeline
│   │   │   ├── rag/                   # Vector retriever, citation mapper, & chat service
│   │   │   ├── quiz/                  # Manual authoring, AI generation, & grading engine
│   │   │   ├── flashcards/            # Flashcard deck generation service
│   │   │   └── analytics/             # Per-quiz heatmaps & class-wide student progress
│   │   ├── utils/                     # Qdrant client, Gemini client, retry helper, storage
│   │   ├── seed.py                    # Idempotent database & vector seeding script
│   │   └── seed_data.py               # Deterministic demo dataset declarations
│   ├── migrations/versions/           # Alembic schema migration files
│   └── tests/                         # 103 backend pytest integration & unit tests
└── frontend/
    ├── package.json                   # Node dependencies & test scripts
    ├── vite.config.js                 # Vite bundler configuration
    ├── vitest.config.js               # Vitest test suite runner setup
    └── src/
        ├── App.jsx                    # Route hierarchy, auth bootstrap, & role guards
        ├── api/                       # Modular REST client wrappers with token refresh
        ├── components/                # Modular UI primitives, modals, & scope sidebars
        ├── pages/                     # Student, Teacher, & Admin page components
        ├── store/                     # Zustand state slices (authStore, materialScopeStore)
        └── test/                      # 84 frontend Vitest test files & DOM mocks
```

## 9. Suggested resume angle
- **Targeting Full-Stack Software Engineer Roles:** Highlight end-to-end system ownership from React 19 UI state management (Zustand, HttpOnly cookies, responsive dashboards) to FastAPI backend design, multi-tenant relational schemas, and 187 automated tests.
- **Targeting AI / RAG / Machine Learning Systems Roles:** Emphasize the defensive vector search architecture (Qdrant single-collection metadata filtering, composite SQL pre-query authorization), multi-format parsing algorithms (2D geometric PPTX coordinate sorting), and the error-aware self-healing LLM structured output pipeline.
- **Targeting Backend / Distributed Systems Roles:** Focus on thread-safe background ingestion (striped `RLock`s, PostgreSQL row locks `FOR UPDATE`, optimistic conditional updates), distributed transaction rollbacks between Supabase Auth and PostgreSQL, and high-performance offline integration test engineering.
- **Targeting Frontend / Product Engineer Roles:** Emphasize modern React 19 patterns, stateful session scope filtering without unnecessary server roundtrips, accessible interactive UI components with custom design tokens, and robust client-side token rotation resilience.
