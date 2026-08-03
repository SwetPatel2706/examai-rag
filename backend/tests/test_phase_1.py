import pytest
import uuid
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.subject import Subject, SubjectTeacher, StudentSubject
from app.models.material import Material
from app.services.material_service import update_material_status

# Use StaticPool so the in-memory SQLite DB is shared across all connections
# (by default, each :memory: connection gets its own isolated DB)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Create the database tables
Base.metadata.create_all(bind=engine)

@pytest.fixture(autouse=True)
def clean_db():
    """Clean the DB before each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Clear auth override before each test so tests are isolated
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper to mock authenticate a user
def mock_auth(user: User):
    app.dependency_overrides[get_current_user] = lambda: user

# ── Tests ─────────────────────────────────────────────────────────────────────

def test_subject_access_control(db_session):
    client = TestClient(app)
    
    # 1. Create users
    teacher = User(id=uuid.uuid4(), email="t@examai.com", role="teacher", name="Teacher")
    student_enrolled = User(id=uuid.uuid4(), email="s1@examai.com", role="student", name="Student Enrolled")
    student_unauthorized = User(id=uuid.uuid4(), email="s2@examai.com", role="student", name="Student Unauthorized")
    db_session.add_all([teacher, student_enrolled, student_unauthorized])
    db_session.commit()

    # 2. Create subject
    subject = Subject(name="Software Engineering")
    db_session.add(subject)
    db_session.commit()

    # 3. Associate teacher and enroll student_enrolled
    db_session.add(SubjectTeacher(subject_id=subject.id, teacher_id=teacher.id))
    db_session.add(StudentSubject(subject_id=subject.id, student_id=student_enrolled.id))
    db_session.commit()

    # Case A: Enrolled Student has access
    mock_auth(student_enrolled)
    res = client.get("/api/subjects")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    assert data[0]["name"] == "Software Engineering"

    # Case B: Unauthorized Student has no subjects listed and 403 on detail
    mock_auth(student_unauthorized)
    res = client.get("/api/subjects")
    assert res.status_code == 200
    assert len(res.json()["data"]) == 0

    res = client.get(f"/api/subjects/{subject.id}")
    assert res.status_code == 403

    # Case C: Teacher has access
    mock_auth(teacher)
    res = client.get(f"/api/subjects/{subject.id}")
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Software Engineering"


def test_materials_query_and_metadata_editing(db_session):
    client = TestClient(app)

    # 1. Create users & subject
    t1 = User(id=uuid.uuid4(), email="t1@examai.com", role="teacher", name="Owner")
    t2 = User(id=uuid.uuid4(), email="t2@examai.com", role="teacher", name="Co-Teacher")
    db_session.add_all([t1, t2])
    db_session.commit()

    subject = Subject(name="Math")
    db_session.add(subject)
    db_session.commit()

    db_session.add(SubjectTeacher(subject_id=subject.id, teacher_id=t1.id))
    db_session.add(SubjectTeacher(subject_id=subject.id, teacher_id=t2.id))
    db_session.commit()

    # 2. Upload a material owned by t1
    m1 = Material(
        id=uuid.uuid4(),
        subject_id=subject.id,
        teacher_id=t1.id,
        filename="notes.pdf",
        file_type="pdf",
        storage_path="path/notes.pdf",
        status="processing",
        display_name="Original Name"
    )
    db_session.add(m1)
    db_session.commit()

    # Case A: Co-teacher (t2) can view material
    mock_auth(t2)
    res = client.get(f"/api/materials/{m1.id}")
    assert res.status_code == 200
    assert res.json()["data"]["display_name"] == "Original Name"

    # Case B: Co-teacher (t2) CANNOT edit material (403)
    res = client.patch(f"/api/materials/{m1.id}", json={"display_name": "New Name"})
    assert res.status_code == 403

    # Case C: Owner (t1) can edit material
    mock_auth(t1)
    res = client.patch(f"/api/materials/{m1.id}", json={"display_name": "New Name", "notes": "New Notes"})
    assert res.status_code == 200
    assert res.json()["data"]["display_name"] == "New Name"
    assert res.json()["data"]["notes"] == "New Notes"


def test_material_status_transitions(db_session):
    # 1. Create a processing material
    m = Material(
        id=uuid.uuid4(),
        subject_id=uuid.uuid4(),
        teacher_id=uuid.uuid4(),
        filename="test.pdf",
        file_type="pdf",
        storage_path="path/test.pdf",
        status="processing"
    )
    db_session.add(m)
    db_session.commit()

    # Valid transition: processing -> ready
    m = update_material_status(db_session, m.id, "ready")
    assert m.status == "ready"

    # Invalid transition: failed -> ready
    m.status = "failed"
    db_session.commit()
    with pytest.raises(ValueError) as excinfo:
        update_material_status(db_session, m.id, "ready")
    assert "Cannot transition material status directly from failed to ready" in str(excinfo.value)
