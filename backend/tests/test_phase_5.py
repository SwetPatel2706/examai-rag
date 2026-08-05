import datetime
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.main import app
from app.models.user import User
from app.models.subject import Subject, SubjectTeacher, StudentSubject
from app.models.quiz import Quiz, QuizAttempt, QuizQuestion
from app.models.material import Material

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

_T0 = datetime.datetime(2026, 8, 1, 9, 0, 0, tzinfo=datetime.timezone.utc)


@pytest.fixture(autouse=True)
def ctx():
    """Fresh in-memory DB + TestClient per test, isolated from other modules."""
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client, session_factory
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)


def mock_auth(user: User):
    app.dependency_overrides[get_current_user] = lambda: user


# ── Seed helpers ──────────────────────────────────────────────────────────────

def make_user(db, role: str, email: str) -> User:
    user = User(id=uuid.uuid4(), email=email, role=role, name=email)
    db.add(user)
    db.commit()
    return user


def make_subject(db, name: str) -> Subject:
    subject = Subject(name=name)
    db.add(subject)
    db.commit()
    return subject


def make_quiz(db, subject: Subject, teacher: User, status: str = "published", topic: str = "Kinematics") -> Quiz:
    quiz = Quiz(
        subject_id=subject.id,
        teacher_id=teacher.id,
        topic=topic,
        source="manual",
        status=status,
        time_limit_seconds=600,
    )
    quiz.questions = [
        QuizQuestion(
            question_text="What is 2+2?",
            options=["3", "4", "5", "6"],
            correct_option="4",
            topic_tag="Arithmetic",
            difficulty="easy",
        )
    ]
    db.add(quiz)
    db.commit()
    return quiz


def make_attempt(db, quiz: Quiz, student: User, answers, score: int, weak_topics, submitted_at) -> QuizAttempt:
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=student.id,
        answers=answers,
        score=score,
        weak_topics=weak_topics,
        submitted_at=submitted_at,
    )
    db.add(attempt)
    db.commit()
    return attempt


def make_material(db, subject: Subject, teacher: User, filename: str = "notes.pdf", status: str = "ready") -> Material:
    material = Material(
        id=uuid.uuid4(),
        subject_id=subject.id,
        teacher_id=teacher.id,
        filename=filename,
        file_type="pdf",
        storage_path=f"materials/{filename}",
        status=status,
        display_name=None,
        notes=None,
    )
    db.add(material)
    db.commit()
    return material


def seed_physics(db):
    """Two teachers + subject + three enrolled students."""
    teacher = make_user(db, "teacher", "t@examai.com")
    co_teacher = make_user(db, "teacher", "t2@examai.com")
    s1 = make_user(db, "student", "s1@examai.com")
    s2 = make_user(db, "student", "s2@examai.com")
    s3 = make_user(db, "student", "s3@examai.com")
    subject = make_subject(db, "Physics")
    db.add(SubjectTeacher(subject_id=subject.id, teacher_id=teacher.id))
    db.add(SubjectTeacher(subject_id=subject.id, teacher_id=co_teacher.id))
    for student in (s1, s2, s3):
        db.add(StudentSubject(subject_id=subject.id, student_id=student.id))
    db.commit()
    return {
        "teacher": teacher, "co_teacher": co_teacher,
        "s1": s1, "s2": s2, "s3": s3, "subject": subject,
    }


def seed_two_subjects(db):
    """Physics (taught by t1) and Chemistry (taught by t2). s1 in both, s2 only in Chemistry."""
    t1 = make_user(db, "teacher", "t1@examai.com")
    t2 = make_user(db, "teacher", "t2@examai.com")
    s1 = make_user(db, "student", "s1@examai.com")
    s2 = make_user(db, "student", "s2@examai.com")
    physics = make_subject(db, "Physics")
    chemistry = make_subject(db, "Chemistry")
    db.add(SubjectTeacher(subject_id=physics.id, teacher_id=t1.id))
    db.add(SubjectTeacher(subject_id=chemistry.id, teacher_id=t2.id))
    db.add(StudentSubject(subject_id=physics.id, student_id=s1.id))
    db.add(StudentSubject(subject_id=chemistry.id, student_id=s1.id))
    db.add(StudentSubject(subject_id=chemistry.id, student_id=s2.id))
    db.commit()
    return {"t1": t1, "t2": t2, "s1": s1, "s2": s2, "physics": physics, "chemistry": chemistry}


def seed_roster(db):
    """Physics with two published quizzes; s1 full marks, s2 failing, s3 untouched."""
    users = seed_physics(db)
    q1 = make_quiz(db, users["subject"], users["teacher"], topic="Kinematics")
    q2 = make_quiz(db, users["subject"], users["teacher"], topic="Dynamics")
    qid = str(q1.questions[0].id)
    make_attempt(db, q1, users["s1"], {qid: "4"}, 100, [], _T0)
    make_attempt(db, q2, users["s1"], {qid: "4"}, 100, [], _T0 + datetime.timedelta(hours=1))
    make_attempt(db, q1, users["s2"], {qid: "3"}, 0, [{"topic": "Arithmetic", "accuracy": 0}], _T0 + datetime.timedelta(hours=2))
    return {**users, "q1": q1, "q2": q2}


# ── Per-quiz analytics ────────────────────────────────────────────────────────

def test_per_quiz_analytics_empty_state(ctx):
    client, sf = ctx
    db = sf()
    users = seed_physics(db)
    quiz = make_quiz(db, users["subject"], users["teacher"])
    mock_auth(users["teacher"])

    res = client.get(f"/api/analytics?quiz_id={quiz.id}")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["empty"] is True
    assert data["attempt_count"] == 0
    assert data["class_size"] == 3
    assert data["completion_pct"] == 0
    assert data["avg_score"] is None
    assert all(band["count"] == 0 for band in data["grade_distribution"])
    assert all(item["accuracy"] is None for item in data["question_accuracy"])
    assert data["weak_topics"] == []
    assert data["subject_name"] == "Physics"


def test_per_quiz_analytics_hand_computed_totals(ctx):
    client, sf = ctx
    db = sf()
    users = seed_physics(db)
    quiz = make_quiz(db, users["subject"], users["teacher"])
    mock_auth(users["teacher"])

    mock_auth(users["s1"])
    client.post("/api/quiz-attempts", json={"quiz_id": str(quiz.id), "answers": {str(quiz.questions[0].id): "4"}})  # s1 -> 100
    mock_auth(users["s2"])
    client.post("/api/quiz-attempts", json={"quiz_id": str(quiz.id), "answers": {str(quiz.questions[0].id): "5"}})  # s2 -> 0

    mock_auth(users["teacher"])
    res = client.get(f"/api/analytics?quiz_id={quiz.id}")
    data = res.json()["data"]

    assert data["empty"] is False
    assert data["attempt_count"] == 2
    assert data["class_size"] == 3
    assert data["completion_pct"] == 67  # 2/3
    assert data["avg_score"] == 50  # (100 + 0) / 2
    bands = {band["band"]: band for band in data["grade_distribution"]}
    assert bands["A"]["count"] == 1 and bands["A"]["pct"] == 50
    assert bands["F"]["count"] == 1 and bands["F"]["pct"] == 50
    assert all(bands[b]["count"] == 0 for b in ("B", "C", "D"))
    acc = data["question_accuracy"][0]
    assert acc["correct_count"] == 1
    assert acc["total"] == 2
    assert acc["accuracy"] == 50


def test_weak_topics_flagged_below_threshold(ctx):
    client, sf = ctx
    db = sf()
    users = seed_physics(db)
    quiz = make_quiz(db, users["subject"], users["teacher"])
    mock_auth(users["s1"])
    client.post("/api/quiz-attempts", json={"quiz_id": str(quiz.id), "answers": {str(quiz.questions[0].id): "5"}})

    mock_auth(users["teacher"])
    data = client.get(f"/api/analytics?quiz_id={quiz.id}").json()["data"]
    assert len(data["weak_topics"]) == 1
    weak = data["weak_topics"][0]
    assert weak["topic"] == "Arithmetic"
    assert weak["accuracy"] == 0
    assert weak["question_count"] == 1
    assert weak["attempt_count"] == 1


def test_analytics_idor_and_role_guard(ctx):
    client, sf = ctx
    db = sf()
    users = seed_two_subjects(db)
    quiz = make_quiz(db, users["physics"], users["t1"])

    # Teacher who does not teach the quiz's subject -> 403, not 404.
    mock_auth(users["t2"])
    res = client.get(f"/api/analytics?quiz_id={quiz.id}")
    assert res.status_code == 403

    # Student cannot read analytics at all.
    mock_auth(users["s1"])
    res = client.get(f"/api/analytics?quiz_id={quiz.id}")
    assert res.status_code == 403

    # Unknown quiz -> 404.
    mock_auth(users["t1"])
    res = client.get(f"/api/analytics?quiz_id={uuid.uuid4()}")
    assert res.status_code == 404


# ── Cross-quiz student progress ───────────────────────────────────────────────

def test_student_progress_roster_aggregates(ctx):
    client, sf = ctx
    db = sf()
    users = seed_roster(db)
    mock_auth(users["teacher"])

    res = client.get("/api/student-progress")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["subject_id"] is None and data["subject_name"] is None
    by_name = {row["name"]: row for row in data["students"]}
    assert set(by_name) == {"s1@examai.com", "s2@examai.com", "s3@examai.com"}

    s1, s2, s3 = by_name["s1@examai.com"], by_name["s2@examai.com"], by_name["s3@examai.com"]
    assert s1["avg_score"] == 100 and s1["completion_pct"] == 100 and s1["assessed"] is True and s1["at_risk"] is False
    assert s2["avg_score"] == 0 and s2["completion_pct"] == 50 and s2["assessed"] is True and s2["at_risk"] is True
    assert s3["avg_score"] is None and s3["completion_pct"] == 0 and s3["assessed"] is False and s3["at_risk"] is False
    assert s1["subjects"] == ["Physics"] and s2["subjects"] == ["Physics"]
    assert s2["last_active"] is not None


def test_student_progress_subject_filter_and_idor(ctx):
    client, sf = ctx
    db = sf()
    users = seed_two_subjects(db)
    q_phys = make_quiz(db, users["physics"], users["t1"])
    q_chem = make_quiz(db, users["chemistry"], users["t2"])
    make_attempt(db, q_phys, users["s1"], {}, 80, [], _T0)
    make_attempt(db, q_chem, users["s1"], {}, 90, [], _T0)

    mock_auth(users["t1"])
    res = client.get(f"/api/student-progress?subject_id={users['physics'].id}")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["subject_name"] == "Physics"
    assert [row["name"] for row in data["students"]] == ["s1@examai.com"]

    # Teacher filtering a subject they do not teach -> 403.
    res = client.get(f"/api/student-progress?subject_id={users['chemistry'].id}")
    assert res.status_code == 403

    # Roster for an untaught subject_id is rejected even if the subject exists.
    mock_auth(users["t2"])
    res = client.get(f"/api/student-progress?subject_id={users['physics'].id}")
    assert res.status_code == 403


def test_student_progress_detail(ctx):
    client, sf = ctx
    db = sf()
    users = seed_roster(db)
    mock_auth(users["teacher"])

    res = client.get(f"/api/student-progress/{users['s1'].id}")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["name"] == "s1@examai.com"
    assert data["avg_score"] == 100 and data["completion_pct"] == 100
    assert data["at_risk"] is False and data["assessed"] is True
    assert data["subjects"] == ["Physics"]
    assert len(data["quiz_history"]) == 2
    assert {entry["quiz_title"] for entry in data["quiz_history"]} == {"Kinematics", "Dynamics"}
    assert all(entry["subject_name"] == "Physics" for entry in data["quiz_history"])


def test_student_progress_detail_idor(ctx):
    client, sf = ctx
    db = sf()
    users = seed_two_subjects(db)

    # Missing student -> 404.
    mock_auth(users["t1"])
    res = client.get(f"/api/student-progress/{uuid.uuid4()}")
    assert res.status_code == 404

    # Student not enrolled in any subject the teacher teaches -> 403 (no leak).
    res = client.get(f"/api/student-progress/{users['s2'].id}")
    assert res.status_code == 403


# ── Teacher dashboard ─────────────────────────────────────────────────────────

def test_teacher_dashboard_stats(ctx):
    client, sf = ctx
    db = sf()
    users = seed_roster(db)
    make_material(db, users["subject"], users["teacher"], "ready.pdf", "ready")
    make_material(db, users["subject"], users["teacher"], "pending.pdf", "processing")
    make_quiz(db, users["subject"], users["teacher"], status="draft", topic="Draft-only")
    mock_auth(users["teacher"])

    res = client.get("/api/teacher/dashboard-stats")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["active_students"] == 2  # s1 + s2, s3 never attempted
    assert data["subject_materials"] == 1  # only ready
    assert data["quizzes_created"] == 3  # 2 published + 1 draft
    assert data["avg_section_score"] == 67  # (100 + 100 + 0) / 3
    bands = {band["band"]: band for band in data["grade_distribution"]}
    assert bands["A"]["count"] == 2 and bands["F"]["count"] == 1
    assert len(data["recent_activity"]) == 3
    recent = data["recent_activity"]
    assert {row["student_name"] for row in recent} == {"s1@examai.com", "s2@examai.com"}
    flags = {row["student_name"]: row["at_risk"] for row in recent}
    assert flags["s2@examai.com"] is True and flags["s1@examai.com"] is False
    assert recent[0]["submitted_at"] > recent[-1]["submitted_at"]  # newest first


def test_teacher_dashboard_empty_subjects(ctx):
    client, sf = ctx
    db = sf()
    teacher = make_user(db, "teacher", "lonely@examai.com")
    mock_auth(teacher)

    data = client.get("/api/teacher/dashboard-stats").json()["data"]
    assert data["active_students"] == 0
    assert data["subject_materials"] == 0
    assert data["quizzes_created"] == 0
    assert data["avg_section_score"] is None
    assert all(band["count"] == 0 for band in data["grade_distribution"])
    assert data["recent_activity"] == []


# ── Student dashboard ─────────────────────────────────────────────────────────

def test_student_stats(ctx):
    client, sf = ctx
    db = sf()
    users = seed_roster(db)
    make_material(db, users["subject"], users["teacher"], "notes.pdf")
    make_material(db, users["subject"], users["teacher"], "slides.pdf")
    mock_auth(users["s1"])

    res = client.get("/api/students/me/stats")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["quizzes_taken"] == 2
    assert data["avg_score"] == 100
    assert data["weak_topics_count"] == 0
    assert len(data["recent_materials"]) == 2
    assert {m["filename"] for m in data["recent_materials"]} == {"notes.pdf", "slides.pdf"}
    assert all(m["teacher_name"] == "t@examai.com" for m in data["recent_materials"])


def test_student_stats_weak_topic_count(ctx):
    client, sf = ctx
    db = sf()
    users = seed_physics(db)
    quiz = make_quiz(db, users["subject"], users["teacher"])
    mock_auth(users["s1"])
    client.post("/api/quiz-attempts", json={"quiz_id": str(quiz.id), "answers": {str(quiz.questions[0].id): "5"}})

    data = client.get("/api/students/me/stats").json()["data"]
    assert data["quizzes_taken"] == 1
    assert data["avg_score"] == 0
    assert data["weak_topics_count"] == 1


def test_student_subject_cards(ctx):
    client, sf = ctx
    db = sf()
    users = seed_roster(db)
    mock_auth(users["s1"])

    res = client.get("/api/students/me/subjects")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    card = data[0]
    assert card["name"] == "Physics"
    assert {t["name"] for t in card["teachers"]} == {"t@examai.com", "t2@examai.com"}
    assert card["progress"] == 100  # attempted both published quizzes


def test_student_subject_cards_zero_published(ctx):
    client, sf = ctx
    db = sf()
    users = seed_physics(db)
    mock_auth(users["s1"])
    data = client.get("/api/students/me/subjects").json()["data"]
    assert data[0]["progress"] is None  # no published quizzes yet


def test_teacher_subject_tabs(ctx):
    client, sf = ctx
    db = sf()
    users = seed_physics(db)
    mock_auth(users["teacher"])

    res = client.get("/api/teachers/me/subjects")
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) == 1
    tab = data[0]
    assert tab["subject_id"] == str(users["subject"].id)
    assert tab["name"] == "Physics"
    assert {t["name"] for t in tab["teachers"]} == {"t@examai.com", "t2@examai.com"}


# ── Student materials endpoint ────────────────────────────────────────────────

def test_student_materials_pagination_and_filters(ctx):
    client, sf = ctx
    db = sf()
    users = seed_two_subjects(db)
    # Biology is a subject no student here is enrolled in.
    biology = make_subject(db, "Biology")
    make_material(db, users["physics"], users["t1"], "a.pdf")
    make_material(db, users["physics"], users["t1"], "b.pdf")
    make_material(db, users["physics"], users["t1"], "c.pdf")
    make_material(db, users["physics"], users["t1"], "pending.pdf", "processing")
    make_material(db, users["chemistry"], users["t2"], "secret.pdf")
    # A material in an unenrolled subject must never surface.
    make_material(db, biology, users["t1"], "alien.pdf")
    mock_auth(users["s1"])

    res = client.get("/api/students/me/materials?size=2&page=1")
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["total"] == 4  # 3 physics + 1 chemistry, no processing, no Biology
    assert data["pages"] == 2
    assert data["page"] == 1 and data["size"] == 2
    assert len(data["items"]) == 2
    assert {m["filename"] for m in data["items"]} <= {"a.pdf", "b.pdf", "c.pdf", "secret.pdf"}

    # subject filter narrows to the enrolled subject.
    res = client.get(f"/api/students/me/materials?subject_id={users['physics'].id}")
    assert res.json()["data"]["total"] == 3

    # teacher filter.
    res = client.get(f"/api/students/me/materials?teacher_id={users['t2'].id}")
    assert res.json()["data"]["total"] == 1

    # search matches filename.
    res = client.get("/api/students/me/materials?search=a.pdf")
    assert res.json()["data"]["total"] == 1


def test_student_materials_rejects_unenrolled_subject(ctx):
    client, sf = ctx
    db = sf()
    users = seed_two_subjects(db)
    mock_auth(users["s1"])
    res = client.get(f"/api/students/me/materials?subject_id={users['chemistry'].id}")
    assert res.status_code == 200
    assert res.json()["data"]["total"] == 0  # s1 IS enrolled in chemistry here

    mock_auth(users["s2"])
    res = client.get(f"/api/students/me/materials?subject_id={users['physics'].id}")
    assert res.status_code == 403  # not enrolled


# ── Role guards ───────────────────────────────────────────────────────────────

def test_analytics_endpoints_require_teacher_role(ctx):
    client, sf = ctx
    db = sf()
    users = seed_physics(db)
    mock_auth(users["s1"])

    assert client.get("/api/analytics?quiz_id=%s" % uuid.uuid4()).status_code == 403
    assert client.get("/api/student-progress").status_code == 403
    assert client.get("/api/teacher/dashboard-stats").status_code == 403


def test_student_endpoints_require_student_role(ctx):
    client, sf = ctx
    db = sf()
    users = seed_physics(db)
    mock_auth(users["teacher"])

    assert client.get("/api/students/me/stats").status_code == 403
    assert client.get("/api/students/me/subjects").status_code == 403
    assert client.get("/api/students/me/materials").status_code == 403
