import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.user import User
from app.models.subject import Subject
from app.models.material import Material
from app.models.quiz import Quiz, QuizQuestion
from app.auth.supabase_client import SupabaseAuthClient, SupabaseUserLookupIncompleteError
from app.utils.qdrant_client import QdrantStore
from app.seed import apply_material_updates, apply_quiz_updates


@pytest.mark.asyncio
async def test_admin_get_user_by_email_paginates():
    client = SupabaseAuthClient()
    async with client.client:
        page1_users = [{"email": f"user{i}@example.com", "id": str(uuid.uuid4())} for i in range(50)]
        target_user = {"email": "target@example.com", "id": str(uuid.uuid4())}
        page2_users = [target_user]

        async def mock_get(url, headers):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            if "page=1&" in url or "page=1" in url and "per_page" in url:
                mock_resp.json.return_value = page1_users
            elif "page=2&" in url or "page=2" in url and "per_page" in url:
                mock_resp.json.return_value = page2_users
            else:
                mock_resp.json.return_value = []
            return mock_resp

        client.client.get = AsyncMock(side_effect=mock_get)
        result = await client._admin_get_user_by_email("target@example.com")
        assert result == target_user


@pytest.mark.asyncio
async def test_admin_get_user_by_email_incomplete_scans_and_logging(caplog):
    client = SupabaseAuthClient()
    async with client.client:
        # 1. Non-200 HTTP response
        mock_resp_500 = MagicMock()
        mock_resp_500.status_code = 500
        client.client.get = AsyncMock(return_value=mock_resp_500)
        with pytest.raises(SupabaseUserLookupIncompleteError, match="HTTP 500"):
            await client._admin_get_user_by_email("target@example.com")
        assert "target@example.com" not in caplog.text
        assert "HTTP 500" in caplog.text

        caplog.clear()

        # 2. Non-JSON response
        mock_resp_nonjson = MagicMock()
        mock_resp_nonjson.status_code = 200
        mock_resp_nonjson.json.side_effect = ValueError("Invalid JSON string")
        client.client.get = AsyncMock(return_value=mock_resp_nonjson)
        with pytest.raises(SupabaseUserLookupIncompleteError, match="invalid JSON: ValueError"):
            await client._admin_get_user_by_email("target@example.com")
        assert "target@example.com" not in caplog.text
        assert "ValueError" in caplog.text

        # 3. Max pages limit reached (Page 100 full -> attempt page 101 raise)
        full_page = [{"email": f"user_{i}@example.com", "id": str(uuid.uuid4())} for i in range(50)]
        mock_resp_full = MagicMock()
        mock_resp_full.status_code = 200
        mock_resp_full.json.return_value = full_page
        client.client.get = AsyncMock(return_value=mock_resp_full)

        with pytest.raises(SupabaseUserLookupIncompleteError, match=r"reached max_pages limit \(100\)"):
            await client._admin_get_user_by_email("target@example.com")
        assert client.client.get.call_count == 100


@pytest.mark.asyncio
async def test_admin_get_user_by_email_found_on_page_100():
    client = SupabaseAuthClient()
    async with client.client:
        full_page = [{"email": f"user_{i}@example.com", "id": str(uuid.uuid4())} for i in range(50)]
        target_user = {"email": "target@example.com", "id": str(uuid.uuid4())}
        page100 = full_page[:-1] + [target_user]

        async def mock_get(url, headers):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            if "page=100" in url:
                mock_resp.json.return_value = page100
            else:
                mock_resp.json.return_value = full_page
            return mock_resp

        client.client.get = AsyncMock(side_effect=mock_get)
        user = await client._admin_get_user_by_email("target@example.com")
        assert user == target_user
        assert client.client.get.call_count == 100


def test_qdrant_ensure_collection_single_unnamed_vector():
    store = QdrantStore(client=MagicMock())
    mock_vectors = {"": MagicMock(size=384)}
    mock_info = MagicMock()
    mock_info.config.params.vectors = mock_vectors
    store.client.get_collection.return_value = mock_info

    store.ensure_collection(384)

    with pytest.raises(ValueError, match="does not match embedding dimension"):
        store.ensure_collection(512)


def test_qdrant_ensure_collection_rejects_named_or_multiple_vectors():
    store = QdrantStore(client=MagicMock())
    
    # Test multiple named vectors
    mock_vectors_multiple = {"dense": MagicMock(size=384), "sparse": MagicMock(size=384)}
    mock_info = MagicMock()
    mock_info.config.params.vectors = mock_vectors_multiple
    store.client.get_collection.return_value = mock_info

    with pytest.raises(ValueError, match="uses multiple or named vectors"):
        store.ensure_collection(384)

    # Test single named vector (non-empty name)
    mock_vectors_single = {"dense": MagicMock(size=384)}
    mock_info.config.params.vectors = mock_vectors_single
    
    with pytest.raises(ValueError, match="uses multiple or named vectors"):
        store.ensure_collection(384)


def test_seed_reconciles_existing_material_and_quiz_fields():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    teacher = User(id=uuid.uuid4(), email="teacher@example.com", role="teacher", name="Dr. Smith")
    subject = Subject(id=uuid.uuid4(), name="Computer Science")
    session.add_all([teacher, subject])
    session.commit()

    material = Material(
        subject_id=subject.id,
        teacher_id=teacher.id,
        filename="lecture1.pdf",
        file_type="txt",
        storage_path="old/path",
        status="processing",
        display_name="Old Name",
        notes="Old Notes",
    )
    session.add(material)

    quiz = Quiz(
        subject_id=subject.id,
        teacher_id=teacher.id,
        topic="Algorithms",
        source="manual",
        status="draft",
        time_limit_seconds=600,
    )
    quiz.questions = [
        QuizQuestion(question_text="Q1", options=["A", "B"], correct_option="A", seed_key="Algorithms::q0"),
        QuizQuestion(question_text="Q2", options=["C", "D"], correct_option="C", seed_key="Algorithms::q1"),
    ]
    session.add(quiz)
    session.commit()

    q1_id = quiz.questions[0].id
    q2_id = quiz.questions[1].id

    mat_data = {
        "filename": "lecture1.pdf",
        "file_type": "pdf",
        "status": "ready",
        "display_name": "New Name",
        "notes": "New Notes",
    }
    apply_material_updates(material, mat_data)
    session.commit()

    assert material.status == "ready"
    assert material.file_type == "pdf"
    assert material.storage_path == "materials/lecture1.pdf"
    assert material.display_name == "New Name"
    assert material.notes == "New Notes"

    quiz_data = {
        "topic": "Algorithms",
        "source": "manual",
        "status": "published",
        "time_limit_seconds": 1200,
        "questions": [
            {
                "question_text": "Updated Q1",
                "options": ["X", "Y"],
                "correct_option": "X",
                "topic_tag": "UpdatedTag",
                "difficulty": "hard",
            },
            {
                "question_text": "Q2",
                "options": ["1", "2"],
                "correct_option": "1",
                "topic_tag": "StableTag",
                "difficulty": "easy",
            },
        ],
    }
    apply_quiz_updates(quiz, quiz_data)
    session.commit()

    assert quiz.status == "published"
    assert quiz.time_limit_seconds == 1200
    assert len(quiz.questions) == 2

    session.expire_all()
    reloaded_quiz = session.query(Quiz).filter_by(topic="Algorithms").first()
    by_key = {q.seed_key: q for q in reloaded_quiz.questions}

    updated = by_key["Algorithms::q0"]
    assert updated.id == q1_id
    assert updated.question_text == "Updated Q1"
    assert updated.options == ["X", "Y"]
    assert updated.correct_option == "X"
    assert updated.topic_tag == "UpdatedTag"
    assert updated.difficulty == "hard"

    unchanged = by_key["Algorithms::q1"]
    assert unchanged.id == q2_id
    assert unchanged.question_text == "Q2"
    assert unchanged.options == ["1", "2"]
    assert unchanged.correct_option == "1"
    assert unchanged.topic_tag == "StableTag"
    assert unchanged.difficulty == "easy"
    assert {q.id for q in reloaded_quiz.questions} == {q1_id, q2_id}

    session.close()
