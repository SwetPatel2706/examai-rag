- **Alembic / SQLAlchemy Indexing**: Add indexes to `subject_id`, `teacher_id` in `Material` model, `subject_id`/`teacher_id` in `Quiz`, `student_id`/`subject_id` in `Flashcard`, etc. Generate the Alembic migration to create these indexes and downgrade them (Tasks 7, 10, 11).
- **Alembic / SQLAlchemy PK Indexes**: Remove `index=True` from UUID primary key column `id` across `User`, `Subject`, `Material`, `Flashcard`, `Quiz` models to prevent redundant indexing, and update migrations (Tasks 27-32).
- **User Model Unique Index and Constraints**: Supplement `User.email` with a functional unique index on `lower(email)` in PostgreSQL, and enforce role values with a `CHECK` constraint (Task 30).
- **Test Suite Updates**: Extend `test_material_status_transitions` in `test_phase_1.py` to cover remaining status paths, validation errors, and `processed_at` population (Task 22). Move `app.dependency_overrides` mutations to a proper fixture in `test_phase_1.py` to isolate state from other test modules (Task 23).

backend/requirements.txt: Pinned constraints file / pip-audit CI workflow
Deferred. This requires a full dependency audit and pinning exercise plus CI workflow creation — not a minimal code fix. No .github/ or CI files exist to update yet. Will document as a note.

