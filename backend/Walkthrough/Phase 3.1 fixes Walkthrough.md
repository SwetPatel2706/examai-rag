# Phase 3.1 Fixes Walkthrough — Validation and Error Handling Enhancements

## Task Goal
The objective was to improve validation and error handling for RAG chat and flashcard generation, ensuring that edge cases around incorrect model outputs, missing citations, and request timeouts are handled gracefully before they reach the persistence layer or the user.

## Important Decisions & Implementation

- **Chat Schema Validation:** Updated `chat.py` to validate that the stripped question contains at least 3 characters. 
- **Flashcard Validation & Retries:** In `generate_service.py`, we introduced manual validation to ensure the LLM returned the exact number of cards requested. If it doesn't, we raise a `StructuredOutputError` (supplying the mismatched JSON) so it's seamlessly caught by the retry logic.
- **Improved Source Marker Validation:** In `chat_service.py`, we manually check if the LLM output contains any hallucinated source markers not present in the retrieved chunks. If invalid markers exist, the application rejects the result by raising a `StructuredOutputError`, triggering a retry.
- **Accurate Context Assembly:** The character count tracking in `retriever.py`'s `build_context` was updated. It now explicitly accounts for the length of `"\n\n"` separators between chunks to strictly enforce the `RAG_MAX_CONTEXT_CHARS` boundary.
- **Gemini Timeout Configuration:** Added `GEMINI_TIMEOUT_MS` to `config.py` (default 30s) and applied it via `types.HttpOptions` in `gemini_client.py`. Updated `google-genai` to `>=0.3.0` in `requirements.txt` to support the new `http_options`.
- **Smoke Tests:** Updated `test_smoke.py` to remove `("/api/chat")` from the unimplemented stubs list, fixing the `pytest` failure caused by the endpoint now properly functioning.

## Files Changed

- [backend/app/schemas/chat.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/schemas/chat.py)
- [backend/app/services/flashcards/generate_service.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/flashcards/generate_service.py)
- [backend/app/services/rag/chat_service.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/rag/chat_service.py)
- [backend/app/services/rag/retriever.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/services/rag/retriever.py)
- [backend/app/utils/gemini_client.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/utils/gemini_client.py)
- [backend/app/config.py](file:///Users/swet/Developer/Project/examai-rag/backend/app/config.py)
- [backend/requirements.txt](file:///Users/swet/Developer/Project/examai-rag/backend/requirements.txt)
- [backend/tests/test_smoke.py](file:///Users/swet/Developer/Project/examai-rag/backend/tests/test_smoke.py)

## Tests Run
- `pytest` was run successfully. All 33 tests pass.
