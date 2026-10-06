# Chapter 8 — System Design

- SYSTEM ARCHITECTURE
- CLASS DIAGRAM
- USE-CASE DIAGRAM
- SEQUENCE DIAGRAM
- ACTIVITY DIAGRAM
- DATA FLOW DIAGRAM (DFD)
- DATA MODEL

## 8.1 System Architecture

The architecture has a presentation layer, an API and service layer, a relational data layer, a vector retrieval layer, and external AI and storage services. The frontend calls the FastAPI API directly. Route handlers stay thin: they authenticate the request and delegate to services. Services enforce membership, read or write relational state, and call ingestion, retrieval, generation, grading, or analytics components as needed.

![Figure 8.1: System architecture](figures/fig71_architecture.png)

| Layer | Responsibilities |
|---|---|
| Frontend | Pages, routing, stores, API client, caching, loading and error states |
| API | Authentication, request validation, standardized response envelope, request IDs |
| Services | Materials, ingestion, RAG chat, quizzes, flashcards, analytics, administration; all authorization |
| Relational data | Users, subjects, memberships, materials, quizzes, attempts, decks |
| Vector + AI | Qdrant filtered retrieval, Gemini structured generation, local embeddings |
| Storage | Private teacher material files, application configuration |

Table 8.1: System architecture layers and responsibilities.

## 8.2 Class Diagram

![Figure 8.2: Class diagram](figures/fig72_class.png)

The domain centres on Subject: teachers join it through membership, students through enrollment; materials and quizzes belong to exactly one subject and one teacher; attempts belong to one student and one quiz; decks belong to one student and record the source material identifiers used at generation time. The `users.role` field is three-valued (student, teacher, admin); administrators own no subject workspace and instead manage accounts, subjects, and both join tables through the admin console.

## 8.3 Use-Case Diagram

![Figure 8.3: Use-case diagram](figures/fig73_usecase.png)

All three roles authenticate through the same sign-in flow. Subject-scoped requests are authorized against the caller’s teacher assignment or student enrollment before protected data is returned or changed. Administration requests (`/api/admin/*`, `/admin/*`) are authorized instead by the global `require_admin` gate: admins manage users, subjects, and memberships but never bypass subject checks to read study or analytics data.

## 8.4 Sequence Diagram

The sequence below shows one representative interaction — RAG chat — step by step, since this flow touches every layer of the system in a single user action: the frontend sends subject, selected material identifiers, and a question; the service checks enrollment and validates every identifier in Postgres; the question is embedded; Qdrant is queried with subject-plus-material filters; Gemini receives numbered context; the response is parsed; citation markers are mapped to payload metadata; and the API returns answer text plus citations.

![Figure 8.4: RAG chat sequence](figures/fig74_sequence.png)

## 8.5 Activity Diagram

Material ingestion begins with a teacher upload. The service validates type and size, stores the private file, creates a processing record, parses the document, normalizes text and metadata, chunks content with format-aware windows, creates embeddings, upserts points in batches, and marks the material ready. A failure marks the material failed and exposes retry; deletion removes both the relational record and its vectors. Version-safe status updates prevent stale work from reviving deleted records.

![Figure 8.5: Material ingestion activity](figures/fig75_activity.png)

## 8.6 Data Flow Diagram (DFD)

### 8.6.1 Level 0 DFD

At the highest level, students, teachers, and administrators interact with ExamAI. ExamAI uses Supabase for identity, relational data, and file storage; Qdrant for vector retrieval; and an LLM for structured generation. The system returns study answers, assessments, feedback, decks, and analytics to students and teachers, and managed accounts, subjects, and memberships to administrators.

![Figure 8.6.1: Level 0 DFD](figures/fig761_dfd0.png)

### 8.6.2 Level 1 DFD

The level-one diagram follows the implemented learning workflow: teachers prepare materials and shared quizzes, students study and complete assessments, and quiz results feed class analytics. Administration manages users and subject membership, and students receive answers, citations, scores, and personal flashcard decks.

![Figure 8.6.2: Level 1 DFD](figures/fig762_dfd1.png)

## 8.7 Data Model

The relational model contains users, subjects, subject–teacher membership, student–subject enrollment, materials, quizzes, quiz questions, quiz attempts, flashcard decks, and flashcards. A material belongs to one teacher and one subject; a subject may have multiple teachers. A quiz is teacher-authored and subject-scoped; an attempt belongs to one student and one quiz. A flashcard deck belongs to one student and records its source material identifiers. The per-session material selection is intentionally request-time data, not a table — this keeps "adjustable per session" true at the data layer.
