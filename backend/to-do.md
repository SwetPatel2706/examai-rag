# Backend to-do / known follow-ups

## Open — deferred structural work (not minimal fixes)

- **Alembic / SQLAlchemy Indexing**: Add indexes to `subject_id`, `teacher_id`
  in `Material`, `subject_id`/`teacher_id` in `Quiz`,
  `student_id`/`subject_id` in `Flashcard`, etc. Generate forward/downgrade
  migrations. Verified against `migrations/versions/` — no FK index exists yet.
- **Alembic / SQLAlchemy PK Indexes**: Remove `index=True` from UUID primary-key
  `id` columns across `User`, `Subject`, `Material`, `Flashcard`, `Quiz` to
  prevent redundant indexing. `index=True` remains on every PK `id` in
  `app/models/`.
- **User Model Unique Index and Constraints**: Supplement `User.email` with a
  functional unique index on `lower(email)` in Postgres, and enforce role values
  with a `CHECK` constraint.
- **requirements.txt pinned constraints / pip-audit CI**: requires a full
  dependency audit + pinning exercise plus a CI workflow; no `.github/` exists
  yet. Documented as a note; not a minimal code fix.
- **Server-side `time_limit` enforcement**: requires a `started_at` model field,
  a new migration, and a "start quiz" endpoint. Structural addition — belongs in
  its own task.

## Done / resolved in the Level 2 cleanup (kept for history)

- ~~`update_material_status` / `MaterialNotFoundError` (tests-only dead code)~~
  — removed in Cleanup Level 2; the `test_material_status_transitions`
  extension was moot and removed with it.
- ~~`app.dependency_overrides` → module-scoped fixture move~~ — completed in
  Level 2 (`module_db_override` / shared helpers in `tests/conftest.py`).
