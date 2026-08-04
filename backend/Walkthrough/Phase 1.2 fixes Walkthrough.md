# Phase 1.2 Fixes Walkthrough

This walkthrough outlines the fixes applied to the backend for the Phase 1.2 refactoring tasks.

## Changes Made

### Configuration
- **`backend/app/config.py`**: Updated `reject_blank_or_placeholder` and the `SUPABASE_URL` validation path. We now require `https://` for non-loopback hosts, while permitting HTTP only for loopback addresses during local development.

### Application Routing & Errors
- **`backend/app/main.py`**: Added dedicated exception handlers for `starlette.exceptions.HTTPException` and `RequestValidationError`. Both now use the `StandardResponse` envelope, preserving status codes, headers, and request IDs properly.
- **`backend/app/routes/auth.py`**: Updated the logout route to safely handle remote non-2xx responses and transport exceptions without leaking bearer tokens in the server logs. Failed remote operations return a 502/503 response.

### Models & Database
- **`backend/app/models/user.py`**: Replaced the PostgreSQL-specific UUID type in the `User` model’s `id` column with SQLAlchemy 2.0’s dialect-agnostic `sqlalchemy.Uuid` type. This ensures compatibility with SQLite during testing while preserving UUID and primary-key behaviors.

### Data Seeding
- **`backend/app/seed.py`**: Converted `seed_data()` to be asynchronous and removed per-call `asyncio.run` usage. The outer exception handler now rolls back the active transaction and re-raises the original exception for better error signaling and safety. Additionally, the Supabase `httpx.AsyncClient` is now properly closed in the async `finally` block to prevent resource leakage across event loops.

### Services
- **`backend/app/services/material_service.py`**: Updated `update_material_status` to raise a standard `ValueError` for invalid statuses and forbidden transitions, and introduced a dedicated `MaterialNotFoundError` for missing materials, separating business logic exceptions from HTTP exceptions.
- **`backend/tests/test_phase_1.py`**: Updated the tests to retain `pytest.raises(ValueError)` assertions and verify that `processed_at` is set for the `processing -> ready` transition.

### Dependencies
- **`backend/requirements.txt`**: Pinned the `python-multipart` requirement to `>=0.0.31` to patch known security vulnerabilities.

### Plan Documentation
- **API Paths (`backend/plan/phase-1-auth-data-and-subjects.md`, `backend/plan/phase-3-rag-chat-and-flashcards.md`)**: Updated the documented API contracts to consistently use the mounted `/api` prefix (e.g., `/api/auth`, `/api/subjects`, `/api/materials`, `/api/chat`).
- **Atomic Deletion Rules (`backend/plan/phase-2-material-ingestion-and-qdrant.md`)**: Documented the need for atomic deletion and ingestion version validation across the material lifecycle, using compare-and-set guards to prevent orphaned vectors or race conditions.
- **Security Check (`backend/plan/phase-3-rag-chat-and-flashcards.md`)**: Stipulated that authorization checks for subject membership must occur *before* retrieval and flashcard generation, relying on the central Phase 1 subject-access service rather than client-controlled material IDs.

## Validation
All findings have been reviewed against the current codebase, and minimal necessary changes were implemented to address each one without disrupting adjacent logic.
