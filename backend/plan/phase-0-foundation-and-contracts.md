# Phase 0 — Foundation and Contracts

## Goal

Create a runnable, testable FastAPI backend skeleton and lock the decisions that later phases depend on. This phase should end with a health endpoint, configuration validation, database/Qdrant/Gemini client boundaries, migration strategy, and a documented API contract—even before the business features are complete.

## Already done

- The stack is chosen: FastAPI, Supabase/Postgres/Auth/Storage, Qdrant Cloud, Gemini, and local `all-MiniLM-L6-v2` embeddings.
- Backend conventions, intended folder structure, ingestion shape, Qdrant payload, RAG flow, and role model are documented in `backend/agents.md`.
- Frontend routes, pages, stores, and mock replacement targets already exist.

## Not to be done in this phase

- Do not implement full auth, material upload, RAG, quiz generation, flashcards, or analytics yet.
- Do not create a second Qdrant collection per run or a temporary retrieval design that later needs migration.
- Do not add student-generated quizzes, messaging, admin access, personalized planners, PYQ analysis, or telemetry.
- Do not make the frontend depend on guessed response shapes; publish the contract first.

## Work items

1. Create the backend package structure from `backend/agents.md`: `app/main.py`, `config.py`, `auth/`, `db/`, `models/`, `schemas/`, `routes/`, `services/`, and `utils/`.
2. Add a pinned Python dependency file and a development setup document. Use a supported Python version consistently across local development and Render.
3. Implement `pydantic-settings` configuration with fail-fast validation for required production settings and safe local defaults only where they cannot hide a missing integration.
4. Add `.env.example` with variable names, descriptions, and no secrets. Never commit real keys, service-role keys, database passwords, or uploaded material.
5. Establish sync/async choices for SQLAlchemy, Supabase client usage, background jobs, and file handling before feature work. Keep the first implementation simple and observable.
6. Add `/health` and `/health/dependencies` endpoints. The latter should report dependency status without exposing credentials.
7. Add a single error envelope, request correlation ID, structured logging, input validation, and consistent HTTP status rules.
8. Add database migration tooling and a test database strategy. Write one smoke test for app startup and one configuration test.
9. Define the first OpenAPI contracts for auth, subjects, materials, chat, quizzes, flashcards, analytics, and download URLs. The endpoints can return `501` until their phase is complete, but the payload shape must be stable.
10. Resolve the two known open items: verify a currently live Gemini model and record whether hybrid sparse retrieval is deferred. Dense-only retrieval is the default if no decision is supplied.

## Initial contract rules

- IDs are UUIDs at the HTTP and database boundaries.
- Timestamps are UTC ISO-8601 values.
- Error responses include a machine-readable `code`, human-readable `message`, optional `details`, and request ID.
- Authenticated routes derive the user from the Supabase token; clients may not submit a user ID to impersonate ownership.
- Role-restricted routes return `403` for a valid user with the wrong role.
- Long-running ingestion and generation responses expose status rather than pretending a synchronous request completed.

## Verification

- Fresh checkout can install dependencies, load `.env.example`-shaped configuration, start FastAPI, and answer `/health`.
- Missing required production configuration fails at startup with an actionable message.
- OpenAPI renders and includes auth, role, request, response, and error schemas.
- Unit tests run without network credentials; integration tests are clearly marked and skipped when services are unavailable.
- No secret appears in tracked files or logs.

## Exit criteria

Phase 1 may begin only after the team has supplied the accounts/keys listed in `backend/plan/requirement.md`, selected the database migration approach, confirmed the Gemini model, and accepted the initial API/error conventions.
