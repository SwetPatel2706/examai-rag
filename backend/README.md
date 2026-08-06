# ExamAI Backend

This is the FastAPI backend for the ExamAI application.

## Setup and Running the Server

### 1. Prerequisites
Ensure you have Python 3.10+ installed and the virtual environment set up.

### 2. Install Dependencies
Activate the virtual environment or run from the backend directory:
```bash
./venv/bin/pip install -r requirements.txt
```

### 3. Local Environment Variables
Configure your `.env.local` file with the required environment variables (e.g. database credentials, Supabase keys, Gemini models, Qdrant). Refer to `.env.example` for details.

### 4. Run Database Migrations
Apply current migrations to setup the Postgres schema:
```bash
./venv/bin/alembic upgrade head
```

### 5. Seed Initial Data
Provision the local database with initial roles, subjects, and membership rules (e.g. co-teachers, sample materials):
```bash
./venv/bin/python -m app.seed
```

### 6. Start the FastAPI Server
To run the server in development mode with auto-reload:
```bash
./venv/bin/uvicorn app.main:app --reload
```

The server will be available at: [http://localhost:8000](http://localhost:8000)
API docs can be accessed at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 7. Run Tests
To run the test suite:
```bash
./venv/bin/pytest
```

## Seed data (integration testing)

The seed script provisions **30 users, 4 subjects, 14 materials, 12 quizzes,
~90 quiz attempts, and 14 flashcard decks** across the demo project. Content
lives in `app/seed_data.py`; `app/seed.py` turns it into rows. Run it with:

```bash
./venv/bin/python -m app.seed            # metadata + users (fast, no Qdrant)
./venv/bin/python -m app.seed --with-rag # also embeds synthetic material
                                         # content so Chat + Flashcard
                                         # generation resolve real citations
```

`--with-rag` needs Qdrant reachable and downloads the local embedding model
(`all-MiniLM-L6-v2`) on first use. Without it, material lists, quizzes, and
analytics all work, but Chat and Flashcard *generation* have no vectors to
retrieve from until real files are uploaded through `POST /api/materials`.

The credentials below are for the configured development/demo Supabase project
only; do not reuse them in a shared or production environment. Every account
uses password `Password123!`.

| Role | Email | Seeded access |
|---|---|---|
| Teacher | `teacher1@examai.com` | Software Engineering; Advanced Database Systems |
| Teacher | `teacher2@examai.com` | Software Engineering; Data Structures & Algorithms |
| Teacher | `teacher3@examai.com` | Advanced Database Systems; Operating Systems |
| Teacher | `teacher4@examai.com` | Data Structures & Algorithms; Operating Systems |
| Student | `student1@examai.com` | Software Engineering; Data Structures & Algorithms |
| Student | `student2@examai.com` | Software Engineering; Advanced Database Systems; Operating Systems |
| Student | `student3@examai.com` … `student26@examai.com` | Each enrolled in 2–3 subjects (see `app/seed_data.py`) |

Each subject has two co-teachers, 2–3 ready materials (plus one `failed` and
one `processing` row on Software Engineering to exercise the status UI), 2–3
shared quizzes (8 published, 4 drafts), and quiz attempts from most enrolled
students with a realistic grade spread (A–F bands and at-risk flags included).
Several students have pre-seeded flashcard decks so the deck list and study
screens render immediately.

Start the API, then log in through `POST /api/auth/login` in Swagger at
`http://localhost:8000/docs`, or use:

```bash
curl -s http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"teacher1@examai.com","password":"Password123!"}'
```

Copy `data.access_token` into Swagger's **Authorize** dialog as a Bearer
token. Use the teacher account to verify `POST /api/materials` with multipart
fields `subject_id` and `file`; supported extensions are PDF, PPTX, and DOCX.
Then verify:

1. `GET /api/materials/{material_id}/status` changes to `ready`.
2. `GET /api/materials/{material_id}/download` returns a short-lived signed URL.
3. The material response does not expose `storage_path`.
4. A student can list/read authorized materials but receives `403` for an
   un-enrolled subject and cannot upload or delete materials.
5. The owning teacher can retry a failed material and delete it; a co-teacher
   can view a material but cannot edit, retry, or delete another teacher's
   material.
6. Uploading an unsupported extension or a file over 25 MiB is rejected.

To provision the Qdrant collection before the first upload, run:

```bash
./venv/bin/python -m app.provision_qdrant
```

The source file remains in the private Supabase Storage bucket. Qdrant payloads
contain the teacher, filename, material ID, chunk index, and page/slide/
paragraph locator needed for later citations.

# The following things were not created during planning but instead during implementation of Phase 4

## Phase 4 manual verification

The seed accounts above also drive the shared-quiz flow. With the API running,
use a teacher account (`teacher1@examai.com`) to verify:

1. `POST /api/quizzes` creates a manual draft quiz (with `questions`, each with
   a `correct_option` that must match one of its `options`).
2. `POST /api/quiz/generate` with a `subject_id`, ready `material_ids`, and
   `topic` returns a draft question set **without inserting** it; malformed AI
   output is retried once then rejected with a 502.
3. `POST /api/quizzes/{quiz_id}/publish` transitions `draft` → `published`;
   publishing again is idempotent.
4. A student account sees only published quizzes for enrolled subjects, and
   `GET /api/quizzes/{quiz_id}` never includes `correct_option` in the
   student response.
5. `POST /api/quiz-attempts` with `{quiz_id, answers}` grades server-side
   (score, per-question feedback, weak topics); retrying the same payload
   returns the same attempt (200, no duplicate row).
6. After the first attempt, the teacher's `PATCH`/`DELETE` on that quiz return
   409 (immutability guard).

# Phase 5 manual verification (Teacher Analytics and Student Progress)

Phase 5 adds teacher reporting read models on top of real shared-quiz attempts
(no schema changes). It does **not** wire the frontend — Phase 6 owns that.

With the API running, verify with the seed accounts:

1. `GET /api/analytics?quiz_id={published_quiz_id}` returns question accuracy,
   grade distribution (A/B/C/D/F with counts + percentages), weak topics below
   the configured threshold, `class_size`, `completion_pct`, and `avg_score`.
   With zero attempts the payload has `empty: true`, `avg_score: null`, and all
   band counts at 0.
2. `GET /api/student-progress` returns the per-student roster (avg score,
   completion ratio, last active, `assessed`, `at_risk`). Filter with
   `?subject_id={id}`.
3. `GET /api/student-progress/{student_id}` returns drill-down including the
   per-quiz history. A teacher who does not teach the student's subjects gets
   403, not 404.
4. `GET /api/teacher/dashboard-stats` returns `active_students`,
   `subject_materials` (ready only), `quizzes_created` (draft + published),
   `avg_section_score`, grade distribution, and the 10 most recent attempts
   with per-student `at_risk` flags.
5. `GET /api/students/me/stats`, `GET /api/students/me/subjects` (teachers +
   progress per subject card), and `GET /api/teachers/me/subjects` (subject
   tabs) return the dashboard contracts.
6. `GET /api/students/me/materials` supports `page`/`size`/`subject_id`/
   `teacher_id`/`search`, returns only `ready` materials from enrolled
   subjects, and attaches `teacher_name` so a student knows who to contact.

At-risk policy (configurable via env): `at_risk = assessed AND (avg_score <
AT_RISK_MIN_AVG_SCORE OR completion_pct < AT_RISK_MIN_COMPLETION_PCT)`, where
`assessed` requires at least one attempt in scope; zero-attempt students are
never flagged. Weak-topic threshold: `WEAK_TOPIC_ACCURACY_THRESHOLD` (default 70).
