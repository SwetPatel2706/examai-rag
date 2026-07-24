# ExamAI — Agent Guide (Backend)

FastAPI. Routes are thin (HTTP only); logic lives in `app/services/`.
`app/schemas/` (Pydantic) is separate from `app/models/` (SQLAlchemy).

## Structure
```
app/
  auth/        # role-based (student/teacher), Supabase-backed
  db/
  models/      # SQLAlchemy
  schemas/     # Pydantic — request/response, also doubles as LLM structured-
               # output spec (define schema BEFORE prompting, not after)
  routes/
  services/
    ingestion/   # own sub-package: parser -> chunker -> embedder -> pipeline
    rag/
    quiz/
    flashcards/
    analytics/
  utils/
```

## Data model (core entities)
- `users(id, role)` — role: student | teacher
- `subjects(id, name)` — many-to-many with teachers via a join table
  (a subject can have multiple teachers)
- `materials(id, subject_id, teacher_id, filename, upload_date, status)`
  — teacher-owned only; students never write here
- `student_material_selection` — per-request scope, NOT a persisted
  "default" the student sets once; sent fresh with each chat/flashcard-gen
  request as a list of material_ids
- `quizzes(id, subject_id, teacher_id, topic, questions[], source: manual|ai_generated)`
- `quiz_attempts(student_id, quiz_id, answers[], score, weak_topics[])`
- `flashcard_decks(student_id, subject_id, source_material_ids[], cards[])`

## Qdrant strategy (load-bearing, not optional)
Single collection, **metadata-filtered**, not per-run wipe/recreate. Every
vector payload must include `material_id`, `teacher_id`, `subject_id`.
Student RAG queries filter by `material_id IN (selected_ids)`. This is what
makes both the material-scoping feature and citation attribution work —
if metadata is dropped anywhere in the pipeline, both features break silently.

Client config: full `https://` scheme in URL, `timeout=60` (free-tier cold
starts take 5-10s), `api_key=` on constructor, batch upserts at 100,
`client.query_points()` not `.search()` (removed in qdrant-client >= 1.16).

## RAG / citation requirements
Every cited chunk in a chat response must resolve to `{teacher_id,
teacher_name, material_id, material_filename}` before it reaches the
frontend. This is the mechanism that lets a student identify which teacher
to contact — treat missing attribution as a bug, not a cosmetic gap.

## Ingestion (validated from practice projects — reuse, don't rediscover)
- Common intermediate format across all parsers: `{"text": str, "metadata": {...}}`
- PDF: word-level sliding window, 400 words / 50 overlap
- PPTX: multi-slide window (2 slides, 1-slide overlap) — outperforms
  per-slide for generation quality even at equal hit-rate
- PPTX reading order bug: `python-pptx` shape iteration ≠ visual reading
  order — always sort shapes by `(top, left)` before chunking
- Sparse/title-only slides: prepend title to body or they lose all meaning;
  consider LLM-generated enrichment summaries for image-heavy slides
- Embeddings: local `all-MiniLM-L6-v2`, convert with `.tolist()` (kwarg
  `convert_to_list` was dropped in newer sentence-transformers)
- Hybrid dense+sparse search: flagged gap, not yet decided for Phase 1

## LLM usage (Gemini)
- **Verify current model name before building** — `gemini-1.5-flash` 404'd
  in practice runs; don't assume it's still valid. Check quota/billing on
  the team key early, before relying on it for a demo.
- Structured output: define the Pydantic schema first, it doubles as the
  prompt spec. On retry, always include (1) the verbatim error, (2) the full
  bad response, (3) the schema again — generic "try again" retries only
  fixed ~50% of failures in testing; error-aware retries fixed it on attempt 2
  consistently.
- Log raw LLM output during dev; don't strip this logging in the capstone.
- Known JSON failure modes to guard against: markdown code fences, trailing
  prose after the object, wrong field types (`"0"` vs `0`), short option lists.

## Quiz generation
Teachers can author manually or trigger AI-assisted generation from selected
materials (draft, then edit before publish) — both paths produce the same
`quizzes` record shape, `source` field just tags provenance. All students in
a subject take the same published quiz; there is no per-student quiz
generation in Phase 1–3 (explicit v2 scope, do not build early).

## Auth
Supabase-backed, role stored on the user record. No admin role yet — just
gate routes/services on `student` vs `teacher`.
