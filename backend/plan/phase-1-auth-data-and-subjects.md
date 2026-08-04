# Phase 1 — Authentication, Data Model, and Subject Access

## Goal

Implement the relational foundation and role-aware access rules that every feature relies on: seeded email/password login through Supabase Auth, user profiles with `student` or `teacher` role, many-teacher subjects, teacher-owned materials metadata, and student subject visibility.

## Already done

- The two supported roles and email/password login are defined. The authenticated user's role is server-derived; the client does not select it.
- The intended entities and relationships are documented: users, subjects, subject teachers, materials, quizzes, attempts, flashcard decks/cards.
- The frontend has an `authStore`, subject store, login screen, dashboards, subject overview, and materials screens, but they currently use placeholder data.

## Not to be done in this phase

- Do not upload or parse files yet; Phase 2 owns ingestion.
- Do not persist `student_material_selection`; it remains request-time input.
- Do not create an admin role, student-owned material flow, messaging, or student-generated quizzes.
- Do not expose another teacher's private material for editing. Shared-subject visibility is read-visible; ownership remains with the uploading teacher.

## Work items

1. Create SQLAlchemy models and migrations for `users`, `subjects`, `subject_teachers`, `materials`, and the quiz/flashcard tables needed for foreign-key planning. Implement only the feature fields required by the current scope.
2. Decide whether Supabase Auth user IDs are the canonical `users.id`; use that identity consistently rather than creating a second unrelated login identity.
3. Implement the seed-only profile flow: the explicit seed command creates the Supabase Auth account and matching `users` profile with name and role. Validate role against `student|teacher`; there is no signup endpoint or runtime user-creation path.
4. Implement `get_current_user` and `require_role("teacher")` dependencies. Check subject membership and material ownership in services, not just in route handlers.
5. Implement subject endpoints: list accessible subjects, subject overview, teacher roster, and subject membership checks. Support multiple teachers per subject.
6. Implement the metadata portion of materials: create/list/detail, teacher ownership, subject association, filename/type/storage path, and processing timestamps.  The `PATCH /materials/{material_id}` handler must accept **only teacher-editable metadata** (e.g. display name, notes).  Status (`processing`, `ready`, `failed`) is **server-owned**: transitions are enforced exclusively by the ingestion service.  The PATCH handler must reject or silently ignore any client-supplied `status` field.  The ingestion service must not allow a `failed` material to transition directly to `ready`; valid transitions are `processing → ready` and `processing → failed` only.
7. Add pagination, stable sorting, filtering by subject/teacher/status, and safe search for materials. Keep response fields aligned with the frontend register.
8. Add seed data tooling for password-authenticated teachers/students, a multi-teacher subject, and empty material records. The seed command must be explicit, idempotent where practical, and never run automatically at application startup or in production.
9. Connect the first frontend slice: email/password login response → `authStore`, server-derived role-based redirects, subject list, subject overview, and real materials metadata lists. Remove signup, forgot-password, and client role-selection flows. Keep visual behavior from Stitch intact.

## Minimum API surface

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/subjects`, `GET /api/subjects/{subject_id}`
- `GET /api/subjects/{subject_id}/materials`
- `GET /api/materials`, `GET /api/materials/{material_id}`
- `PATCH /api/materials/{material_id}` for allowed metadata changes only (no client-driven status changes)
- `GET /api/students/me/subjects`, `GET /api/students/me/stats` as a thin read model or a clearly documented equivalent

## Verification

- A student cannot call teacher-only routes or read an unrelated subject.
- A teacher can see own materials and read-visible co-teacher materials for a shared subject, but cannot edit or delete another teacher's material.
- A subject can have multiple teachers without duplicate memberships.
- Login and refresh/reload preserve the server-derived authenticated role safely; logout removes client auth state and returns the user to the login screen.
- No runtime endpoint or client flow can create users or change their roles.
- All ownership and subject access tests run against a disposable database.
- Frontend mocks for auth, subjects, and the subject overview can be removed without changing the screen layout.

## Exit criteria

The seed command can provision the two roles, authenticate them with email/password, show a shared subject with multiple teachers, and enforce ownership/membership in tests. A teacher can select a subject for an upload record, even though actual file processing is deferred to Phase 2.
