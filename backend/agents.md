# ExamAI — Agent Guide (Backend)

FastAPI. Routes are thin (HTTP only); logic lives in `app/services/`.
`app/schemas/` (Pydantic) is separate from `app/models/` (SQLAlchemy).

## Environment — venv path, running, testing (read this first)

- **Canonical venv: `backend/venv/`** (Python 3.14.6). Run every Python tool
  as `./venv/bin/<tool>` **from the `backend/` directory**
  (`./venv/bin/python`, `./venv/bin/pytest`, `./venv/bin/uvicorn`,
  `./venv/bin/alembic`, `./venv/bin/pip`). Do **not** use the repo-root
  `.venv/` — it is a stale partial duplicate missing the parser libraries
  (pypdf, python-pptx, python-docx, reportlab, …). On a clean checkout, create
  and provision it once from `backend/`: `python3.14 -m venv venv` then
  `./venv/bin/pip install -r requirements.txt`.
- Install deps: `./venv/bin/pip install -r requirements.txt`
- Config: `app/config.py` (pydantic-settings) loads `.env.local` **from the
  current working directory**. Always run uvicorn/alembic/seed/pytest from
  `backend/`, never from the repo root. Template: `.env.example`; real values
  live in the gitignored `.env.local`.
- Run API: `./venv/bin/uvicorn app.main:app --reload` →
  http://localhost:8000 (Swagger at `/docs`, ReDoc at `/redoc`).
- Migrations: `./venv/bin/alembic upgrade head`
- Seed demo data: `./venv/bin/python -m app.seed` — add `--with-rag` to embed
  synthetic material content so Chat/Flashcards resolve real citations (needs
  Qdrant reachable + downloads `all-MiniLM-L6-v2` on first use).
- Provision the Qdrant collection: `./venv/bin/python -m app.provision_qdrant`
- Tests: `./venv/bin/pytest` from `backend/` — **offline, 77 tests pass
  (~1.5 s)**, no external services required. Single file:
  `./venv/bin/pytest tests/test_smoke.py -q`.
- No project-level Python linter/typecheck config; `pytest` is the gate. Code
  carries `# pyrefly: ignore` comments for the in-editor pyrefly checker.

## Folder structure
```
backend/
  app/
    main.py
    config.py                  # env vars via pydantic-settings
    auth/
      dependencies.py          # get_current_user, require_role("teacher")
      supabase_client.py
    db/
      session.py                # SQLAlchemy engine/session
      base.py
    models/                     # SQLAlchemy ORM
      user.py
      subject.py
      material.py
      quiz.py
      flashcard.py
    schemas/                    # Pydantic — request/response AND LLM
                                 # structured-output spec (define schema
                                 # BEFORE prompting, it IS the prompt spec)
      material.py
      quiz.py
      chat.py
    routes/
      auth.py
      subjects.py
      materials.py
      chat.py
      quizzes.py
      flashcards.py
      analytics.py
    services/
      ingestion/
        parsers/
          pdf_parser.py
          pptx_parser.py
          docx_parser.py
        chunker.py
        embedder.py
        pipeline.py
      rag/
        retriever.py
        citation.py              # resolves chunk -> teacher/material metadata
        chat_service.py
      quiz/
        manual_service.py
        ai_generate_service.py
        grading_service.py
      flashcards/
        generate_service.py
      analytics/
        quiz_analytics.py        # per-quiz: heatmap, grade distribution
        student_progress.py      # cross-quiz, per-student roster + at-risk
    utils/
      qdrant_client.py
      gemini_client.py
      retry.py                   # error-aware structured-output retry helper
```

## Data model (SQL, Supabase/Postgres)
```sql
users (id, email, role, name, created_at)             -- role: student|teacher

subjects (id, name)
subject_teachers (subject_id, teacher_id)               -- many-to-many
-- Teacher membership: UNIQUE (subject_id, teacher_id)

-- Student enrollment in subjects.  Required for authorization checks on
-- materials, quizzes, and chat.  A student can only access a subject's
-- content (materials, published quizzes, chat) if they are enrolled here.
student_subjects (
  subject_id  UUID REFERENCES subjects(id),
  student_id  UUID REFERENCES users(id),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (subject_id, student_id)   -- uniqueness constraint prevents
                                         -- duplicate enrollments
)

materials (
  id, subject_id, teacher_id,
  filename, file_type, storage_path,
  status,            -- 'processing' | 'ready' | 'failed'
  uploaded_at
)
-- students never write here; teacher-owned only

quizzes (
  id, subject_id, teacher_id, topic,
  source,            -- 'manual' | 'ai_generated'
  status,            -- 'draft' | 'published'
  created_at
)
quiz_questions (
  id, quiz_id, question_text, options JSONB,
  correct_option, topic_tag, difficulty
)
quiz_attempts (
  id, quiz_id, student_id,
  answers JSONB, score, weak_topics JSONB, submitted_at
)

flashcard_decks (
  id, student_id, subject_id,
  source_material_ids JSONB, title, created_at
)
flashcards (
  id, deck_id, front, back, mastery_state   -- 'new'|'learning'|'mastered'
)
```
`student_material_selection` is deliberately NOT a table — it's a request-time
payload (`material_ids: []`) sent fresh with each chat/flashcard-gen call, not
persisted as a default. This keeps "adjustable per session" true at the data
layer, not just the UI.

## Authorization rules (enforce in services, not just route handlers)
- **Teacher access**: gate on `subject_teachers` (subject_id, teacher_id).
- **Student access**: gate on `student_subjects` (subject_id, student_id).
  A student with no row in `student_subjects` for the requested subject must
  receive 403, not 404, for all subject-scoped resources (materials, quizzes,
  chat).
- Cross-check both relations where relevant; do not rely solely on the
  requesting user's role field without checking membership.

## Qdrant strategy (load-bearing — get this right before RAG/quiz work)
One collection (e.g. `exam_materials`), **metadata-filtered**, never
per-run wipe/recreate. Every point payload:
```json
{
  "material_id": "uuid",
  "teacher_id": "uuid",
  "teacher_name": "Dr. Smith",
  "subject_id": "uuid",
  "filename": "lecture_notes_v2.pdf",
  "chunk_text": "...",
  "chunk_index": 3,
  "source_locator": {
    "type": "page|slide|paragraph",
    "value": 4
  }
}
```
`source_locator` is stable, ingestion-time metadata (e.g. `{"type": "page",
"value": 4}` for PDFs, `{"type": "slide", "value": 2}` for PPTX).
Phase 3 uses it for citations so a student can identify exactly which page or
slide the answer came from.  Denormalizing `teacher_name`/`filename` into the
payload is deliberate — citation resolution reads straight off the Qdrant hit,
no Postgres round-trip per chunk.

## Retrieval filter (apply pre-query authorization before building the filter)

**Before querying Qdrant, always validate that every `material_id` in
`selected_material_ids` belongs to the requested `subject_id`.** This prevents
a student from cross-referencing materials from an unrelated subject by
supplying arbitrary UUIDs.  Do this with a single Postgres query:

```python
# In the retriever / chat service — run BEFORE calling query_points()
authorized_ids = {
    row.id for row in db.execute(
        select(Material.id)
        .where(Material.id.in_(selected_material_ids))
        .where(Material.subject_id == subject_id)
        .where(Material.status == "ready")
    )
}
if not authorized_ids.issuperset(set(selected_material_ids)):
    raise HTTPException(403, "One or more material IDs are not authorized for this subject.")
```

Then build the Qdrant filter including **both** `subject_id` and `material_id`
as defence-in-depth (Qdrant payload fields are already indexed):

```python
query_filter=Filter(
    must=[
        FieldCondition(key="subject_id",   match=MatchValue(value=subject_id)),
        FieldCondition(key="material_id",  match=MatchAny(any=list(authorized_ids))),
    ]
)
```

Client config: full `https://` scheme, `timeout=60` (free-tier cold start),
`api_key=` on constructor, batch upserts at 100, `client.query_points()` not
`.search()` (removed in qdrant-client >= 1.16).

## RAG chat flow
1. Frontend sends `{subject_id, selected_material_ids[], question}`
2. Validate `selected_material_ids` against `subject_id` in Postgres (see above)
3. Embed question → `query_points()` filtered by both `subject_id` and `material_id IN authorized_ids`, top_k=3-5
4. Build numbered context from retrieved chunks, call Gemini
5. Parse response, map each `[1]`/`[2]` marker back to its source chunk's
   payload → attach `{teacher_name, material_filename, material_id, source_locator}`
6. Return `{answer_text, citations: [...]}`  — this is the contract the
   frontend assumes; missing attribution on any citation is a bug, not a
   cosmetic gap (it's the mechanism that lets a student find the right
   teacher to ask).

## Ingestion (validated from practice projects — port, don't rediscover)
- Common intermediate format across parsers: `{"text": str, "metadata": {...}}`
- PDF: word-level sliding window, 400 words / 50 overlap
- PPTX: multi-slide window (2 slides, 1-slide overlap) — better generation
  quality than per-slide even at equal hit-rate
- PPTX reading-order bug: `python-pptx` shape iteration ≠ visual reading
  order — sort shapes by `(top, left)` before chunking, always
- Sparse/title-only slides: prepend title to body or they lose meaning
- Embeddings: local `all-MiniLM-L6-v2`, `.tolist()` to convert (newer
  sentence-transformers dropped the `convert_to_list` kwarg)
- Hybrid dense+sparse search: flagged gap, not decided for Phase 1 — don't
  block on it

## LLM usage (Gemini)
- **Verify current model name before building.** `gemini-1.5-flash` 404'd in
  practice runs — don't assume it. Confirm quota/billing on the team key early.
- Structured output: define the Pydantic schema first — it doubles as the
  prompt spec. On retry, include (1) verbatim error, (2) full bad response,
  (3) schema again. Generic "try again" only fixed ~50% of failures in
  testing; error-aware retries fixed it on attempt 2 consistently.
- **LLM output logging is opt-in, local-development only, and disabled by
  default.**  Never log raw LLM output in staging or production.
  When enabled for debugging:
  - Gate behind an explicit env flag: `LLM_DEBUG_LOGGING=true` (default:
    `false`; ignore in any non-local `APP_ENV`).
  - Bound output size: truncate at 2 000 characters in the log entry.
  - Redact before writing: strip or mask the user's question, any source
    material excerpts (chunk_text), API keys, and any field that could
    contain PII.  Log only structure metadata (model name, finish reason,
    token counts, timing) in non-debug mode.
  - Production must never enable this logging regardless of env-var value.
- Known JSON failure modes to guard against: markdown code fences, trailing
  prose, wrong field types (`"0"` vs `0`), short option lists.

## Quiz generation — manual and AI-assisted, same target shape
Both paths produce `quiz_questions` rows; `source` field just tags provenance.
- **Manual**: teacher fills form → direct insert as `draft`
- **AI-assisted**: teacher picks materials + topic → same retriever as chat
  → Gemini generates N questions matching the `quiz_questions` schema →
  returned as `draft` → teacher edits/approves before `publish`. Reuse the
  RAG retriever and the structured-output retry helper here.
All students in a subject take the same published quiz — no per-student quiz
generation in Phase 1–3 (explicit v2 scope, do not build early).

## Analytics — two distinct services, don't merge
- `quiz_analytics.py` — per-quiz: question accuracy heatmap, grade
  distribution, weak topics, scoped to one quiz's attempts
- `student_progress.py` — cross-quiz, per-student roster: avg score,
  completion ratio, last active, at-risk flag, feeds the drill-down view
No teacher→student messaging/broadcast service — flagged out of scope,
do not build even though it appeared in a Stitch export.

## Auth
Supabase-backed, role stored on the user record. No admin role yet — gate
routes/services on `student` vs `teacher` only.
