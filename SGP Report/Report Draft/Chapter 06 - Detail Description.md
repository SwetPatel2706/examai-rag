# Chapter 6 — Detail Description

- STUDENT MODULE
- TEACHER MODULE
- ADMINISTRATOR MODULE

## 6.1 Student Module

The student module covers the enrolled-subject study workflow. A student views enrolled subjects, scopes a study session to ready teacher-approved materials, asks questions and receives answers with numbered teacher/file/page citations, attempts the published quiz shared by the whole subject, reviews per-question feedback with weak topics, and generates personal flashcard decks with mastery tracking (`new` / `learning` / `mastered`). Every subject-scoped request is authorized against student enrollment, and every material ID is validated before any vector query runs. Screens and behaviour are shown in Chapter 9; authorization and grading logic are tested in Chapter 7.

## 6.2 Teacher Module

The teacher module covers subject-owned material management, quiz authoring, and class analytics. A teacher uploads PDF, PPTX and DOCX materials, monitors `processing` / `ready` / `failed` status with retry and deletion, authors quizzes manually or with AI assistance converging on the same question shape, publishes one shared quiz per topic through a draft → review → publish flow, and reviews per-quiz analytics (accuracy heatmap, grade distribution, weak topics) plus cross-quiz student progress (averages, completion, at-risk flags, drill-down). There is no external company or client: materials are teacher-owned and subject-scoped, and co-teacher materials are visible but read-only. AI drafts always remain drafts until a teacher reviews and publishes them.

## 6.3 Administrator Module

The administrator module covers user, subject, and membership provisioning through the admin console. The seed operation creates the `admin@examai.com` administrator; at runtime, `require_admin` gates all `/api/admin/*` endpoints and the `/admin/*` frontend (Users, Subjects, Membership pages), routing an admin to `/admin/users` after login. User management handles teacher/student accounts only — creation provisions the Supabase Auth account first and then the local profile with the same UUID (a failed local commit rolls back and deletes the orphan auth account; duplicate email returns 409), the list/get never returns admin rows, role changes clear stale memberships, and admins cannot create other admins (422) or delete themselves (400). Subject management provides unfiltered subject list/create/rename/delete with member drill-downs, and membership endpoints idempotently assign/remove teachers and enroll/remove students with strict role checks. Administration manages the `subject_teachers` and `student_subjects` relations but never bypasses them: subject-scoped authorization for students and teachers is unchanged. Screens are shown in Chapter 9; API rows in Appendix 12.3; tests in Chapter 7.
