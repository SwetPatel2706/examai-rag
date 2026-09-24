# Phase 2.1 fixes Walkthrough — Qdrant Payload Index Fix

## Task Goal and Outcome

**Problem:** Uploading a PDF material from the teacher UI failed with:

```
Material ingestion failed: Unexpected Response: 400 (Bad Request)
Raw response content: b'{"status": {"error":"Bad request: Index required but not found for
\"chunk_index\" of one of the following types: [float, integer].
Help: Create an index for this key or use a different filter."}
```

**Root cause:** Qdrant Cloud (unlike the local in-memory client used in tests) **requires
explicit payload indexes** on any field used as a filter. The `delete_material_tail`
operation (which removes stale tail chunks when a material is re-ingested with fewer chunks)
uses a `range` filter on `chunk_index >= chunk_count` — but that payload index was never
created.

**Fix:** Updated `app/provision_qdrant.py` to create all required payload indexes after
validating the collection. Upload now succeeds end-to-end.

---

## Design/Implementation Decisions

### Why Qdrant Cloud behaves differently from the in-memory client

The offline test suite uses an in-memory Qdrant instance (via `qdrant-client`'s in-memory
mode), which does not enforce payload index requirements. Qdrant Cloud's hosted service
requires indexes for:

- **Range filters** (`gte`, `lte`, etc.) → field must have an **integer** or **float** index.
- **Match filters** (`match`, `match_any`) → field must have a **keyword** index (on Qdrant
  Cloud; local is more permissive).

### Idempotent index creation

`create_payload_index` on Qdrant Cloud is idempotent — re-running `provision_qdrant` against
a collection that already has the indexes simply returns `OK` and does not disturb existing
data or vectors.

### Indexes created

| Field | Index type | Used in |
|---|---|---|
| `material_id` | keyword | `delete_material_tail`, `delete_material`, `query` |
| `subject_id` | keyword | `query` |
| `teacher_id` | keyword | `query` |
| `chunk_index` | integer | `delete_material_tail` (range filter) |

---

## Files Changed

- `app/provision_qdrant.py` — Added `_KEYWORD_INDEXES` and `_INTEGER_INDEXES` lists and a
  loop that calls `client.create_payload_index()` for each after `ensure_collection`.
  Import of `qdrant_client.models` added at the top.

No other files required changes — the `QdrantStore` filter logic in
`app/utils/qdrant_client.py` is correct as-is; it just needed the collection to have the
indexes in place before use.

---

## Checks Run

```
./venv/bin/python -m app.provision_qdrant
```

Output (success):
```
Validated Qdrant collection 'exam_materials' with dimension 384.
  Ensured keyword index on 'material_id'.
  Ensured keyword index on 'subject_id'.
  Ensured keyword index on 'teacher_id'.
  Ensured integer index on 'chunk_index'.
Done — all payload indexes are in place.
```

After re-provisioning, uploading the `UNIT-I NLP (1).pdf` through the teacher UI completed
successfully.

---

## Pitfalls / Lessons

1. **Always test against Qdrant Cloud, not just the in-memory client** — the two have
   meaningfully different validation strictness around payload indexes.
2. **Provision script should be run on every fresh deployment / new Qdrant collection** —
   it is both collection creation *and* index setup in one idempotent command.
3. The `FutureWarning` about `get_sentence_embedding_dimension` → `get_embedding_dimension`
   is non-breaking noise from the `sentence-transformers` library.

---

## Follow-up / Known Limitations

- Consider running `provision_qdrant` as part of the backend startup (`app/main.py` lifespan)
  so a fresh deployment self-heals without a manual step.
- The `FutureWarning` in the embedder can be fixed: rename `get_sentence_embedding_dimension`
  → `get_embedding_dimension` in `app/services/ingestion/embedder.py`.
