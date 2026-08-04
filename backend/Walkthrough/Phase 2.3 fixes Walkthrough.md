# Phase 2.3 fixes Walkthrough

**Goal:** Verify the requested review findings against the current Phase 2 code, fix only valid issues, and validate the result.

**Outcome:** All requested findings were still valid and were fixed with minimal changes. No findings were skipped.

**Changes:**

- Updated `StorageClient.delete` in [app/utils/storage.py](../app/utils/storage.py) to call `self.client.request("DELETE", ...)`, retaining the existing endpoint, `prefixes` JSON payload, headers, and `raise_for_status()` validation. Corrected the docstring from POST to DELETE.
- Strengthened [tests/test_phase_2.py](../tests/test_phase_2.py) parser coverage by checking expected PDF, PPTX title/body, and DOCX text content.
- Added a length-consistency guard to `FakeQdrant.upsert` so mismatched vectors, payloads, and IDs raise instead of being silently truncated by `zip`.
- Extended the stale-worker test to assert that neither Qdrant points nor deletion tails are recorded.

**Validation:**

- `./venv/bin/python -m pytest -q tests/test_phase_2.py` — 7 passed.
- `./venv/bin/python -m pytest -q` — 37 passed, with 3 existing dependency/framework deprecation warnings.
- `git diff --check` — clean.

**Lesson:** Review comments should be checked against the current tree: the storage endpoint and payload were already correct, so only the HTTP invocation and stale documentation needed adjustment there.
