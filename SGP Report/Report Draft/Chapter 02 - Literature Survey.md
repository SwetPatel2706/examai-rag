# Chapter 2 — Literature Survey

- INTRODUCTION OF SURVEY
- WHY SURVEY?
- EXISTING SYSTEM VS PROPOSED SYSTEM

## 2.1 Introduction of Survey

Before building ExamAI, widely used learning platforms and study tools were studied to understand what they already do well and where they fall short for examination preparation. The review focused on five popular, representative options that students and teachers actually use: Moodle (the most widely deployed open-source learning-management system), Google Classroom (the most widely used lightweight classroom platform), Quizlet (the most popular flashcard-based revision tool), general-purpose LLM chatbots such as ChatGPT (what students most commonly ask study questions today), and NotebookLM (Google's retrieval-grounded study assistant over user-supplied sources — the closest existing product to our approach).

The comparison was deliberately operational rather than theoretical: it asks what each system does about content ownership, answer traceability, assessment comparability, feedback, analytics, and access control — the six properties Section 1.5.5 identifies as necessary in an examination setting.

## 2.2 Why Survey?

A survey of existing platforms is useful because it shows what students and teachers can already do elsewhere, so a new project does not simply repeat what already exists. It also exposes real gaps that a new system can be built specifically to close, instead of guessing what users might need. For ExamAI, the survey served three concrete purposes. First, it confirmed that content management (Moodle, Classroom) and revision tools (Quizlet) exist but are disconnected from AI-grounded question answering. Second, it confirmed that students already use generic chatbots for study help — but those answers carry no source attribution, which is precisely the trust problem ExamAI addresses. Third, it positioned the closest alternative, NotebookLM, and showed where a classroom system must go further: teacher ownership, shared assessment, and class analytics, none of which a personal study assistant provides.

## 2.3 Existing System vs Proposed System

| Sr. No. | Aspect | Existing Systems | ExamAI (Proposed) |
|---|---|---|---|
| 1 | Source control | Moodle / Classroom store teacher files, but AI answers (ChatGPT) are disconnected from them; NotebookLM grounds answers only in the student's own uploads | Teacher-owned, subject-scoped, status-checked materials are the *only* retrieval corpus |
| 2 | Answer traceability | ChatGPT answers carry no source; Classroom/Moodle have no QA at all; NotebookLM cites the student's documents, not a teacher | Every answer carries numbered citations with teacher name, filename, and page/slide locator |
| 3 | Assessment fairness | Quizlet/Forms-style quizzes are typically per-link and incomparable across a class | One published quiz per topic for all students in the subject, enabling class-wide comparison |
| 4 | Feedback depth | Scores usually stop at a total; weak-topic analysis is absent | Server-side grading returns per-question feedback plus weak-topic detection per attempt |
| 5 | Teacher insight | Scattered gradebooks (Classroom), or nothing (chatbots, Quizlet) | Dedicated per-quiz analytics (heatmap, grade distribution) plus cross-quiz student progress with at-risk flags |
| 6 | Access control | Coarse roles; students can paste any content into a chatbot | Service-layer membership checks (enrollment for students, subject membership for teachers, global `require_admin` for administrators) plus per-request material validation; admin-provisioned accounts replace public signup |

Table 2.3: Existing systems vs ExamAI.

Three gaps appeared consistently across all five options studied:

- **Attribution gap.** The tools students actually ask questions of (generic chatbots) cannot say which teacher's file and which page an answer came from. The tools that organize teacher files (Moodle, Classroom) cannot answer questions at all.
- **Comparability gap.** Revision and quiz tools are built around individual practice links. Nothing guarantees that every student in a class answers the same questions, so teachers cannot compare performance fairly.
- **Oversight gap.** No surveyed option connects study help, assessment, and class-wide analytics through one authorization model. Teachers either get a gradebook without study context, or study tools without any teacher visibility.

ExamAI is built directly around closing these three gaps: teacher-owned retrieval with teacher-attributed citations, shared published quizzes, and analytics fed by the same attempts — all guarded by subject membership, with administrator-provisioned accounts and memberships replacing public signup.
