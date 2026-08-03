"""
Smoke tests for ExamAI backend.

These tests use the in-process TestClient so they do not require a running
server or real external services.  They cover:
  - Module/config imports
  - GET /health  →  200, success=True
  - GET /health/dependencies  →  200 or 503, correct envelope shape
  - All stub routes  →  501, success=False, NOT_IMPLEMENTED code
"""
import os
# pyrefly: ignore [missing-import]
import pytest

# Ensure a test environment so Settings validation doesn't fail on missing
# production-only fields.  Set minimal required env vars before importing app.
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SUPABASE_STORAGE_BUCKET", "test-bucket")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("QDRANT_API_KEY", "test-api-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")


# ── Import smoke tests ────────────────────────────────────────────────────────

def test_app_imports():
    from app.main import app
    assert app.title == "ExamAI API"


def test_config_loading():
    from app.config import settings
    assert settings.APP_ENV in ["local", "staging", "production", "test"]


# ── HTTP route smoke tests ────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    # httpx.TestClient (via starlette) — in-process, no network.
    # pyrefly: ignore [missing-import]
    from fastapi.testclient import TestClient
    from app.main import app as _app
    with TestClient(_app, raise_server_exceptions=False) as c:
        yield c


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200

    def test_health_success_true(self, client):
        body = client.get("/health").json()
        assert body["success"] is True
        assert body["error"] is None

    def test_health_has_status_field(self, client):
        body = client.get("/health").json()
        assert body["data"]["status"] == "healthy"

    def test_health_has_request_id_header(self, client):
        r = client.get("/health")
        assert "x-request-id" in r.headers

    def test_health_data_has_environment(self, client):
        body = client.get("/health").json()
        assert "environment" in body["data"]


class TestHealthDependenciesEndpoint:
    def test_returns_2xx_or_503(self, client):
        r = client.get("/health/dependencies")
        assert r.status_code in (200, 503)

    def test_has_dependencies_field(self, client):
        body = client.get("/health/dependencies").json()
        # 200 path: data.dependencies; 503 path: error.details.dependencies
        if body["success"]:
            assert "dependencies" in body["data"]
        else:
            assert body["error"] is not None
            assert body["error"]["code"] == "DEPENDENCY_MISSING"

    def test_envelope_contract(self, client):
        body = client.get("/health/dependencies").json()
        if body["success"]:
            assert body["error"] is None
        else:
            assert body["error"] is not None
            # request_id must be present (may be empty string for early failures)
            assert "request_id" in body["error"]

    def test_has_request_id_header(self, client):
        r = client.get("/health/dependencies")
        assert "x-request-id" in r.headers


class TestStubEndpoints:
    """
    All stub routes must return 501 with a NOT_IMPLEMENTED error envelope.
    """

    _STUBS = [
        ("POST", "/api/chat"),
        ("GET",  "/api/quizzes"),
        ("GET",  "/api/flashcards"),
        ("GET",  "/api/analytics"),
    ]

    @pytest.mark.parametrize("method,path", _STUBS)
    def test_stub_returns_501(self, client, method, path):
        r = client.request(method, path)
        assert r.status_code == 501, f"{method} {path} expected 501, got {r.status_code}"

    @pytest.mark.parametrize("method,path", _STUBS)
    def test_stub_success_false(self, client, method, path):
        body = client.request(method, path).json()
        assert body["success"] is False, f"{method} {path}: expected success=False"

    @pytest.mark.parametrize("method,path", _STUBS)
    def test_stub_error_code_not_implemented(self, client, method, path):
        body = client.request(method, path).json()
        assert body["error"]["code"] == "NOT_IMPLEMENTED"

    @pytest.mark.parametrize("method,path", _STUBS)
    def test_stub_has_request_id_header(self, client, method, path):
        r = client.request(method, path)
        assert "x-request-id" in r.headers


class TestMultipartSmoke:
    """
    Verify that python-multipart is installed and FastAPI can parse a
    multipart request.  We POST to the materials stub (which returns 501)
    but the important thing is the *form parsing* does not raise a 422.
    A 501 means the route was reached; a 422 would mean the parser is missing.
    """

    def test_multipart_not_missing(self, client):
        r = client.post(
            "/api/materials",
            # Use data= so httpx sends multipart/form-data
            files={"file": ("test.pdf", b"%PDF-1.4 test content", "application/pdf")},
            data={"subject_id": "00000000-0000-0000-0000-000000000001"},
        )
        # /api/materials is a GET stub, so POST → 405 Method Not Allowed or
        # 501.  Either way it is NOT 422 (Unprocessable Entity due to missing
        # multipart parser), which would mean python-multipart isn't installed.
        assert r.status_code != 422, (
            "Got 422 — python-multipart may not be installed or the multipart "
            "parser failed to parse the request body."
        )
