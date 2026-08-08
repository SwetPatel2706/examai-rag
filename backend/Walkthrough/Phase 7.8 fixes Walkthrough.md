# Phase 7.8 fixes Walkthrough

## Task goal and outcome
Address a CodeRabbit-style review finding on the Supabase refresh-token
exchange: the success path of `SupabaseAuthClient.refresh()` returned
`response.json()` with no JSON-decode guard and no shape validation. The
finding was verified as still valid against current code and fixed by adding
explicit validation that raises `SupabaseUpstreamError` for every malformed
response shape and returns the payload only when both rotated tokens are
present. 4 focused tests added; full suite green (87 passed).

## Why the finding was valid
`app/auth/supabase_client.py` line 182 previously ended `refresh()` with a
bare `return response.json()`. Callers in `app/routes/auth.py:117-121` assume
a dict with string tokens, so unvalidated responses leaked through as wrong
HTTP semantics:

- Malformed JSON → `JSONDecodeError` (a `ValueError`) hit the route's
  `except ValueError` handler → mapped to 401 "Invalid or expired refresh
  token" instead of an upstream 502.
- A non-object payload (e.g. a list) → `auth_data.get(...)` raised
  `AttributeError` → 500.
- Missing/non-string `access_token` / `refresh_token` → `KeyError`/type error
  in the route → 500.

The 400/429/other-status branches were already correct and were left untouched.

## Design decision
Validation lives in the Supabase client, not the route, because the client is
the boundary that owns the provider contract; the route already maps
`SupabaseUpstreamError` → 502. Each failure mode raises a distinct, greppable
message:
- non-JSON body → `"non-JSON response: <exc type>"`
- non-dict payload → `"unexpected response shape"`
- `access_token` missing/empty/non-string → `"missing a valid access_token"`
- `refresh_token` missing/empty/non-string → `"missing a valid refresh_token"`

Tokens are required to be **non-empty** strings (`isinstance(x, str) and x`),
treating `""` as effectively missing. The success path returns the original
payload dict unchanged so callers keep reading `access_token`/`refresh_token`/
`token_type`/`expires_in` as before.

## Files changed and why
- `backend/app/auth/supabase_client.py` — `refresh()` success path: wrap
  `response.json()` in a try/except, validate dict shape and both string
  tokens, raise `SupabaseUpstreamError` on failure, return the payload only
  when valid.
- `backend/tests/test_review_fixes.py` — added 4 async tests mirroring the
  existing `AsyncMock` pattern (`client.client.post` mocked):
  - valid 200 dict returns the payload
  - malformed JSON raises `SupabaseUpstreamError` (match `non-JSON response`)
  - list payload raises `SupabaseUpstreamError` (match `unexpected response shape`)
  - table-driven missing/non-string/empty tokens raise `SupabaseUpstreamError`
    (match `missing a valid`)
  - imported `SupabaseUpstreamError`.

## Tests / checks run
- `backend/venv/bin/pytest` from `backend/` → **87 passed** (83 prior + 4 new),
  offline, ~2.1 s. Pre-existing deprecation warnings only.

## Pitfalls / lessons
- The first edit attempt to the test file deleted the body of an existing test
  (`test_qdrant_ensure_collection_single_unnamed_vector`) via a too-narrow
  replacement; it was restored immediately before running the suite. Lesson:
  prefer inserting new blocks adjacent to a unique anchor rather than
  replacing a whole function.
- Reusing the route's existing `except ValueError` for 401 means the *type* of
  the exception a client raises determines HTTP semantics — always gate on the
  correct exception class (here `SupabaseUpstreamError`), not a broad base.

## Follow-up / limitations
- No route changes needed in `app/routes/auth.py`; its defensive `.get`/`[]`
  are now guaranteed safe because `refresh()` never returns a partial payload.
- `login()` and `verify_token()` still return unvalidated `response.json()`;
  out of scope for this finding (login path is covered by seed-only
  provisioning). Can be hardened similarly if a future review flags it.
