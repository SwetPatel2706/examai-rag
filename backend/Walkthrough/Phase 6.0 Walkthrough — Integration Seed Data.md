# Phase 6.0 Walkthrough — Integration Seed Data

## Goal and outcome
Create a rich, reproducible integration-test seed so the frontend's 15
placeholder pages can be wired to the FastAPI backend and exercised against
real, coherent data — across all four roles/views (student dashboard, chat,
quizzes, flashcards, teacher analytics).

Outcome: `./venv/bin/python -m app.seed --with-rag` provisions 30 users,
4 subjects, 17 materials (12 ready with real Qdrant chunks), 12 quizzes
(8 published), 106 quiz attempts, and 14 flashcard decks (114 cards). The run
is fully idempotent (a re-run adds 0 rows). Verified end-to-end against the
running API for teacher1 and student1, including RAG chat with citations.

## Decisions
- **Subject set**: keep and expand the existing CS demo set — Software
  Engineering and Advanced Database Systems (existing) plus Data Structures &
  Algorithms and Operating Systems. Each subject has two co-teachers,
  2–3 ready materials, and 2–3 quizzes.
- **RAG content is synthetic**: the dataset ships dummy academic paragraphs
  per material (no user-provided uploads needed), embedded into the existing
  single Qdrant collection `exam_materials` (metadata-filtered, never wiped).
- **Deterministic attempts**: `random.Random(42)` per student for
  ability/participation, and a **per-(quiz, student) RNG** keyed on the UUID
  pair so re-runs never shift a shared stream. See the idempotency bug below.
- **Demo accounts**: all use password `Password123!`; `teacher1-4@examai.com`
  and `student1-26@examai.com` (student1/student2 keep their original names
  for README compatibility).

## Files changed
- `backend/app/seed_data.py` (new) — static datasets only: teachers, students,
  subjects, subject→teacher mapping, subject→student enrollments, materials
  (with synthetic content + display_name/notes/status), quizzes (with
  questions, topic_tags, difficulty, time limits, statuses), flashcard decks.
- `backend/app/seed.py` (rewritten) — idempotent seeding flow:
  1. users (Supabase Auth + local profile, shared id) → 2. subjects →
  3. subject_teachers → 4. student_subjects → 5. materials (dedupe by
  subject_id + teacher_id + filename) → 6. quizzes (dedupe by subject +
  teacher + topic; promotes draft→published if dataset says published) →
  7. attempts (deterministic, idempotent) → 8. flashcard decks (dedupe by
  student + title) → 9. `--with-rag`: embed synthetic content into Qdrant,
  reusing `chunk_documents` / `LocalEmbedder` / `QdrantStore` so payloads
  match the Phase 2 pipeline (delete_material before upsert keeps re-runs
  idempotent).
- `backend/app/utils/qdrant_client.py` — fixed `ensure_collection` dimension
  read: newer qdrant-client returns `params.vectors` as a **dict keyed by
  vector name** (`{'': VectorParams(size=384)}`), not an object with `.size`.
- `backend/.env.local` — removed a stray leading `T` from `QDRANT_API_KEY`
  that made Qdrant reject every request with 403.
- `backend/README.md` — documented the seed command, `--with-rag`, and the
  full demo-account table.

## Bugs found and fixed during the run
1. `KeyError: 'role'` in user provisioning → use `u.get("role", "student")`.
2. `column materials.ingestion_version does not exist` — the live DB was
   created via `Base.metadata.create_all` (pre-migration) so the initial
   Alembic migration's `ingestion_version` column was never applied. Fixed
   with a one-off `ALTER TABLE materials ADD COLUMN IF NOT EXISTS
   ingestion_version INTEGER NOT NULL DEFAULT 0`. Only that column was
   missing; everything else matched.
3. Qdrant 403 Forbidden on every call — `QDRANT_API_KEY` in `.env.local`
   started with a stray `T` (e.g. `TeyJhbGci...`). Verified the stripped key
   authenticates, then removed the stray character in place (without exposing
   the secret).
4. `AttributeError: 'dict' object has no attribute 'size'` in
   `ensure_collection` — see file change above.
5. **Non-idempotent attempts** (the subtle one): the attempts loop consumed
   one shared RNG stream, but per-question draws were only consumed when an
   attempt was actually created. Existing attempts shifted the stream, so each
   re-run added a handful of new attempts (106 → 128). Fix: seed each
   `(quiz, student)` pair's RNG from the pair itself
   (`random.Random(f"{quiz.id}:{student.id}")`), making each pair's
   participation + answers independent of DB state. Verified: wipe attempts →
   seed → 106; seed again → 0 new.

## Verification
- Dataset self-checks (cross-references, statuses, counts): passed.
- `py_compile` on seed.py/seed_data.py: OK.
- Seed re-run: `Seeded 0 quiz attempt(s)`, `Seeded 0 flashcard deck(s)`,
  summary stable (`users: 30, subjects: 4, materials: 17, quizzes: 12,
  attempts: 106, decks: 14, flashcards: 114`).
- Qdrant: collection green, 72 points, payloads carry `material_id`,
  `teacher_id`, `teacher_name`, `subject_id`, `filename`, `chunk_text`,
  `chunk_index`, `source_locator`.
- `./venv/bin/pytest`: 73 passed.
- Live API (teacher1 + student1): login/me, `teachers/me/subjects`,
  `teacher/dashboard-stats` (22 active students, 6 quizzes, grade
  distribution, recent activity), `/api/analytics?quiz_id=` (16 attempts,
  avg 79), `/api/student-progress`, `students/me/stats`,
  `students/me/subjects`, `students/me/materials`, `/api/quizzes`,
  `/api/flashcard-decks`, `POST /api/quiz-attempts`, `POST /api/flashcard-decks`
  (201), and `POST /api/chat` returning an answer with real citations
  (`teacher_name`, `material_filename`, `source_locator` page values).

## Known limitations / follow-ups
- `materials: 17` includes 3 legacy rows (`lecture1_intro.pdf`,
  `lecture2_agile.pdf`, `lecture3_git.pdf`) left over from earlier phase
  seeds. They are harmless metadata-only (no Qdrant chunks) but do appear in
  material lists; left in place to avoid destructive deletes — decide whether
  to purge them before the final demo.
- Gemini model name is the known open item (AGENTS.md): chat and flashcard
  generation worked in this run, but confirm the model stays live before R2.
- The one-off `ALTER TABLE` for `ingestion_version` is not captured in a
  migration. If the DB is ever rebuilt from scratch, `alembic upgrade head`
  creates the column via the initial migration; the manual fix only patched
  the pre-existing local DB.
- Attempt seeds are derived from a fixed RNG but the actual row set depends
  on enrolled students; changing `SUBJECT_ENROLLMENTS` changes attempt counts
  (expected).
