# Phase 2.0 Walkthrough — Material Ingestion and Qdrant Foundation

## Goal and outcome

Phase 2 adds the backend foundation for teacher-owned material uploads: private source storage, PDF/PPTX/DOCX extraction, source-aware chunking, local embeddings, deterministic Qdrant indexing, status transitions, secure downloads, retries, and deletion cleanup.

The main exit contract is now represented by the material API and ingestion pipeline: a teacher uploads a supported file for an authorized subject, the source is stored privately, chunks become attributable Qdrant points, and each point carries teacher/material/source-location metadata.

## Important implementation decisions

- Materials use one Qdrant collection. Collection creation/validation checks the embedding vector dimension; `app/provision_qdrant.py` is the explicit provisioning command.
- Point IDs are `uuid5(NAMESPACE_URL, f"{material_id}:{chunk_index}")`, so retries replace content instead of duplicating it. Tail points are deleted when a reprocess produces fewer chunks.
- `ingestion_version` and the `deleting` status implement the delete/retry contract. Per-material write locking plus guarded checks prevents stale workers from writing during races in a worker process.
- PDF chunks use 400 words with 50-word overlap. PPTX chunks use two slides with one-slide overlap and shapes are sorted by `(top, left)`. DOCX chunks retain paragraph locations.
- Storage paths remain server-side. Public material responses expose metadata and status but never the controlled storage path; downloads return short-lived signed URLs after authorization.
- Failed processing transitions to `failed` and performs best-effort source cleanup. Deletion marks the row `deleting` before storage and vector cleanup, and never resurrects a failed cleanup.

## Files and modules

- `app/services/ingestion/parsers/` — PDF, PPTX, and DOCX intermediate-document parsers.
- `app/services/ingestion/chunker.py` — common chunking rules and stable `source_locator` metadata.
- `app/services/ingestion/embedder.py` — lazy local `all-MiniLM-L6-v2` embedding adapter.
- `app/services/ingestion/pipeline.py` — guarded status transitions, payload construction, retries, and Qdrant writes.
- `app/utils/qdrant_client.py` — collection validation, 100-point batch upserts, deterministic IDs, deletion, and metadata-filtered query support.
- `app/utils/storage.py` — private Supabase Storage upload/download/delete/signed URL adapter.
- `app/services/material_ingestion_service.py` and `app/routes/materials.py` — authorization, upload limits, status, retry, download, and owner-only deletion behavior.
- `app/models/material.py`, `app/schemas/material.py`, and the initial migration — `ingestion_version`, `deleting`, and the public response contract.
- `tests/test_phase_2.py` — chunk overlap, source locators, deterministic IDs, payload attribution, parser registry, and stale-worker checks.

## Verification performed

- `PYTHONPATH=. ../backend/venv/bin/pytest -q` → **37 passed**, one existing Starlette deprecation warning, including generated PDF/PPTX/DOCX fixture extraction.
- `python -m compileall -q backend/app backend/tests` → passed.
- `alembic heads` → revision `5345d834c216`.
- Contract assertions confirmed `storage_path` is absent from `MaterialResponse` and the UUID5 point ID is deterministic.

The parser dependencies are declared in `backend/requirements.txt` and were installed in the verification environment. Parser imports still provide explicit dependency errors when an incomplete deployment omits one of them.

## Lessons and follow-up

- Do not expose Supabase paths or service keys to the frontend; only signed URLs belong in the API response.
- Authorization must happen before building any future Qdrant filter. Phase 3 should reuse `QdrantStore.query` only after validating every selected material against subject membership and `ready` status in Postgres.
- Cross-process workers still need the same database compare-and-set/version guard around writes; the in-process lock covers the local worker race tested here.
- Phase 3 can now consume `source_locator`, teacher name, filename, and material ID directly from Qdrant payloads for citations.
