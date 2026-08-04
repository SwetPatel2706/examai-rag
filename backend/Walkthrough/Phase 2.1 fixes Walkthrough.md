# Phase 2.1 fixes Walkthrough

## Goal and outcome

Updated the backend documentation so a developer can seed the demo project,
log in with multiple role-specific accounts, and manually verify the Phase 2
material-ingestion flow.

## Documentation changes

- `backend/README.md` now lists the four seeded demo accounts, their roles and
  subject memberships, a login `curl` example, Swagger authorization steps,
  the upload/status/download/retry/delete checklist, the authorization checks,
  file-size/type limits, and the Qdrant provisioning command.
- `backend/plan/phase-2-material-ingestion-and-qdrant.md` now records the
  implementation status and points to the manual verification guide.

## Verification

The credentials are copied from `backend/app/seed.py` and are explicitly
documented as development/demo-only credentials. No Supabase, Qdrant, Gemini,
database, or storage service keys were added to documentation.

## Follow-up

Rotate or replace these seeded passwords before any shared deployment. Phase 3
can extend the checklist with scoped chat citation verification once the chat
route exists.
