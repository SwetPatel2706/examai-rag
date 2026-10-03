# Chapter 5 — System Analysis

- STUDY OF CURRENT SYSTEM
- PROBLEMS IN CURRENT SYSTEM
- REQUIREMENT OF NEW SYSTEM
- PROCESS MODEL
- FEASIBILITY STUDY
- FEATURES OF NEW SYSTEM

## 5.1 Study of Current System

The conventional exam-preparation workflow is distributed across unconnected tools. A student reads lecture files locally, searches the web or asks a general chatbot for explanations, practices from whatever quiz links are shared, and revises from personal notes. A teacher distributes material in one location (classroom drive, LMS page), collects quiz responses in another (forms, quiz links), and manually interprets performance. Study activity and assessment share no data: what a student asked about yesterday has no connection to what they are tested on today, and what a class got wrong has no automatic path back to the material that should be re-studied.

## 5.2 Problems in Current System

- Fragmented sources — explanations live in files, chatbots, and web pages with no single approved corpus.
- Unattributed answers — chatbot responses carry no teacher, file, or page reference, so doubts cannot be resolved with the right teacher.
- No access semantics — copied files and shared links bypass any notion of enrollment or ownership.
- Incomparable assessment — per-link quizzes differ between students, so class-wide comparison is unreliable.
- Shallow feedback — a total score says what was achieved, not which topics are weak.
- Manual revision overhead — flashcards and summaries must be built entirely by hand.

## 5.3 Requirement of New System

- One approved corpus per subject: teacher-owned, status-checked materials as the only retrieval ground.
- Source-aware answers: every claim attributable to teacher, file, and page/slide.
- Subject-level authorization: enrollment for students, membership for teachers, validated per request.
- Shared assessment: one published quiz per topic for the whole class.
- Feedback with diagnosis: per-question results and weak-topic detection.
- Personal revision content: student-generated decks from selected materials.
- Connected analytics: per-quiz and cross-quiz teacher views fed by the same attempts.

## 5.4 Process Model

ExamAI was built using an incremental development model: requirements were converted into data and service contracts, then each phase delivered a vertical slice across backend and frontend, tested offline where possible, and reviewed before the next slice began. External-service risks (model availability, vector-database behaviour, embedding cost) were isolated behind utility and service boundaries, so the core logic never depends directly on a vendor response shape. Cleanup and hardening passes followed once features stabilized, rather than interrupting feature development.

## 5.5 Feasibility Study

### 5.5.1 Technical Feasibility

The system is technically feasible because each required function maps to a mature, well-documented technology: FastAPI and React for the web boundary, PostgreSQL for relational authorization and assessment data, Qdrant for filtered vector retrieval, and Gemini for structured generation validated by Pydantic schemas. All are available as free or development-tier services at this project's scale, so no specialized infrastructure is needed. The principal uncertainty — live model availability and quota — is contained by configuration and error-aware generation paths.

### 5.5.2 Operational Feasibility

The workflows match the real responsibilities of the two roles: students see only approved material and their own progress; teachers retain control over source files and shared quizzes, including mandatory review of AI-drafted questions. Most study features need no training beyond normal web use. The system is therefore operationally suitable as a classroom prototype; institutional deployment would additionally require onboarding, support, backup, and privacy procedures.

### 5.5.3 Economical Feasibility

The prototype uses open-source frameworks and managed free or development-tier services. Local embeddings avoid repeated remote-embedding cost. The variable costs are hosted database, vector storage, file storage, and model usage — each replaceable or scalable independently, since no business logic is locked to a vendor SDK beyond thin utility wrappers.

### 5.5.4 Schedule Feasibility

The phased plan in Section 3.2.3 is schedule-feasible because it keeps a stable build ahead of review milestones and explicitly defers non-essential features (personal graded quizzes, messaging, mobile clients, hybrid retrieval). Building in dependency order meant later phases consumed stable contracts instead of waiting on open design decisions.

## 5.6 Features of New System

- Secure login with backend-derived roles; enrollment- and membership-gated subject access.
- Teacher-owned material management: upload, processing/ready/failed states, retry, deletion, multi-teacher visibility.
- Document ingestion for PDF, PPTX, and DOCX with format-aware chunking and source-locator preservation.
- Attributable RAG chat over per-session material selection, with numbered teacher/file/page citations.
- Shared quizzes: manual and AI-assisted authoring, draft → publish flow, server-side grading with weak topics.
- Personal flashcard generation with mastery-state tracking.
- Teacher analytics: question-accuracy heatmap, grade distribution, weak topics per quiz; averages, completion, at-risk flags, and drill-down across quizzes.
- Frontend performance safeguards: code-split routes, bounded caching, request deduplication, stale-response protection.
