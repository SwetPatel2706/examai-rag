import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.main import app
from app.models.user import User
from app.models.subject import Subject, SubjectTeacher, StudentSubject
from app.models.quiz import Quiz, QuizAttempt, QuizQuestion
from app.schemas.quiz import QuizQuestionLLMItem, QuizQuestionLLMOutput
from app.services.quiz.ai_generate_service import AIQuizGenerateService
from app.services.rag.retriever import RetrievedChunk, authorize_materials

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"


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


def make_subject(db, name: str = "Physics") -> Subject:
    subject = Subject(name=name)
    db.add(subject)
    db.commit()
    return subject


def make_quiz(db, subject: Subject, teacher: User, status: str = "draft", topic: str = "Kinematics", source: str = "manual") -> Quiz:
    quiz = Quiz(
        subject_id=subject.id,
        teacher_id=teacher.id,
        topic=topic,
        source=source,
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


def question_payload(text: str = "What is 2+2?", options=None, correct: str = "4", topic: str = "Arithmetic", difficulty: str = "easy") -> dict:
    return {
        "question_text": text,
        "options": options or ["3", "4", "5", "6"],
        "correct_option": correct,
        "topic_tag": topic,
        "difficulty": difficulty,
    }


def quiz_payload(subject_id, topic: str = "Math Basics", source: str = "manual", time_limit: int = 600, questions=None) -> dict:
    return {
        "subject_id": str(subject_id),
        "topic": topic,
        "source": source,
        "time_limit_seconds": time_limit,
        "questions": questions
        or [
            question_payload(),
            question_payload("What is 3+3?", ["5", "6", "7", "8"], "6", "Arithmetic", "medium"),
        ],
    }


def seed_subject(db):
    """teacher + co-teacher + subject + enrolled student + outsider."""
    teacher = make_user(db, "teacher", "t@examai.com")
    co_teacher = make_user(db, "teacher", "t2@examai.com")
    student = make_user(db, "student", "s1@examai.com")
    outsider = make_user(db, "student", "s2@examai.com")
    subject = make_subject(db)
    db.add(SubjectTeacher(subject_id=subject.id, teacher_id=teacher.id))
    db.add(SubjectTeacher(subject_id=subject.id, teacher_id=co_teacher.id))
    db.add(StudentSubject(subject_id=subject.id, student_id=student.id))
    db.commit()
    return {"teacher": teacher, "co_teacher": co_teacher, "student": student, "outsider": outsider, "subject": subject}


# ── Teacher authoring flows ───────────────────────────────────────────────────

def test_teacher_creates_manual_draft_quiz(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    mock_auth(users["teacher"])

    res = client.post("/api/quizzes", json=quiz_payload(users["subject"].id))
    assert res.status_code == 201
    data = res.json()["data"]
    assert data["topic"] == "Math Basics"
    assert data["source"] == "manual"
    assert data["status"] == "draft"
    assert data["time_limit_seconds"] == 600
    assert len(data["questions"]) == 2
    assert data["questions"][0]["correct_option"] == "4"


def test_create_quiz_rejects_malformed_questions(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    mock_auth(users["teacher"])

    malformed = [
        (question_payload(options=["only"]), "single option"),
        (question_payload(options=["3", "4"], correct="5"), "correct not in options"),
        (question_payload(options=["3", "3", "4"], correct="3"), "duplicate options"),
        (question_payload(options=["3", "", "4"], correct="3"), "blank option"),
        (question_payload(difficulty="impossible"), "bad difficulty"),
    ]
    for question, label in malformed:
        res = client.post("/api/quizzes", json=quiz_payload(users["subject"].id, questions=[question]))
        assert res.status_code == 422, f"{label}: expected 422, got {res.status_code}"


def test_teacher_updates_draft(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    mock_auth(users["teacher"])
    created = client.post("/api/quizzes", json=quiz_payload(users["subject"].id)).json()["data"]
    quiz_id = created["id"]

    res = client.patch(
        f"/api/quizzes/{quiz_id}",
        json={
            "topic": "Updated Topic",
            "time_limit_seconds": 300,
            "questions": [question_payload("What is 9+1?", ["9", "10", "11", "12"], "10", "Arithmetic", "hard")],
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["topic"] == "Updated Topic"
    assert data["time_limit_seconds"] == 300
    assert len(data["questions"]) == 1
    assert data["questions"][0]["correct_option"] == "10"


def test_teacher_deletes_draft(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    mock_auth(users["teacher"])
    created = client.post("/api/quizzes", json=quiz_payload(users["subject"].id)).json()["data"]

    res = client.delete(f"/api/quizzes/{created['id']}")
    assert res.status_code == 200
    assert res.json()["data"]["deleted"] is True

    res = client.get(f"/api/quizzes/{created['id']}")
    assert res.status_code == 404


def test_publish_quiz_and_idempotent_publish(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    mock_auth(users["teacher"])
    created = client.post("/api/quizzes", json=quiz_payload(users["subject"].id)).json()["data"]

    res = client.post(f"/api/quizzes/{created['id']}/publish")
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "published"

    res2 = client.post(f"/api/quizzes/{created['id']}/publish")
    assert res2.status_code == 200
    assert res2.json()["data"]["status"] == "published"


def test_cannot_publish_quiz_without_questions(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    mock_auth(users["teacher"])
    res = client.post("/api/quizzes", json={"subject_id": str(users["subject"].id), "topic": "Empty", "questions": []})
    assert res.status_code == 422

    # A quiz created with questions cannot be emptied into nothing.
    created = client.post("/api/quizzes", json=quiz_payload(users["subject"].id)).json()["data"]
    empty_quiz = Quiz(id=uuid.uuid4(), subject_id=users["subject"].id, teacher_id=users["teacher"].id, topic="No Qs", source="manual", status="draft")
    db.add(empty_quiz)
    db.commit()
    res = client.post(f"/api/quizzes/{empty_quiz.id}/publish")
    assert res.status_code == 400


def test_teacher_authorization_rules(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    outsider_teacher = make_user(db, "teacher", "outsider-teacher@examai.com")

    # Teacher outside the subject cannot create a quiz for it.
    mock_auth(outsider_teacher)
    res = client.post("/api/quizzes", json=quiz_payload(users["subject"].id))
    assert res.status_code == 403

    # Author can edit; co-teacher can view but not edit.
    mock_auth(users["teacher"])
    created = client.post("/api/quizzes", json=quiz_payload(users["subject"].id)).json()["data"]

    mock_auth(users["co_teacher"])
    res = client.get(f"/api/quizzes/{created['id']}")
    assert res.status_code == 200
    res = client.patch(f"/api/quizzes/{created['id']}", json={"topic": "Hijack"})
    assert res.status_code == 403


def test_teacher_list_and_detail_include_correct_option(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    make_quiz(db, users["subject"], users["teacher"], status="draft")
    make_quiz(db, users["subject"], users["teacher"], status="published")
    mock_auth(users["teacher"])

    res = client.get("/api/quizzes")
    assert res.status_code == 200
    quizzes = res.json()["data"]
    assert len(quizzes) == 2  # draft + published both visible to the teacher
    assert {q["status"] for q in quizzes} == {"draft", "published"}
    assert all(q["question_count"] == 1 for q in quizzes)

    detail = client.get(f"/api/quizzes/{quizzes[0]['id']}").json()["data"]
    assert "correct_option" in detail["questions"][0]


# ── Student visibility ────────────────────────────────────────────────────────

def test_student_sees_only_published_quizzes_for_enrolled_subjects(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    make_quiz(db, users["subject"], users["teacher"], status="draft")
    make_quiz(db, users["subject"], users["teacher"], status="published")
    make_quiz(db, users["subject"], users["teacher"], status="published", topic="Second")

    mock_auth(users["student"])
    res = client.get("/api/quizzes")
    assert res.status_code == 200
    quizzes = res.json()["data"]
    assert len(quizzes) == 2
    assert all(q["status"] == "published" for q in quizzes)

    # Unenrolled student sees nothing.
    mock_auth(users["outsider"])
    res = client.get("/api/quizzes")
    assert res.json()["data"] == []


def test_student_detail_never_leaks_correct_option(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    published = make_quiz(db, users["subject"], users["teacher"], status="published")
    mock_auth(users["student"])

    res = client.get(f"/api/quizzes/{published.id}")
    assert res.status_code == 200
    data = res.json()["data"]
    question = data["questions"][0]
    assert "question_text" in question
    assert "options" in question
    assert "correct_option" not in question
    assert "correct" not in question


def test_student_cannot_see_draft_quiz_and_outsider_gets_403(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    draft = make_quiz(db, users["subject"], users["teacher"], status="draft")

    mock_auth(users["student"])
    res = client.get(f"/api/quizzes/{draft.id}")
    assert res.status_code == 404  # hidden, not leaked

    mock_auth(users["outsider"])
    res = client.get(f"/api/quizzes/{draft.id}")
    assert res.status_code == 403


# ── Attempts: grading, idempotency, atomicity ─────────────────────────────────

def _published_quiz(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    published = make_quiz(db, users["subject"], users["teacher"], status="published")
    # Keep `db` alive for the test's duration: ORM instances only weakly
    # reference their session, so an unreferenced session is GC'd and its
    # objects detach.
    return client, db, sf, users, published


def test_student_submits_attempt_and_gets_server_computed_score(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["student"])

    res = client.post(
        "/api/quiz-attempts",
        json={"quiz_id": str(published.id), "answers": {str(published.questions[0].id): "4"}},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["score"] == 100
    assert data["correct_count"] == 1
    assert data["total_questions"] == 1
    assert data["questions"][0]["is_correct"] is True
    assert data["questions"][0]["correct_option"] == "4"  # own-result feedback
    assert data["weak_topics"] == []  # 100% accuracy => nothing weak
    assert data["submitted_at"]


def test_client_supplied_score_is_ignored(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["student"])

    res = client.post(
        "/api/quiz-attempts",
        json={"quiz_id": str(published.id), "answers": {str(published.questions[0].id): "4"}, "score": 0},
    )
    assert res.status_code == 200
    assert res.json()["data"]["score"] == 100


def test_duplicate_submission_returns_existing_attempt(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["student"])
    payload = {"quiz_id": str(published.id), "answers": {str(published.questions[0].id): "4"}}

    first = client.post("/api/quiz-attempts", json=payload).json()["data"]
    second = client.post("/api/quiz-attempts", json=payload).json()["data"]

    assert first["id"] == second["id"]
    assert first["score"] == second["score"] == 100
    rows = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == published.id).all()
    assert len(rows) == 1


def test_client_retry_after_simulated_timeout_is_idempotent(ctx):
    """A client that times out and retries the same submission gets the same
    attempt (200, not 409, not a duplicate row)."""
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["student"])
    payload = {"quiz_id": str(published.id), "answers": {str(published.questions[0].id): "3"}}

    first = client.post("/api/quiz-attempts", json=payload)
    retry = client.post("/api/quiz-attempts", json=payload)

    assert first.status_code == 200 and retry.status_code == 200
    assert first.json()["data"]["id"] == retry.json()["data"]["id"]
    assert db.query(QuizAttempt).count() == 1


def test_score_recalculation_when_endpoint_called_twice(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["student"])
    payload = {"quiz_id": str(published.id), "answers": {str(published.questions[0].id): "5"}}

    first = client.post("/api/quiz-attempts", json=payload).json()["data"]
    second = client.post("/api/quiz-attempts", json=payload).json()["data"]

    assert first["score"] == second["score"] == 0
    assert first["questions"][0]["is_correct"] is False
    assert len(second["questions"]) == len(first["questions"])


def test_attempt_rejects_invalid_answers(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["student"])

    bogus_question = uuid.uuid4()
    res = client.post(
        "/api/quiz-attempts",
        json={"quiz_id": str(published.id), "answers": {str(bogus_question): "4"}},
    )
    assert res.status_code == 400

    res = client.post(
        "/api/quiz-attempts",
        json={"quiz_id": str(published.id), "answers": {str(published.questions[0].id): "not-an-option"}},
    )
    assert res.status_code == 400


def test_student_cannot_submit_to_draft_or_unenrolled_quiz(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    draft = make_quiz(db, users["subject"], users["teacher"], status="draft")
    payload = {"quiz_id": str(published.id), "answers": {}}

    mock_auth(users["student"])
    res = client.post("/api/quiz-attempts", json={"quiz_id": str(draft.id), "answers": {}})
    assert res.status_code == 404

    mock_auth(users["outsider"])
    res = client.post("/api/quiz-attempts", json=payload)
    assert res.status_code == 403


def test_student_can_only_read_own_attempt(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["student"])
    attempt = client.post(
        "/api/quiz-attempts",
        json={"quiz_id": str(published.id), "answers": {str(published.questions[0].id): "4"}},
    ).json()["data"]

    res = client.get(f"/api/quiz-attempts/{attempt['id']}")
    assert res.status_code == 200
    assert res.json()["data"]["id"] == attempt["id"]

    mock_auth(users["outsider"])
    res = client.get(f"/api/quiz-attempts/{attempt['id']}")
    assert res.status_code == 404


def test_weak_topics_only_from_tagged_questions(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    quiz = Quiz(
        subject_id=users["subject"].id,
        teacher_id=users["teacher"].id,
        topic="Mixed",
        source="manual",
        status="published",
    )
    quiz.questions = [
        QuizQuestion(question_text="Q1", options=["A", "B"], correct_option="A", topic_tag="Vectors", difficulty="easy"),
        QuizQuestion(question_text="Q2", options=["C", "D"], correct_option="C", topic_tag=None, difficulty="easy"),
        QuizQuestion(question_text="Q3", options=["E", "F"], correct_option="E", topic_tag="Calculus", difficulty="easy"),
    ]
    db.add(quiz)
    db.commit()

    mock_auth(users["student"])
    answers = {str(q.id): ("B" if q.topic_tag == "Vectors" else "D" if q.topic_tag is None else "E") for q in quiz.questions}
    res = client.post("/api/quiz-attempts", json={"quiz_id": str(quiz.id), "answers": answers})
    data = res.json()["data"]
    # Untagged Q2 does not appear in weak topics; Vectors (0%) is weak, Calculus (100%) is not.
    assert data["score"] == 33
    assert [wt["topic"] for wt in data["weak_topics"]] == ["Vectors"]
    assert data["weak_topics"][0]["accuracy"] == 0


def test_unique_constraint_blocks_duplicate_attempt_at_db_level(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    db.add(QuizAttempt(quiz_id=published.id, student_id=users["student"].id, answers={}, score=0))
    db.commit()
    db.add(QuizAttempt(quiz_id=published.id, student_id=users["student"].id, answers={}, score=0))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


# ── Published quiz immutability after an attempt ──────────────────────────────

def test_edits_and_deletes_rejected_after_first_attempt(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["student"])
    client.post(
        "/api/quiz-attempts",
        json={"quiz_id": str(published.id), "answers": {str(published.questions[0].id): "4"}},
    )

    mock_auth(users["teacher"])
    res = client.patch(f"/api/quizzes/{published.id}", json={"topic": "Change"})
    assert res.status_code == 409

    res = client.delete(f"/api/quizzes/{published.id}")
    assert res.status_code == 409


def test_published_quiz_editable_before_any_attempt(ctx):
    client, db, sf, users, published = _published_quiz(ctx)
    mock_auth(users["teacher"])
    res = client.patch(f"/api/quizzes/{published.id}", json={"topic": "Still editable"})
    assert res.status_code == 200
    assert res.json()["data"]["topic"] == "Still editable"


# ── AI-assisted draft generation ──────────────────────────────────────────────

class FakeRetriever:
    def __init__(self, chunks):
        self.chunks = chunks

    def retrieve_for(self, question, db, user, subject_id, material_ids):
        return self.chunks


class FakeLLM:
    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = 0

    def generate_json(self, prompt, schema):
        self.calls += 1
        return self.outputs.pop(0)


def _llm_items(count: int) -> QuizQuestionLLMOutput:
    return QuizQuestionLLMOutput(
        questions=[
            QuizQuestionLLMItem(
                question_text=f"Question {i}?",
                options=["A", "B", "C", "D"],
                correct_option="A",
                topic_tag="Topic",
                difficulty="easy",
            )
            for i in range(count)
        ]
    )


def test_ai_generate_returns_draft_without_inserting(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    chunks = [RetrievedChunk(1, {"chunk_text": "Physics content."}, 0.9)]
    service = AIQuizGenerateService(
        retriever=FakeRetriever(chunks),
        llm=FakeLLM([_llm_items(3)]),
    )

    request = type("Req", (), {"subject_id": users["subject"].id, "material_ids": [uuid.uuid4()], "topic": "Kinematics", "question_count": 3})()
    questions = service.generate_draft(db, users["teacher"], request)

    assert len(questions) == 3
    assert questions[0].correct_option == "A"
    assert not hasattr(questions[0], "id")  # draft, not persisted
    assert db.query(Quiz).count() == 0  # nothing inserted


def test_ai_generate_retries_on_malformed_output(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    chunks = [RetrievedChunk(1, {"chunk_text": "Physics content."}, 0.9)]
    llm = FakeLLM([_llm_items(1), _llm_items(3)])  # first call wrong count
    service = AIQuizGenerateService(retriever=FakeRetriever(chunks), llm=llm)

    request = type("Req", (), {"subject_id": users["subject"].id, "material_ids": [uuid.uuid4()], "topic": "Kinematics", "question_count": 3})()
    questions = service.generate_draft(db, users["teacher"], request)

    assert llm.calls == 2  # error-aware retry fired
    assert len(questions) == 3


def test_ai_generate_rejects_invalid_output_after_retries(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    chunks = [RetrievedChunk(1, {"chunk_text": "Physics content."}, 0.9)]
    llm = FakeLLM([_llm_items(1), _llm_items(2)])
    service = AIQuizGenerateService(retriever=FakeRetriever(chunks), llm=llm)

    request = type("Req", (), {"subject_id": users["subject"].id, "material_ids": [uuid.uuid4()], "topic": "Kinematics", "question_count": 3})()
    with pytest.raises(Exception) as excinfo:
        service.generate_draft(db, users["teacher"], request)
    assert excinfo.value.status_code == 502


def test_ai_generate_requires_teacher_role(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    mock_auth(users["student"])
    res = client.post(
        "/api/quiz/generate",
        json={"subject_id": str(users["subject"].id), "material_ids": [str(uuid.uuid4())], "topic": "Kinematics", "question_count": 3},
    )
    assert res.status_code == 403


def test_ai_generate_route_returns_draft_questions(ctx, monkeypatch):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    mock_auth(users["teacher"])

    from app.schemas.quiz import QuizDraftQuestionOut

    draft = [QuizDraftQuestionOut(question_text="AI Q?", options=["1", "2", "3", "4"], correct_option="2", topic_tag="Topic", difficulty="easy")]

    class FakeService:
        def generate_draft(self, db, user, request):
            return draft

    monkeypatch.setattr("app.routes.quizzes.AIQuizGenerateService", lambda: FakeService())
    res = client.post(
        "/api/quiz/generate",
        json={"subject_id": str(users["subject"].id), "material_ids": [str(uuid.uuid4())], "topic": "Kinematics", "question_count": 1},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data["questions"]) == 1
    assert data["questions"][0]["correct_option"] == "2"


def test_generate_rejects_materials_not_ready(ctx):
    client, sf = ctx
    db = sf()
    users = seed_subject(db)
    from app.models.material import Material
    material = Material(
        id=uuid.uuid4(),
        subject_id=users["subject"].id,
        teacher_id=users["teacher"].id,
        filename="pending.pdf",
        file_type="pdf",
        storage_path="x",
        status="processing",
    )
    db.add(material)
    db.commit()

    with pytest.raises(Exception) as excinfo:
        authorize_materials(db, users["teacher"], users["subject"].id, [material.id])
    assert excinfo.value.status_code == 403
