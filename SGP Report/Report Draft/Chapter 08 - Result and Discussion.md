# Chapter 8 — Result and Discussion

- LOGIN AND ROLE-BASED ACCESS
- STUDENT DASHBOARD AND SUBJECT VIEW
- RAG CHAT WITH MATERIAL SCOPE AND CITATIONS
- QUIZ TAKING AND FEEDBACK
- FLASHCARD GENERATION AND STUDY
- TEACHER MATERIAL MANAGEMENT
- TEACHER QUIZ AUTHORING AND PUBLISHING
- TEACHER ANALYTICS AND STUDENT PROGRESS
- SECURITY AND RELIABILITY RESULTS
- OVERALL SYSTEM PERFORMANCE

ExamAI was built, tested, and verified end to end as a local prototype: every feature described in the earlier chapters works as designed against the offline test suites (82 backend, 63 frontend) plus manual end-to-end passes over a local run. This chapter walks through the finished screens in the order a user meets them, with a short discussion of each one. (Online deployment is planned but not yet carried out, so all screens below are captured from the local build.)

## 8.1 Login and Role-Based Access

A provisioned user logs in with email and password; the backend derives the role from the stored profile and the frontend routes to the student or teacher workspace accordingly. There is no signup page and no client-side role selector — an unregistered email is rejected, and an authenticated user can never reach the other role's routes.

[SCREENSHOT REQUIRED: Figure 8.1 — Login page, plus the student vs teacher landing views after login.]

## 8.2 Student Dashboard and Subject View

The student dashboard lists enrolled subjects with quick statistics (materials available, quizzes open, decks created). Opening a subject shows its materials grouped by teacher, so multi-teacher subjects stay legible, alongside the subject's published quizzes and the student's flashcard decks. Only `ready` materials appear in the student-facing list; processing or failed items remain a teacher-side concern.

[SCREENSHOT REQUIRED: Figure 8.2a — Student dashboard with enrolled subjects. Figure 8.2b — Subject view with materials grouped by teacher.]

## 8.3 RAG Chat with Material Scope and Citations

The chat view pairs the conversation with a visible material-scope panel: the student ticks which ready materials should ground the session, and the scope travels with every question. Answers render with numbered citation markers; each citation resolves to the teacher's name, the filename, and the page or slide locator, so a student who doubts a claim knows exactly which material — and whose — to revisit. Requesting material from a subject the student is not enrolled in is refused with a forbidden response before any retrieval runs.

[SCREENSHOT REQUIRED: Figure 8.3a — Chat view with material-scope panel. Figure 8.3b — Answer with numbered citations and attribution.]

## 8.4 Quiz Taking and Feedback

Published quizzes list with topic and question count; taking a quiz runs under its configured time limit. On submission the server grades the attempt and returns the score with per-question feedback (correct choice vs chosen choice) and the derived weak topics, which the student can carry back into chat or flashcards for targeted revision. Re-submitting an attempt is idempotent — the score is not duplicated.

[SCREENSHOT REQUIRED: Figure 8.4a — Published quiz list and quiz-taking view. Figure 8.4b — Result view with per-question feedback and weak topics.]

## 8.5 Flashcard Generation and Study

From any selected material set the student generates a named deck; cards are studied in a flip view and marked still-learning or mastered, moving the card between `new`, `learning`, and `mastered` states. Decks are personal to the student and record the source material identifiers used at generation, so a deck can always be traced back to what it was built from.

[SCREENSHOT REQUIRED: Figure 8.5a — Deck list and generation from selected materials. Figure 8.5b — Flip-study view with mastery controls.]

## 8.6 Teacher Material Management

The teacher materials view lists every file in the subject with owner, type, and live status. Uploads accept PDF, PPTX, and DOCX within the size limit and enter `processing`; successful ingestion flips them to `ready`, failures to `failed` with retry exposed, and deletion removes both the record and its vectors. Co-teachers of a subject see shared materials without gaining edit rights over another teacher's files.

[SCREENSHOT REQUIRED: Figure 8.6 — Teacher materials table showing processing / ready / failed states and retry/delete actions.]

## 8.7 Teacher Quiz Authoring and Publishing

Teachers author quizzes manually question by question, or request an AI-assisted draft generated from ready material — both paths produce the same question shape (text, options, correct option, topic tag, difficulty). AI drafts land as drafts: the teacher edits, approves, and only then publishes, at which point the quiz becomes visible to every enrolled student in the subject.

[SCREENSHOT REQUIRED: Figure 8.7a — Manual quiz editor. Figure 8.7b — AI-assisted generation and draft review before publish.]

## 8.8 Teacher Analytics and Student Progress

The analytics design deliberately separates per-quiz analysis from cross-quiz student progress. Per-quiz analytics show a question-accuracy heatmap, grade distribution, and weak topics — answering "how did this quiz go?". Student progress shows a roster with average score, completion ratio, last activity, at-risk flags with stated reasons, and drill-down detail — answering "how is this student doing?". Keeping these read models separate avoids forcing two different questions into one overloaded query.

[SCREENSHOT REQUIRED: Figure 8.8a — Per-quiz analytics (heatmap, grade distribution, weak topics). Figure 8.8b — Student progress roster with at-risk flags and drill-down.]

## 8.9 Security and Reliability Results

Access tokens are kept in memory with a HttpOnly refresh cookie; the API client performs one silent refresh-and-replay after a 401 before redirecting to login. CORS uses an allow-list and storage paths are never serialized to clients. Authorization checks are repeated in services rather than relying on route declarations alone. The ingestion pipeline uses per-material locks, row-level guards, and version-safe updates, with blocking parser and embedding calls moved off the event loop. Structured generation uses Pydantic schemas as the output contract, retrying with the error, the bad response, and the schema on failure. These patterns improve reliability without pretending external AI services are deterministic.

## 8.10 Overall System Performance

The backend suite (82 tests) runs fully offline in under a second; the frontend suite (63 tests) runs under Vitest with route, store, and component coverage. Frontend performance work includes route-level code splitting, navigation prefetching, bounded safe-GET caching, concurrent request deduplication, debounced search, loading skeletons, and stale-response handling — targeting measured responsiveness while preserving correctness. The known performance caveat is dependence on hosted services (database, vector store, model API) at deployment time: latency and quota there are deployment properties, and online hosting remains planned future work (Chapter 9).
