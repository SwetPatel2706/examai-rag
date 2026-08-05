# Phase 3.0 Walkthrough — Scoped RAG Chat and Student Flashcards

## Goal and outcome

Phase 3 delivers the first student value loop: an enrolled student can ask a
question against a request-time selection of approved, ready materials and
receive an answer with teacher/material/page attribution. The same selection
can generate a private flashcard deck that the student can list, study, and
update mastery for.

## Important decisions

- Subject membership and material authorization happen in the service layer
  before Qdrant is queried. Every requested material must belong to the subject
  and have `status == "ready"`.
- Retrieval uses the existing single Qdrant collection with both subject and
  material filters. Context is numbered and bounded before it is sent to Gemini.
- Gemini responses use Pydantic schemas (`ChatLLMOutput` and
  `FlashcardLLMOutput`). Invalid JSON/schema responses get one error-aware retry
  containing the validation error and full bad response; raw model output is
  never logged.
- Citations are resolved only from retrieved payloads that contain teacher name,
  filename, material ID, and source locator. Missing metadata is omitted rather
  than fabricated.
- Flashcard decks and cards are always filtered by the authenticated student ID.
  Material selection remains request-time data and is copied into each deck's
  `source_material_ids` for provenance.

## Main files

- `app/services/rag/retriever.py` — authorization, embedding, filtered Qdrant
  retrieval, and bounded context building.
- `app/services/rag/chat_service.py` and `app/services/rag/citation.py` —
  structured Gemini prompting and citation mapping.
- `app/services/flashcards/generate_service.py` — generation, persistence, and
  ownership checks.
- `app/routes/chat.py` and `app/routes/flashcards.py` — thin API routes for the
  Phase 3 contract.
- `app/schemas/chat.py` and `app/schemas/flashcard.py` — request, response, and
  structured-output contracts.
- `app/utils/gemini_client.py` — Gemini JSON adapter with safe validation errors.

## API surface

- `POST /api/chat`
- `POST /api/flashcard-decks`
- `GET /api/flashcard-decks`
- `GET /api/flashcard-decks/{deck_id}`
- `GET /api/flashcard-decks/{deck_id}/cards`
- `PATCH /api/flashcards/{flashcard_id}`

## Checks run

- Existing Phase 1 and Phase 2 tests: **10 passed**.
- Python bytecode compilation for `backend/app`: passed.
- A service-level smoke check with SQLite, fake embedder/Qdrant/LLM verified
  subject authorization and citation resolution: passed.

## Pitfalls and follow-up

The real demo still requires valid Gemini and Qdrant credentials, a provisioned
collection, and ready ingested materials. Hybrid sparse+dense retrieval and
background generation status remain future hardening work. Frontend API wiring
is intentionally not included in this backend-only task.
