from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.quiz import QuizAttempt, QuizQuestion
from app.models.user import User
from app.schemas.quiz import (
    QuizAttemptQuestionResult,
    QuizAttemptResponse,
    WeakTopicOut,
)
from app.services.quiz.manual_service import get_student_quiz


def _normalize_answers(question_map: dict[str, QuizQuestion], answers: dict[str, str]) -> dict[str, str]:
    """Validate every answer references a real question and a valid option."""
    normalized: dict[str, str] = {}
    for question_id, selected in answers.items():
        question = question_map.get(str(question_id))
        if question is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Answer references an unknown question: {question_id}",
            )
        if selected not in question.options:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Answer for question {question_id} is not one of its options",
            )
        normalized[str(question_id)] = selected
    return normalized


def compute_weak_topics(question_map: dict[str, QuizQuestion], answers: dict[str, str]) -> list[dict]:
    """Per-topic accuracy for answered questions that carry a topic_tag.
    Any topic with less than 100% accuracy is a weak topic. Untagged
    questions contribute to the score but not to weak-topic breakdown."""
    by_topic: dict[str, dict] = {}
    for question_id, question in question_map.items():
        if not question.topic_tag:
            continue
        if question_id in answers:
            stats = by_topic.setdefault(question.topic_tag, {"correct": 0, "total": 0})
            stats["total"] += 1
            if answers[question_id] == question.correct_option:
                stats["correct"] += 1

    weak_topics = []
    for topic, stats in by_topic.items():
        accuracy = round(stats["correct"] / stats["total"] * 100)
        if accuracy < 100:
            weak_topics.append({"topic": topic, "accuracy": accuracy})
    return weak_topics


def submit_attempt(db: Session, student: User, quiz_id: UUID, answers: dict[str, str]) -> QuizAttempt:
    """Grade and persist one attempt per (quiz, student).

    Idempotency: a retry after the first success is detected before grading
    and the existing attempt is returned. A concurrent retry that slips past
    the read hits the UNIQUE (quiz_id, student_id) constraint; the
    IntegrityError is caught and mapped back to the existing attempt.
    Atomicity: score, answers, and submitted_at are written in a single
    transaction — a mid-flight failure leaves no half-written row.
    """
    quiz = get_student_quiz(db, student, quiz_id)
    student_id = student.id

    existing = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == student_id)
        .first()
    )
    if existing:
        return existing

    question_map = {str(q.id): q for q in quiz.questions}
    normalized = _normalize_answers(question_map, answers)

    total = len(question_map)
    correct_count = sum(
        1 for question_id, question in question_map.items()
        if normalized.get(question_id) == question.correct_option
    )
    score = round(correct_count / total * 100) if total else 0
    weak_topics = compute_weak_topics(question_map, normalized)

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=student_id,
        answers=normalized,
        score=score,
        weak_topics=weak_topics,
    )
    db.add(attempt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.student_id == student_id)
            .first()
        )
        if existing:
            return existing
        raise
    db.refresh(attempt)
    return attempt


def list_own_attempts(
    db: Session,
    student: User,
    quiz_id: UUID | None = None,
) -> list[QuizAttempt]:
    """The student's own attempts, newest first. Optional quiz_id filter.
    Never returns another student's rows."""
    query = db.query(QuizAttempt).filter(QuizAttempt.student_id == student.id)
    if quiz_id is not None:
        query = query.filter(QuizAttempt.quiz_id == quiz_id)
    return query.order_by(QuizAttempt.submitted_at.desc(), QuizAttempt.id.desc()).all()


def get_own_attempt(db: Session, student: User, attempt_id: UUID) -> QuizAttempt:
    attempt = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.id == attempt_id, QuizAttempt.student_id == student.id)
        .first()
    )
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
    return attempt


def serialize_attempt(attempt: QuizAttempt) -> QuizAttemptResponse:
    """Build the student's own result: their score, their answers/feedback,
    and their weak topics — no classmate data."""
    quiz = attempt.quiz
    answers = attempt.answers or {}
    question_results = [
        QuizAttemptQuestionResult(
            question_id=question.id,
            question_text=question.question_text,
            options=question.options,
            correct_option=question.correct_option,
            selected_option=answers.get(str(question.id)),
            is_correct=answers.get(str(question.id)) == question.correct_option,
        )
        for question in quiz.questions
    ]
    return QuizAttemptResponse(
        id=attempt.id,
        quiz_id=attempt.quiz_id,
        student_id=attempt.student_id,
        quiz_title=quiz.topic,
        subject_name=quiz.subject.name if quiz.subject else None,
        answers=answers,
        score=attempt.score,
        correct_count=sum(1 for result in question_results if result.is_correct),
        total_questions=len(question_results),
        weak_topics=[WeakTopicOut(**item) for item in (attempt.weak_topics or [])],
        submitted_at=attempt.submitted_at,
        questions=question_results,
    )
