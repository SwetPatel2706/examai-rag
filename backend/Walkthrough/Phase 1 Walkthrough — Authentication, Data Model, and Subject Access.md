# Phase 1 Walkthrough — Authentication, Data Model, and Subject Access

## Summary

Phase 1 is complete. All 31 tests pass. The full authentication, relational data model, authorization middleware, and API endpoints are now live.

---

## What Was Built

### 1. Database Layer (`app/db/`, `app/models/`, `migrations/`)

| File | Purpose |
|---|---|
| [session.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/db/session.py) | SQLAlchemy engine + `SessionLocal` + `get_db` dependency |
| [base.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/db/base.py) | Imports all models so `Base.metadata` knows every table |
| [user.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/models/user.py) | `users` table — id (= Supabase UID), email, role, name |
| [subject.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/models/subject.py) | `subjects`, `subject_teachers` (many-to-many + unique), `student_subjects` (enrollment) |
| [material.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/models/material.py) | `materials` — teacher-owned, subject-scoped, editable metadata |
| [quiz.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/models/quiz.py) | `quizzes`, `quiz_questions`, `quiz_attempts` (stub for FK planning) |
| [flashcard.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/models/flashcard.py) | `flashcard_decks`, `flashcards` (stub for FK planning) |

**Migration**: `migrations/versions/5345d834c216_initial_schema.py` — generated via `alembic revision --autogenerate` and applied to the live Supabase database with `alembic upgrade head`.

---

### 2. Authentication (`app/auth/`)

| File | Purpose |
|---|---|
| [supabase_client.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/auth/supabase_client.py) | Wraps Supabase Auth REST API — login, verify JWT, admin user creation |
| [dependencies.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/auth/dependencies.py) | `get_current_user` (JWT → DB profile lookup), `RoleChecker`, `require_teacher`, `require_student`, `require_any_role` |

**Flow**: `Authorization: Bearer <token>` → Supabase `/auth/v1/user` → DB `users` profile → route handler

---

### 3. Schemas (`app/schemas/`)

| File | Key schemas |
|---|---|
| [auth.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/schemas/auth.py) | `LoginRequest`, `UserProfileResponse`, `LoginResponse` |
| [subject.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/schemas/subject.py) | `SubjectResponse`, `SubjectDetailResponse`, `TeacherRosterResponse` |
| [material.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/schemas/material.py) | `MaterialResponse`, `MaterialUpdateRequest` (no `status` field — intentional), `MaterialsListResponse` |

---

### 4. Services (`app/services/`)

| File | Key logic |
|---|---|
| [subject_service.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/subject_service.py) | `get_user_subjects`, `check_subject_access` (403 for unauthorized, not 404), `get_subject_teachers` |
| [material_service.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/material_service.py) | `get_materials` (filter/search/paginate), `update_material_metadata` (owner-only), `update_material_status` (enforces valid state machine) |

**State machine enforced**: `processing → ready`, `processing → failed`. `failed → ready` is rejected.

---

### 5. Routes (`app/routes/`)

| Route | Endpoints |
|---|---|
| [auth.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/routes/auth.py) | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| [subjects.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/routes/subjects.py) | `GET /api/subjects`, `GET /api/subjects/{id}`, `GET /api/subjects/{id}/materials` |
| [materials.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/routes/materials.py) | `GET /api/materials`, `GET /api/materials/{id}`, `PATCH /api/materials/{id}` |

---

### 6. Seed Command ([seed.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/seed.py))

Run with:
```bash
./venv/bin/python -m app.seed
```

Provisions (idempotent):
- `teacher1@examai.com` / `teacher2@examai.com` — role `teacher`
- `student1@examai.com` / `student2@examai.com` — role `student`
- 2 subjects: **Software Engineering** (2 teachers) and **Advanced Database Systems** (1 teacher)
- Student enrollments and 3 sample material metadata records

---

## Tests

```
31 passed, 14 warnings
```

### New tests ([test_phase_1.py](file:///Users/swet/Developer/Project/examai-rag/backend/tests/test_phase_1.py))

| Test | What it verifies |
|---|---|
| `test_subject_access_control` | Enrolled student sees subject; unauthorized student gets 403 on detail; teacher sees own subject |
| `test_materials_query_and_metadata_editing` | Co-teacher can view material but gets 403 on PATCH; owner can edit display name and notes |
| `test_material_status_transitions` | `processing → ready` works; `failed → ready` raises `ValueError` |

---

## Phase 1 Exit Criteria — Met ✅

- [x] Seed provisions teacher + student roles, authenticates them, shows shared multi-teacher subject
- [x] Ownership and membership enforced in services (not just routes)
- [x] Student gets 403 (not 404) for unenrolled subjects
- [x] `PATCH /materials/{id}` rejects client-supplied `status` field
- [x] `failed → ready` transition is rejected by service
- [x] No runtime endpoint or client flow can create users or change their role
