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
from app.auth.supabase_client import SupabaseAuthClient
from app.utils.qdrant_client import QdrantStore
from app.seed import apply_material_updates, apply_quiz_updates


@pytest.mark.asyncio
async def test_admin_get_user_by_email_paginates():
    client = SupabaseAuthClient()
    page1_users = [{"email": f"user{i}@example.com", "id": str(uuid.uuid4())} for i in range(50)]
    target_user = {"email": "target@example.com", "id": str(uuid.uuid4())}
    page2_users = [target_user]

    async def mock_get(url, headers):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        if "page=1" in url:
            mock_resp.json.return_value = page1_users
        elif "page=2" in url:
            mock_resp.json.return_value = page2_users
        else:
            mock_resp.json.return_value = []
        return mock_resp

    client.client.get = AsyncMock(side_effect=mock_get)
    result = await client._admin_get_user_by_email("target@example.com")
    assert result == target_user


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
    quiz.questions = [QuizQuestion(question_text="Q1", options=["A", "B"], correct_option="A")]
    session.add(quiz)
    session.commit()

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

    quiz_data = {
        "topic": "Algorithms",
        "source": "manual",
        "status": "published",
        "time_limit_seconds": 1200,
        "questions": [
            {"question_text": "Updated Q1", "options": ["X", "Y"], "correct_option": "X"},
            {"question_text": "Q2", "options": ["1", "2"], "correct_option": "1"},
        ],
    }
    apply_quiz_updates(quiz, quiz_data)
    session.commit()

    assert quiz.status == "published"
    assert quiz.time_limit_seconds == 1200
    assert len(quiz.questions) == 2
    assert quiz.questions[0].question_text == "Updated Q1"

    session.close()
