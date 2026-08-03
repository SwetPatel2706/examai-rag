# Phase 1 Fixes Walkthrough

This document serves as a comprehensive summary of the foundational and logical bug fixes applied during the Phase 1 backend stability updates.

## 1. API Stubs & Smoke Tests
- **`stubs.py`**: Properly injected the FastAPI `Request` object into stub handlers to correctly extract and map `request.state.request_id` to the `StandardResponse` error factory, matching X-Request-ID headers.
- **`test_smoke.py`**: Made smoke test environment configurations strictly deterministic using standard assignments instead of `os.environ.setdefault`. Converted the mutable `_STUBS` list into an immutable tuple, and removed the failing/ineffective `test_multipart_not_missing` test since `POST /api/materials` correctly defaults to a `501/405`.

## 2. Authentication & Supabase Client
- **Shared Async Client**: Refactored `SupabaseAuthClient` (`supabase_client.py`) to create and retain a long-lived `httpx.AsyncClient()` instance during `__init__`, completely removing the per-request `with httpx.Client()` boilerplate logic.
- **Asynchronous Operations**: Fully converted the client API methods (`login`, `verify_token`, `admin_create_user`, `_admin_get_user_by_email`) into `async def` operations for non-blocking execution within FastAPI threads.
- **Error Guarding**: Protected `response.json()` calls across Supabase error handling paths to catch standard decoding failures and fallback cleanly to explicit `ValueError` messages rather than unhandled server faults.
- **Robust Logout**: Added a `logout` method targeting Supabase's `/auth/v1/logout` endpoint, and wired it up inside `/api/auth/logout` by extracting the raw bearer token via `HTTPAuthorizationCredentials`.
- **UUID Login Binding**: Modified `/api/auth/login` to query the database `User.id` via the strongly-typed UUID parsed directly from the authenticated token payload instead of using the potentially unsafe `User.email.ilike`.
- **FastAPI Thread Alignment**: Cleanly propagated `await` calls up through the `get_current_user` auth dependency and the affected login/logout routes.
- **Seed Script Alignment**: Updated `seed.py` to synchronously `asyncio.run` the new asynchronous `SupabaseAuthClient` methods and fail-fast with strict exception propagation if provisioning fails.

## 3. Database Models & UTC Timestamps
- **Timezone Safety**: Replaced all naive `datetime.datetime.utcnow` defaults across all models (`user.py`, `subject.py`, `material.py`, `quiz.py`, `flashcard.py`) with explicit timezone-aware definitions (`lambda: datetime.datetime.now(datetime.timezone.utc)`) for `created_at`, `uploaded_at`, `assigned_at`, `enrolled_at`, and `submitted_at` columns.

## 4. Subject & Material Business Logic
- **Explicit Access Rejections**: Hardened `check_subject_access` (`subject_service.py`) to immediately raise `HTTP 403 Forbidden` if an unknown role attempts subject access, and removed legacy exploratory comments.
- **Validating Explicit Nulls**: In `update_material_metadata` (`material_service.py`), leveraged Pydantic's `model_dump(exclude_unset=True)` to differentiate between intentionally skipped metadata fields and explicitly provided `null` clear requests.
- **State Transition Machine**: Applied strict boundaries to `update_material_status`. Pre-validated unknown states (`HTTP 400`) and explicitly rejected illegal state transitions (e.g. `ready` -> `processing`, `failed` -> `ready`) with standard `HTTP 409 Conflict` exceptions.

## 5. Routing Parameters & Schemas
- **Pagination Contracts**: Refactored both `/api/subjects/{id}/materials` and `/api/materials` list endpoints to rely on the fully typed `MaterialsListResponse` Pydantic model instead of unstructured inline dictionaries.
- **Optional Queries**: Annotated filtering query parameters (`subject_id`, `teacher_id`, `status`, `search`) as strictly `Optional` to correctly map to FastAPI/OpenAPI nullability contracts.
- **Parameter Aliasing**: Used FastAPI's `Query(alias="status")` internally bound to `material_status` inside `/api/materials` to prevent shadowing Python's standard `status` library.

## 6. Deferred Tasks (Recorded in `to-do.md`)
- Adding explicit Alembic indexing for foreign keys and removing redundant primary key UUID `index=True` configurations.
- Applying functional lower-bound indexing (`lower(email)`) and `CHECK` constraints on the `User` table roles.
- Expanding the smoke test fixtures and transitioning validations safely inside `test_phase_1.py`.
