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
