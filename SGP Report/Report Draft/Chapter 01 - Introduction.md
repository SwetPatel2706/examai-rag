# Chapter 1 — Introduction

- PROJECT SUMMARY
- PROJECT PURPOSE
- PROJECT SCOPE
- OBJECTIVES
- TECHNOLOGY AND LITERATURE OVERVIEW
- SYNOPSIS

## 1.1 Project Summary

ExamAI is a web application built to make exam preparation more trustworthy and less fragmented for students, while giving teachers control over the material that AI-assisted study is grounded in. Today a student preparing for an examination typically searches through several files, asks a general-purpose chatbot that cannot say where its answer came from, practices from quiz links that differ from student to student, and revises from self-made notes. A teacher, meanwhile, distributes material in one place, collects quiz responses in another, and interprets class performance largely by hand.

ExamAI brings these activities into a single role-aware platform. A student selects an enrolled subject, chooses which teacher-approved materials should scope a study session, asks questions, and receives answers with numbered citations that identify the teacher, the file, and the page or slide each claim comes from. The same student attempts the same published quiz as every classmate in the subject, receives per-question feedback with weak topics, and generates personal flashcard decks from selected material for revision. A teacher uploads PDF, PPTX and DOCX materials, monitors their processing status, authors quizzes manually or with AI assistance, publishes them for the class, and reviews performance through per-quiz analytics and cross-quiz student progress views.

The application is built using React for the frontend, FastAPI (Python) for the backend, PostgreSQL for relational data, Qdrant for vector retrieval, and Gemini for structured generation. Access control follows subject membership on both sides: teachers act through subject membership, students through subject enrollment.

## 1.2 Project Purpose

The purpose of ExamAI is to give students one reliable place to prepare for examinations from material their teachers actually approve — and to make every AI-generated answer traceable back to that material. An answer that cannot say which teacher's file and which page it came from leaves a student with no one to ask when in doubt. ExamAI treats attribution as a core requirement, not a cosmetic addition: each citation carries the teacher's name, the filename, and the source page or slide, so a confused student knows exactly who to contact. (Contacting the teacher remains out of scope; the system only surfaces who and what.)

For teachers, the purpose is complementary: a practical way to distribute approved material, create comparable assessments in which every student answers the same questions, and inspect class-wide progress instead of reconciling scattered quiz tools. Building it as one system, rather than four disconnected tools, keeps study activity, assessment, and analytics connected by the same data and authorization rules.

## 1.3 Project Scope

The system is capable of:

- Secure email/password login for provisioned users, with the role (student or teacher) derived from the backend profile.
- Subject dashboards: enrolled subjects for students, teaching subjects for teachers, with multi-teacher subjects supported.
- Teacher-owned material uploads (PDF, PPTX, DOCX, 25 MB limit) with processing / ready / failed status, retry, and deletion.
- Subject-scoped RAG chat over a per-session material selection, returning answers with numbered teacher/file/page citations.
- Manual and AI-assisted quiz authoring converging on the same question shape, with a draft → review → publish flow.
- Shared published quizzes: all students in a subject take the same quiz; server-side grading with per-question feedback and weak-topic detection.
- Student-owned flashcard deck generation from selected materials, with mastery tracking (new / learning / mastered).
- Teacher analytics: per-quiz views (accuracy heatmap, grade distribution, weak topics) and cross-quiz student progress (averages, completion, at-risk flags, drill-down).

The current version has a few known limits:

- It is a web application only — there is no mobile app yet.
- Users are provisioned by an explicit seed operation; there is no public signup, password reset, OAuth, or admin role.
- There is no in-app teacher–student messaging or broadcast.
- Student-generated graded quizzes are deferred as explicit v2 scope, to protect the fairness of shared assessment.
- Retrieval is dense-vector only; hybrid dense-plus-sparse search is a flagged future enhancement, not part of this delivery.
- The live behaviour of generation features depends on the configured Gemini model, quota and billing, which must be verified per deployment (the configured default is `gemini-2.5-flash`).

## 1.4 Objectives

### 1.4.1 Main Objectives

- To build a single role-aware platform for AI-assisted exam preparation.
- To ground every study answer in teacher-approved material and attribute each claim to its teacher, file, and page or slide.
- To keep assessment fair by publishing one shared quiz per topic for all students in a subject.
- To return feedback beyond a total score: per-question results and weak-topic detection.
- To let students generate personal revision decks from their own selected materials.
- To give teachers class-wide comparability through per-quiz analytics and cross-quiz progress views.

### 1.4.2 Secondary Objectives

- To enforce subject membership and role authorization in service-layer logic, not only in route declarations.
- To preserve source metadata end to end — parsing, chunking, embedding, retrieval, citation — so attribution never depends on a per-request database lookup.
- To handle structured model-output failures through schema-driven, error-aware retries.
- To keep the ingestion pipeline safe under concurrent upload, retry, and delete operations.
- To keep the codebase organized (thin routes, logic in services, schemas separate from models) so new features do not require rewriting old ones.

## 1.5 Technology and Literature Overview

### 1.5.1 Retrieval-Augmented Generation

Retrieval-augmented generation is an approach that combines information retrieval with language generation. Instead of asking a model to answer from its general training alone, the system first retrieves relevant passages from a controlled collection and supplies them as context, so the answer is grounded in identifiable sources. ExamAI uses this approach for subject chat and for AI-assisted quiz generation: retrieval is constrained by subject enrollment and the student's selected materials before the vector database is ever queried.

### 1.5.2 Vector Search and Embeddings

An embedding represents text as a numerical vector, so that semantically related passages can be compared by distance. ExamAI embeds material chunks locally with the `all-MiniLM-L6-v2` sentence model and stores them in a single Qdrant collection shared across all subjects and materials. Each stored point carries payload metadata — subject, material, teacher, filename, teacher name, and a stable source locator (page, slide, or paragraph number) — which makes metadata-filtered retrieval and citation attribution possible without per-chunk database round-trips.

### 1.5.3 Programming Languages

Programming languages provide the instructions a computer executes to build software systems. ExamAI's backend and ingestion pipeline are written in Python, and its frontend is written in JavaScript (as React/JSX). Python was chosen for the backend because the AI ecosystem — embedding libraries, document parsers, and model clients — is strongest there; JavaScript/React was chosen for the frontend because the interface is a dynamic, stateful study workspace.

### 1.5.4 Libraries and Tools

The project uses several important libraries:

- React.js — used for building the interactive study interface (dashboards, chat, quiz taking, flashcards, analytics).
- Vite — provides fast builds and the development server for the frontend.
- FastAPI — the Python web framework serving the HTTP API, with automatic request validation and interactive API documentation.
- SQLAlchemy + Alembic — database access with defined schema, plus versioned migrations.
- Pydantic — validates API shapes and doubles as the structured-output contract for model generation.
- Supabase — provides authentication, PostgreSQL hosting, and private file storage.
- Qdrant client — metadata-filtered vector search over embedded material chunks.
- Zustand, React Router, Tailwind CSS — client state, navigation, and styling.

### 1.5.5 Literature Overview

Digital learning platforms have been studied and built extensively: learning-management systems organize content and grades, MOOC platforms deliver courses at scale, flashcard tools support spaced revision, and general-purpose chatbots answer arbitrary questions fluently. What the survey in Chapter 2 shows is that none of the widely used options combine the four properties an examination setting needs — teacher-approved sources, answers attributed to a teacher and page, one shared assessment for the whole class, and class-wide analytics — in a single system. ExamAI is built specifically to close that gap, as detailed in Chapter 2.

## 1.6 Synopsis

ExamAI is a web-based exam-preparation platform in which students study from teacher-approved materials through attributable RAG chat, take the same teacher-published quizzes as their classmates, revise with self-generated flashcards, and teachers monitor class performance through analytics. It is built with React, FastAPI, PostgreSQL, Qdrant, and Gemini, with authorization enforced at the service layer and source metadata preserved from ingestion to citation. The following chapters present the literature survey, project management, requirements, analysis, testing, design, results, limitations, and conclusion of the project.
