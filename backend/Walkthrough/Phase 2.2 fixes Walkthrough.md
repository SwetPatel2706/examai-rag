# Phase 2.2 fixes Walkthrough

**Goal:** Address code review findings from the Phase 2 implementation, focusing on stability, concurrency safety, correct API usage, and linting compliance.

**Key Changes & Decisions:**

- **Ruff E702 (Multiple statements on one line) Fixed:** 
  Split all semicolon-joined statements onto individual lines across `app/routes/materials.py`, `app/services/ingestion/pipeline.py`, `app/services/material_ingestion_service.py`, and `tests/test_phase_2.py`. This ensures full compliance with our linting standards without changing execution behavior.
- **Bounded File Reads:**
  In `create_material` ([materials.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/routes/materials.py)), updated the file read to `file.read(MAX_BYTES + 1)` and enforced the size limit *before* passing the data to the ingestion service. This prevents oversized files from fully materializing in memory, protecting the application from basic DOS vectors.
- **DB-Atomic Lifecycle Guards:**
  In `_guard` ([pipeline.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/ingestion/pipeline.py)), replaced simple reads with `SELECT ... FOR UPDATE` (which degrades gracefully on SQLite tests) to take row-level locks on Postgres.
  Updated final status writes (moving to `ready` or `failed`) to use conditional `UPDATE ... WHERE ingestion_version = ? AND status != 'deleting'`. This ensures stale workers cannot resurrect a material that has been deleted or retried by another process.
- **Striped Locks for Ingestion:**
  Replaced the unbounded per-UUID `threading.RLock` dictionary in the pipeline with an array of 64 striped locks. This bounds the memory footprint for lock objects regardless of how many unique materials are processed.
- **Supabase Delete API & Reusable Client:**
  Updated `StorageClient.delete` ([storage.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/utils/storage.py)) to use the correct `DELETE /storage/v1/object/{bucket}` endpoint with bucket-relative paths instead of the generic `/object/remove` POST route.
  Introduced a module-level shared `httpx.AsyncClient` that is reused by default, and registered a FastAPI shutdown hook in `main.py` to cleanly close its connection pool.

**Skipped Findings (Deferred):**
- **Background Queue:** Enqueueing ingestion tasks off the main event loop was skipped because the necessary task-queue infrastructure (e.g., Celery or ARQ) has not been set up yet. This is a larger architectural change slated for later phases.
- **Archive Bomb Validation:** Validating PPTX/DOCX internals for zip bombs was deferred to a dedicated security hardening pass, as it requires complex archive inspection logic.
- **Migration Split:** Splitting the `ingestion_version` column into a separate Alembic revision was skipped. Since we are pre-deployment and have no production database to protect, altering the single initial migration is safe and keeps history clean.
- **Deleting Transition Guard:** The suggestion to reject all status transitions when a material is `deleting` was already implemented at `material_service.py:141`.

**Validation:**
- Verified that no semicolons remain in Python code (excluding comments) using `grep`.
- Ran the Phase 2 test suite (`pytest tests/test_phase_2.py -v`), and all 7 tests passed successfully.
