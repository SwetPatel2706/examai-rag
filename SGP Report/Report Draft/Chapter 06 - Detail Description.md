# Chapter 6 — Detail Description

- STUDENT MODULE
- TEACHER MODULE
- ADMINISTRATOR MODULE

## 6.1 Student Module

The student module covers the enrolled-subject study workflow. A student views enrolled subjects, scopes a study session to ready teacher-approved materials, asks questions and receives answers with numbered teacher/file/page citations, attempts the published quiz shared by the whole subject, reviews per-question feedback with weak topics, and generates personal flashcard decks with mastery tracking (`new` / `learning` / `mastered`). Every subject-scoped request is authorized against student enrollment, and every material ID is validated before any vector query runs. Screens and behaviour are shown in Chapter 9; authorization and grading logic are tested in Chapter 7.

## 6.2 Teacher Module

The teacher module covers subject-owned material management, quiz authoring, and class analytics. A teacher uploads PDF, PPTX and DOCX materials, monitors `processing` / `ready` / `failed` status with retry and deletion, authors quizzes manually or with AI assistance converging on the same question shape, publishes one shared quiz per topic through a draft → review → publish flow, and reviews per-quiz analytics (accuracy heatmap, grade distribution, weak topics) plus cross-quiz student progress (averages, completion, at-risk flags, drill-down). There is no external company or client: materials are teacher-owned and subject-scoped, and co-teacher materials are visible but read-only. AI drafts always remain drafts until a teacher reviews and publishes them.

## 6.3 Administrator Module

There is no administrator role in this delivery. Users are provisioned only through an explicit seed operation; runtime auth supports email/password login and logout, with the role derived from the seeded user profile. Operational administration (migrations via Alembic, demo-data seeding, Qdrant collection provisioning, deployment configuration) is performed directly by the project team through documented commands, not through an in-app admin interface. Institutional identity integration and administrator controls are explicit future scope.
