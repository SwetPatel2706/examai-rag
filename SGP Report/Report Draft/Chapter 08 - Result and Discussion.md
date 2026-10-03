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

ExamAI was built, tested, and verified end to end as a local prototype: every feature described in the earlier chapters works as designed against the offline test suites (82 backend, 63 frontend) plus manual end-to-end passes over a local run. This chapter walks through the finished screens in the order a user meets them, with a short discussion of each one. (Online deployment is planned but not yet carried out, so all screens below are captured from the local build running against seeded demo accounts — the names visible are seed data, not real users.)

## 8.1 Login and Role-Based Access

A provisioned user logs in with email and password; the backend derives the role from the stored profile and the frontend routes to the student or teacher workspace accordingly. The sign-in form offers email and password fields only — there is no signup link and no client-side role selector, so an unregistered email is rejected and an authenticated user can never reach the other role's routes.

![Figure 8.1: Sign-in form — email and password only, no signup or role selector.](Screenshot/shared-login-page-signin-form.png)

## 8.2 Student Dashboard and Subject View

The student home opens with a study hero panel leading into chat, followed by quick stats (quizzes taken, weak topics, average score) and enrolled-subject cards showing each subject's teachers and the student's progress. The demo account in Figure 8.2 shows three enrolled subjects — including a multi-teacher subject — with per-subject progress bars. Opening a subject (via Resources) shows its materials grouped by teacher with a course/teacher filter, and only `ready` materials appear in this student-facing list; processing or failed items remain a teacher-side concern.

![Figure 8.2: Student dashboard — study hero, quick stats, and enrolled subjects with teachers and progress.](Screenshot/Student/student-home-dashboard-enrolled-subjects-progress.png)

![Figure 8.3: Subject resources — approved materials grouped by teacher with filter; only ready items are visible to students.](Screenshot/Student/student-resources-approved-materials-course-teacher-filter.png)

## 8.3 RAG Chat with Material Scope and Citations

The chat view pairs the conversation with a visible study-materials panel: the student ticks which ready materials should ground the session (grouped under the owning teacher's name), with the active count always shown. Answers render with numbered citation markers; hovering a marker reveals the teacher and filename, and a citation footer under each answer names the source explicitly. Figure 8.4 demonstrates both halves of the attribution guarantee: the in-corpus question ("What is NLP") receives a grounded answer citing the teacher's file, while the off-corpus question ("who is Donald trump") is refused with "The provided context is insufficient…" instead of hallucinated — the system answers only from approved material.

![Figure 8.4: RAG chat — per-session material scope, numbered citations with teacher/file tooltip, and grounded refusal of an off-corpus question.](Screenshot/Student/student-chat-rag-nlp-cited-answer-teacher-attribution.png)

## 8.4 Quiz Taking and Feedback

The quiz list shows published quizzes with completion state and scores; taking a quiz runs question by question under its configured flow. On submission the server grades the attempt and returns a grade card (Figure 8.7 shows a D at 50%, 3 of 6 correct) with an "Areas to Review" breakdown by topic tag (SDLC 67%, Requirements 33%), followed by a full question review marking each response correct or wrong with the correct choice shown. Re-submitting an attempt is idempotent — the score is not duplicated.

![Figure 8.5: Published quiz list with completed scores.](Screenshot/Student/student-quizzes-available-list-completed-scores.png)

![Figure 8.6: Quiz taking — one question at a time with selected option.](Screenshot/Student/student-quiz-taking-se-fundamentals-q1-design-phase.png)

![Figure 8.7: Result card — grade, score, and per-topic areas to review.](Screenshot/Student/student-quiz-result-se-fundamentals-score-50pct-areas-to-review.png)

![Figure 8.8: Question review — per-question correct/wrong marking against the correct choice.](Screenshot/Student/student-quiz-result-question-review-q1-q3-correct-vs-wrong.png)

## 8.5 Flashcard Generation and Study

From any selected material set the student generates a named deck; the deck list tracks per-deck mastery progress. Cards are studied in a flip view (question front, answer back) and marked still-learning or mastered, moving the card between `new`, `learning`, and `mastered` states. Decks are personal to the student and record the source material identifiers used at generation, so a deck can always be traced back to what it was built from.

![Figure 8.9: Flashcard deck list with mastery progress.](Screenshot/Student/student-flashcards-deck-list-mastery-progress.png)

![Figure 8.10: Flip-study view — question front with answer reveal and mastery controls.](Screenshot/Student/student-flashcard-study-question-array-complexity.png)

## 8.6 Teacher Material Management

The teacher materials view lists every file in the subject with owner, type, and live ingestion status. Uploads accept PDF, PPTX, and DOCX within the size limit and enter `processing`; successful ingestion flips them to `ready`, failures to `failed` with retry exposed, and deletion removes both the record and its vectors. Co-teachers of a subject see shared materials without gaining edit rights over another teacher's files.

![Figure 8.11: Teacher materials — upload, owner/type columns, live status, retry and delete actions.](Screenshot/Teacher/teacher-resources-materials-upload-manage-ready-status.png)

## 8.7 Teacher Quiz Authoring and Publishing

The quiz list states the fairness rule directly: "All students in a subject take the same published quiz." Each card carries a Draft/Published badge and a Manual/AI source tag, with Edit, Publish, and delete actions — drafts expose a Publish button while published quizzes do not. Teachers author manually question by question, or request an AI-assisted draft generated from ready material; both paths produce the same question shape, and AI drafts remain drafts until reviewed and published.

![Figure 8.12: Teacher quiz list — draft/published badges, manual/AI source tags, publish flow.](Screenshot/Teacher/teacher-quizzes-list-draft-published-manual-ai.png)

## 8.8 Teacher Analytics and Student Progress

The analytics design deliberately separates per-quiz analysis from cross-quiz student progress. The per-quiz view (Figure 8.13, captured on a 17-student class with 16/17 completion and a 79% average) shows a question-accuracy heatmap with a Good/OK/Weak/Poor key, an A–F grade distribution, and the derived weak topic ("Indexing" at 69% class accuracy) — answering "how did this quiz go?". The student progress roster (Figure 8.14) lists every student with average score, completion bar, last-active date, and an At Risk / On Track badge, with a "7 at-risk" summary counter, name search, and subject filter on top and a drill-down chevron per row — answering "how is this student doing?". The teacher dashboard adds an at-a-glance overview of active students and grade distribution. Keeping these read models separate avoids forcing two different questions into one overloaded query.

![Figure 8.13: Per-quiz analytics — class stats, accuracy heatmap, grade distribution, weak topics.](Screenshot/Teacher/teacher-analytics-per-quiz-heatmap-grade-weak-topics.png)

![Figure 8.14: Student progress roster — averages, completion, at-risk flags with drill-down.](Screenshot/Teacher/teacher-student-progress-roster-avg-score-at-risk.png)

![Figure 8.15: Teacher dashboard overview — active students and grade distribution at a glance.](Screenshot/Teacher/teacher-dashboard-overview-active-students-grade-distribution.png)

## 8.9 Security and Reliability Results

Access tokens are kept in memory with a HttpOnly refresh cookie; the API client performs one silent refresh-and-replay after a 401 before redirecting to login. CORS uses an allow-list and storage paths are never serialized to clients. Authorization checks are repeated in services rather than relying on route declarations alone. The ingestion pipeline uses per-material locks, row-level guards, and version-safe updates, with blocking parser and embedding calls moved off the event loop. Structured generation uses Pydantic schemas as the output contract, retrying with the error, the bad response, and the schema on failure. These patterns improve reliability without pretending external AI services are deterministic.

## 8.10 Overall System Performance

The backend suite (82 tests) runs fully offline in under a second; the frontend suite (63 tests) runs under Vitest with route, store, and component coverage. Frontend performance work includes route-level code splitting, navigation prefetching, bounded safe-GET caching, concurrent request deduplication, debounced search, loading skeletons, and stale-response handling — targeting measured responsiveness while preserving correctness. The known performance caveat is dependence on hosted services (database, vector store, model API) at deployment time: latency and quota there are deployment properties, and online hosting remains planned future work (Chapter 9).
