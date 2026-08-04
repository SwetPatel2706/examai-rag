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

## Phase 2 manual verification

The seed script provisions four demo accounts. These credentials are for the
configured development/demo Supabase project only; do not reuse them in a
shared or production environment.

| Role | Email | Password | Seeded access |
|---|---|---|---|
| Teacher | `teacher1@examai.com` | `Password123!` | Software Engineering; Advanced Database Systems |
| Teacher | `teacher2@examai.com` | `Password123!` | Software Engineering |
| Student | `student1@examai.com` | `Password123!` | Enrolled in Software Engineering |
| Student | `student2@examai.com` | `Password123!` | Enrolled in Software Engineering and Advanced Database Systems |

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
