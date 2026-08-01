# ExamAI Backend Development Plan

This folder is the implementation sequence for ExamAI. It is intentionally backend-led, but each phase includes the frontend contract work needed to replace the existing mock data safely.

## Current baseline

- The root, backend, frontend, and frontend mock-register guidance has been reviewed.
- The frontend contains route-level screens, reusable UI components, Zustand stores, and Stitch-aligned styling.
- The frontend is still mock-driven; its replacement contracts are recorded in `frontend/Frontend Placeholder & Mock Data Register.md`.
- The backend currently contains only `backend/agents.md` and this plan folder. FastAPI application code, database models, migrations, routes, services, tests, and environment templates still need to be created.

## Phase order

| Phase | File | Outcome |
|---|---|---|
| 0 | `phase-0-foundation-and-contracts.md` | Reproducible backend skeleton, decisions, configuration, API/error conventions, and test harness |
| 1 | `phase-1-auth-data-and-subjects.md` | Supabase auth, role enforcement, relational schema, subjects, and material metadata ownership |
| 2 | `phase-2-material-ingestion-and-qdrant.md` | Teacher uploads, parsing/chunking/embedding, durable storage, and metadata-filtered Qdrant retrieval foundation |
| 3 | `phase-3-rag-chat-and-flashcards.md` | Scoped RAG chat with attributable citations and student-owned flashcard generation/study APIs |
| 4 | `phase-4-shared-quizzes.md` | Manual and AI-assisted teacher quiz authoring, publishing, attempts, grading, and student results |
| 5 | `phase-5-analytics-and-frontend-integration.md` | Teacher analytics/progress and systematic replacement of frontend placeholders with real API calls |
| 6 | `phase-6-hardening-deployment-and-demo-readiness.md` | End-to-end verification, security/performance hardening, deployment, backups, and demo-safe release |

The prerequisite checklist is in [`requirement.md`](requirement.md), ordered from implementation blockers to optional tools.

## Milestone strategy

Keep a stable conservative build ahead of each capstone deadline. The first usable vertical slice should be: login → subject/material visibility → teacher upload → ingestion status → student scoped chat with teacher/material citations. Quizzes and analytics follow as separate vertical slices so a failure in generative AI does not block the core platform demo.

The phase documents use the same structure: what is already present, what is explicitly excluded from that phase, implementation work, contracts, verification, and exit criteria.

## Cross-phase non-negotiables

- User accounts are seeded explicitly only. Runtime signup/user creation is disabled; the application supports email/password login, logout, and authenticated session lookup only.
- Roles are read from the authenticated user's seeded profile. The client does not choose a role and cannot change it.
- Materials are teacher-owned and subject-scoped. Students never upload RAG material.
- Every Qdrant point carries `material_id`, `teacher_id`, `teacher_name`, `subject_id`, `filename`, `chunk_text`, and `chunk_index`.
- Chat and flashcard generation receive fresh `material_ids` per request; selection is not persisted as a permanent student setting.
- Quizzes are shared teacher-authored quizzes in Phase 1–3. Student-generated quizzes are v2 and must not be implemented as a shortcut.
- Analytics and Student Progress remain separate services and screens.
- Routes stay thin; business logic belongs in `app/services/`; Pydantic schemas stay separate from SQLAlchemy models.
- No messaging/broadcast feature, admin role, PYQ frequency analysis, personalized planner, or dark-mode telemetry is part of this plan.
