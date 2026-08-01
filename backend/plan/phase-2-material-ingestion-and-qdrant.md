# Phase 2 — Teacher Material Ingestion and Qdrant Foundation

## Goal

Turn teacher uploads into searchable, attributable chunks while keeping source files in Supabase Storage and metadata in Postgres. This is the load-bearing phase for all later RAG and flashcard behavior.

## Already done

- Teacher ownership and subject scoping are fixed by architecture.
- The validated parser/chunker/embedding approach is documented: PDF 400-word windows with 50-word overlap; PPTX two-slide windows with one-slide overlap; DOCX parser; reading-order sorting by `(top, left)`; local `all-MiniLM-L6-v2`; `.tolist()` embeddings.
- The Qdrant design is fixed: one collection, metadata filters, batch upserts of 100, `query_points()`, full `https://` URL, API key, and 60-second timeout.
- The frontend teacher material screen already models upload status, but uses a timeout and mock rows.

## Not to be done in this phase

- Do not let students upload materials.
- Do not recreate or wipe the Qdrant collection per upload/run.
- Do not implement the full Gemini answer flow, quiz generation, or flashcard generation yet.
- Do not silently accept unsupported file types or mark a failed ingestion as ready.
- Do not expose raw storage paths or service credentials to the frontend.

## Work items

1. Create the ingestion package: parsers, common intermediate document format, chunker, embedder, pipeline, and explicit status transitions (`processing`, `ready`, `failed`).
2. Implement PDF, PPTX, and DOCX validation and extraction. Preserve page/slide/paragraph metadata where available for future citations and debugging.
3. Sort PPTX shapes by visual position and prepend titles to sparse/title-only slides before chunking.
4. Store the original file in a private Supabase Storage bucket. Persist only the controlled storage path and metadata in Postgres.
5. Create/validate the single Qdrant collection at application setup or an explicit provisioning command. Validate vector dimension against the embedding model before upserting.
6. Build each payload with `material_id`, `teacher_id`, `teacher_name`, `subject_id`, `filename`, `chunk_text`, and `chunk_index`. Add a deterministic point ID so retries are idempotent.
7. Upsert batches of 100 and record enough ingestion diagnostics to identify parser, embedding, storage, or Qdrant failures. Apply bounded retries only to transient external failures.
8. Add status polling/detail endpoints and signed download URL generation after ownership/membership authorization.
9. Replace the teacher upload timeout with multipart upload, subject selection, status polling, error display, and real material lists. Keep processing server-side.
10. Add cleanup/retry behavior for partial failures: a failed material must not leave an apparently ready row or untraceable orphaned vector.

## Core API surface

- `POST /materials` multipart: `file`, `subject_id`
- `GET /materials/{material_id}/status`
- `GET /materials/{material_id}/download`
- `DELETE /materials/{material_id}` only for the owner, with a defined storage/vector cleanup policy
- `POST /materials/{material_id}/retry` only for an authorized teacher and failed material

## Verification

- Upload one PDF, PPTX, and DOCX fixture and verify ready/failed transitions.
- Verify PPTX reading order and sparse slide title retention.
- Verify chunk overlap and deterministic reprocessing behavior.
- Query Qdrant with a material filter and confirm no chunk from another material can be returned.
- Inspect a returned payload and confirm teacher and filename attribution are present without a Postgres round-trip.
- Test unauthorized download, cross-teacher deletion, unsupported files, oversized files, and partial external-service failure.
- Run a basic integration test against disposable Supabase/Qdrant test resources or a local fake with contract-compatible behavior.

## Exit criteria

A teacher can upload approved material to a subject, see processing status, download the source securely, and obtain ready Qdrant chunks whose metadata can identify the source teacher and material. This phase is the minimum prerequisite for useful chat, AI quiz generation, and flashcards.
