"""Shared test helpers for the ExamAI backend suite.

The in-memory SQLite DB setup and the ``get_db``/``get_current_user``
dependency overrides are intentionally *not* here: each test module manages
its own ``ctx`` fixture so overrides never leak across modules.
"""
import uuid

from app.models.material import Material
from app.models.quiz import Quiz, QuizAttempt, QuizQuestion
from app.models.subject import Subject
from app.models.user import User
from app.main import app
from app.auth.dependencies import get_current_user


def mock_auth(user: User):
    app.dependency_overrides[get_current_user] = lambda: user


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


def make_quiz(db, subject: Subject, teacher: User, status: str = "published", topic: str = "Kinematics", source: str = "manual") -> Quiz:
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
