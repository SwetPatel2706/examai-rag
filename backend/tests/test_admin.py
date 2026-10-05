"""Tests for the simplest admin role: CRUD of teachers, students, subjects + membership."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.supabase_client import supabase_auth
from app.auth.dependencies import get_current_user
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.subject import StudentSubject, Subject, SubjectTeacher
from app.models.user import User

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def module_db_override():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture(autouse=True)
def clean_db(monkeypatch):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
    # Stub out Supabase network calls: admin API creates/deletes the auth
    # account alongside the local row. Tests control these via monkeypatch.
    async def fake_create(email: str, password: str):
        return {"id": str(uuid.uuid4()), "email": email}

    async def fake_delete(user_id: str):
        return None

    monkeypatch.setattr(supabase_auth, "admin_create_user", fake_create)
    monkeypatch.setattr(supabase_auth, "admin_delete_user", fake_delete)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def mock_auth(user: User):
    app.dependency_overrides[get_current_user] = lambda: user


def make_user(db, role: str, email: str) -> User:
    user = User(id=uuid.uuid4(), email=email, role=role, name=email)
    db.add(user)
    db.commit()
    return user


def test_admin_users_crud(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)

    # Create a teacher (Supabase stubbed)
    res = client.post(
        "/api/admin/users",
        json={"email": "newt@examai.com", "name": "New Teacher", "role": "teacher", "password": "Password123!"},
    )
    assert res.status_code == 201, res.text
    teacher_id = res.json()["data"]["id"]

    # Duplicate email -> 409
    res = client.post(
        "/api/admin/users",
        json={"email": "newt@examai.com", "name": "Dup", "role": "teacher", "password": "Password123!"},
    )
    assert res.status_code == 409

    # List filters to teachers only
    client.post(
        "/api/admin/users",
        json={"email": "news@examai.com", "name": "New Student", "role": "student", "password": "Password123!"},
    )
    res = client.get("/api/admin/users", params={"role": "teacher"})
    assert res.status_code == 200
    assert all(u["role"] == "teacher" for u in res.json()["data"]["items"])

    # Update + get
    res = client.patch(f"/api/admin/users/{teacher_id}", json={"name": "Renamed"})
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Renamed"

    # Delete
    res = client.delete(f"/api/admin/users/{teacher_id}")
    assert res.status_code == 200
    res = client.get(f"/api/admin/users/{teacher_id}")
    assert res.status_code == 404


def test_admin_cannot_create_admin_role(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    res = client.post(
        "/api/admin/users",
        json={"email": "evil@examai.com", "name": "Evil", "role": "admin", "password": "Password123!"},
    )
    assert res.status_code == 422


def test_non_admin_forbidden(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    teacher = make_user(db_session, "teacher", "t@examai.com")
    mock_auth(teacher)
    assert client.get("/api/admin/users").status_code == 403
    assert client.get("/api/admin/subjects").status_code == 403

    student = make_user(db_session, "student", "s@examai.com")
    mock_auth(student)
    assert client.get("/api/admin/users").status_code == 403
    res = client.post("/api/admin/subjects", json={"name": "Nope"})
    assert res.status_code == 403


def test_admin_subjects_crud_and_membership(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)

    res = client.post("/api/admin/subjects", json={"name": "Physics"})
    assert res.status_code == 201, res.text
    subject_id = res.json()["data"]["id"]

    res = client.post("/api/admin/subjects", json={"name": "Physics"})
    assert res.status_code == 409

    res = client.patch(f"/api/admin/subjects/{subject_id}", json={"name": "Physics II"})
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Physics II"

    teacher = make_user(db_session, "teacher", "t@examai.com")
    student = make_user(db_session, "student", "s@examai.com")

    # Assign teacher (idempotent) then unassign
    res = client.post(f"/api/admin/subjects/{subject_id}/teachers", json={"teacher_id": str(teacher.id)})
    assert res.status_code == 200
    res = client.post(f"/api/admin/subjects/{subject_id}/teachers", json={"teacher_id": str(teacher.id)})
    assert res.status_code == 200
    assert db_session.query(SubjectTeacher).count() == 1
    res = client.delete(f"/api/admin/subjects/{subject_id}/teachers/{teacher.id}")
    assert res.status_code == 200

    # Wrong role rejected: student cannot be assigned as teacher
    res = client.post(f"/api/admin/subjects/{subject_id}/teachers", json={"teacher_id": str(student.id)})
    assert res.status_code == 400

    # Enroll student then unenroll
    res = client.post(f"/api/admin/subjects/{subject_id}/students", json={"student_id": str(student.id)})
    assert res.status_code == 200
    assert db_session.query(StudentSubject).count() == 1
    res = client.delete(f"/api/admin/subjects/{subject_id}/students/{student.id}")
    assert res.status_code == 200

    # Admin sees all subjects via the admin list
    res = client.get("/api/admin/subjects")
    assert res.status_code == 200
    assert len(res.json()["data"]) == 1

    # Delete subject
    res = client.delete(f"/api/admin/subjects/{subject_id}")
    assert res.status_code == 200
    assert db_session.query(Subject).count() == 0


def test_admin_cannot_delete_self(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    res = client.delete(f"/api/admin/users/{admin.id}")
    assert res.status_code == 400


def test_admin_endpoints_require_auth(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    # No auth override: HTTPBearer rejects the missing credential (401 with
    # WWW-Authenticate: Bearer on current Starlette) before any role check.
    assert client.get("/api/admin/users").status_code == 401
    assert client.post("/api/admin/users", json={}).status_code == 401
    assert client.get("/api/admin/subjects").status_code == 401
    assert client.post("/api/admin/subjects", json={}).status_code == 401


def test_teacher_cannot_use_admin_mutations(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    teacher = make_user(db_session, "teacher", "t@examai.com")
    mock_auth(teacher)
    res = client.post(
        "/api/admin/users",
        json={"email": "x@examai.com", "name": "X", "role": "student", "password": "Password123!"},
    )
    assert res.status_code == 403
    subject = Subject(name="Physics")
    db_session.add(subject)
    db_session.commit()
    assert client.delete(f"/api/admin/subjects/{subject.id}").status_code == 403
    assert client.post(f"/api/admin/subjects/{subject.id}/students", json={}).status_code == 403


def test_admin_user_not_found(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    missing = uuid.uuid4()
    assert client.get(f"/api/admin/users/{missing}").status_code == 404
    assert client.patch(f"/api/admin/users/{missing}", json={"name": "Ghost"}).status_code == 404
    assert client.delete(f"/api/admin/users/{missing}").status_code == 404
    assert client.get("/api/admin/users", params={"role": "superuser"}).status_code == 400


def test_admin_update_user_role(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    teacher = make_user(db_session, "teacher", "t@examai.com")
    res = client.patch(f"/api/admin/users/{teacher.id}", json={"role": "student"})
    assert res.status_code == 200
    assert res.json()["data"]["role"] == "student"
    # The request runs in its own session: expire the test session's identity
    # map so the re-read below isn't served the stale in-memory object.
    db_session.expire_all()
    assert db_session.query(User).filter(User.id == teacher.id).first().role == "student"


def test_admin_users_list_excludes_admins_and_supports_search(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    make_user(db_session, "teacher", "alice-teacher@examai.com")
    make_user(db_session, "student", "bob-student@examai.com")

    res = client.get("/api/admin/users", params={"size": 100})
    assert res.status_code == 200
    payload = res.json()["data"]
    assert payload["total"] == 2
    assert payload["page"] == 1
    assert all(u["role"] in ("teacher", "student") for u in payload["items"])

    res = client.get("/api/admin/users", params={"search": "alice"})
    assert res.status_code == 200
    assert res.json()["data"]["total"] == 1

    res = client.get("/api/admin/users", params={"role": "student", "search": "alice"})
    assert res.status_code == 200
    assert res.json()["data"]["total"] == 0


def test_admin_create_user_supabase_failure_leaves_no_row(db_session, monkeypatch):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)

    async def boom(email: str, password: str):
        raise RuntimeError("supabase down")

    monkeypatch.setattr(supabase_auth, "admin_create_user", boom)
    res = client.post(
        "/api/admin/users",
        json={"email": "x@examai.com", "name": "X", "role": "teacher", "password": "Password123!"},
    )
    assert res.status_code == 502
    assert db_session.query(User).filter(User.email == "x@examai.com").count() == 0


def test_admin_create_user_db_conflict_cleans_up_supabase_user(db_session, monkeypatch):
    """If the local commit fails after Supabase creation, the orphan auth
    account must be deleted and the commit error re-raised (500)."""
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    existing = make_user(db_session, "teacher", "dup@examai.com")

    cleaned_up = []

    async def fake_create(email: str, password: str):
        # Force a PK collision on the local insert.
        return {"id": str(existing.id), "email": email}

    async def record_delete(user_id: str):
        cleaned_up.append(user_id)
        return None

    monkeypatch.setattr(supabase_auth, "admin_create_user", fake_create)
    monkeypatch.setattr(supabase_auth, "admin_delete_user", record_delete)
    res = client.post(
        "/api/admin/users",
        json={"email": "other@examai.com", "name": "Other", "role": "teacher", "password": "Password123!"},
    )
    assert res.status_code == 500
    assert cleaned_up == [str(existing.id)]
    assert db_session.query(User).filter(User.email == "other@examai.com").count() == 0


def test_admin_delete_user_calls_supabase(db_session, monkeypatch):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    teacher = make_user(db_session, "teacher", "t@examai.com")

    deleted = []

    async def record_delete(user_id: str):
        deleted.append(user_id)
        return None

    monkeypatch.setattr(supabase_auth, "admin_delete_user", record_delete)
    res = client.delete(f"/api/admin/users/{teacher.id}")
    assert res.status_code == 200
    assert deleted == [str(teacher.id)]
    assert db_session.query(User).filter(User.id == teacher.id).count() == 0


def test_admin_subject_membership_errors(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    teacher = make_user(db_session, "teacher", "t@examai.com")
    student = make_user(db_session, "student", "s@examai.com")
    subject = Subject(name="Physics")
    db_session.add(subject)
    db_session.commit()
    missing = uuid.uuid4()

    # Unknown subject
    assert client.post(f"/api/admin/subjects/{missing}/teachers", json={"teacher_id": str(teacher.id)}).status_code == 404
    assert client.post(f"/api/admin/subjects/{missing}/students", json={"student_id": str(student.id)}).status_code == 404
    assert client.patch(f"/api/admin/subjects/{missing}", json={"name": "X"}).status_code == 404
    assert client.delete(f"/api/admin/subjects/{missing}").status_code == 404

    # Missing id fields
    assert client.post(f"/api/admin/subjects/{subject.id}/teachers", json={}).status_code == 400
    assert client.post(f"/api/admin/subjects/{subject.id}/students", json={}).status_code == 400

    # Removing assignments that don't exist
    assert client.delete(f"/api/admin/subjects/{subject.id}/teachers/{teacher.id}").status_code == 404
    assert client.delete(f"/api/admin/subjects/{subject.id}/students/{student.id}").status_code == 404

    # Rename collision
    db_session.add(Subject(name="Chemistry"))
    db_session.commit()
    res = client.patch(f"/api/admin/subjects/{subject.id}", json={"name": "Chemistry"})
    assert res.status_code == 409


def test_admin_delete_subject_cascades_memberships(db_session):
    client = TestClient(app, raise_server_exceptions=False)
    admin = make_user(db_session, "admin", "admin@examai.local")
    mock_auth(admin)
    teacher = make_user(db_session, "teacher", "t@examai.com")
    student = make_user(db_session, "student", "s@examai.com")
    subject = Subject(name="Physics")
    db_session.add(subject)
    db_session.commit()
    db_session.add(SubjectTeacher(subject_id=subject.id, teacher_id=teacher.id))
    db_session.add(StudentSubject(subject_id=subject.id, student_id=student.id))
    db_session.commit()

    res = client.delete(f"/api/admin/subjects/{subject.id}")
    assert res.status_code == 200
    assert db_session.query(SubjectTeacher).count() == 0
    assert db_session.query(StudentSubject).count() == 0
    # Membership users survive the subject delete.
    assert db_session.query(User).count() == 3
