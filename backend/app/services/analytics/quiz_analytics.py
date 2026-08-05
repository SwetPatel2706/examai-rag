"""Per-quiz analytics — question accuracy, grade distribution, weak topics.

Read model over one quiz's attempts. The requesting teacher must belong to the
quiz's subject (`check_subject_access`); unauthorized teachers get 403.
"""
from collections import Counter
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models.quiz import Quiz, QuizAttempt
from app.models.subject import StudentSubject
from app.models.user import User
from app.schemas.analytics import (
    GradeBandOut,
    QuestionAccuracyOut,
    QuizAnalyticsOut,
    WeakTopicOut,
)
from app.services.subject_service import check_subject_access

# Canonical, documented grade bands. Scores are integer percentages 0–100.
GRADE_BANDS = (
    ("A", 90, 100),
    ("B", 80, 89),
    ("C", 70, 79),
    ("D", 60, 69),
    ("F", 0, 59),
)


def _grade_band(score: int) -> str:
    for band, low, high in GRADE_BANDS:
        if low <= score <= high:
            return band
    return "F"


def _grade_distribution(scores: list[int]) -> list[GradeBandOut]:
    total = len(scores)
    counts = Counter(_grade_band(score) for score in scores)
    bands = []
    for band, low, high in GRADE_BANDS:
        count = counts.get(band, 0)
        pct = round(count / total * 100) if total else 0
        bands.append(
            GradeBandOut(band=band, min_score=low, max_score=high, count=count, pct=pct)
        )
    return bands


def get_quiz_analytics(db: Session, user: User, quiz_id: UUID) -> QuizAnalyticsOut:
    quiz = (
        db.query(Quiz)
        .options(joinedload(Quiz.questions), joinedload(Quiz.subject))
        .filter(Quiz.id == quiz_id)
        .first()
    )
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    # Teacher membership on the quiz's subject — the quiz always belongs to
    # its own subject, so this single gate covers both plan requirements.
    check_subject_access(db, quiz.subject_id, user)

    class_size = (
        db.query(StudentSubject)
        .filter(StudentSubject.subject_id == quiz.subject_id)
        .count()
    )

    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).all()
    attempt_count = len(attempts)
    empty = attempt_count == 0

    scores = [attempt.score for attempt in attempts]
    avg_score = round(sum(scores) / len(scores)) if scores else None
    completion_pct = round(attempt_count / class_size * 100) if class_size else 0

    # Question accuracy. Denominator is attempt count: a validated attempt
    # always answers every question (enforced by grading_service), so no
    # per-question "answered" variance exists.
    question_accuracy = []
    for question in quiz.questions:
        correct = sum(
            1
            for attempt in attempts
            if (attempt.answers or {}).get(str(question.id)) == question.correct_option
        )
        accuracy = round(correct / attempt_count * 100) if attempt_count else None
        question_accuracy.append(
            QuestionAccuracyOut(
                question_id=question.id,
                question_text=question.question_text,
                topic_tag=question.topic_tag,
                accuracy=accuracy,
                correct_count=correct,
                total=attempt_count,
            )
        )

    # Class-level weak topics: aggregate correct/total per topic_tag across
    # attempts. A topic is weak when its accuracy is below the configured
    # threshold. Reuses the frozen question rows + stored answers, the same
    # source the per-student weak topics come from.
    weak_topics = _aggregate_weak_topics(question_accuracy, attempt_count)
    return QuizAnalyticsOut(
        quiz_id=quiz.id,
        quiz_topic=quiz.topic,
        subject_id=quiz.subject_id,
        subject_name=quiz.subject.name if quiz.subject else None,
        class_size=class_size,
        attempt_count=attempt_count,
        completion_pct=completion_pct,
        avg_score=avg_score,
        grade_distribution=_grade_distribution(scores),
        question_accuracy=question_accuracy,
        weak_topics=weak_topics,
        empty=empty,
    )


def _aggregate_weak_topics(
    question_accuracy: list[QuestionAccuracyOut], attempt_count: int
) -> list[WeakTopicOut]:
    by_topic: dict[str, dict] = {}
    for item in question_accuracy:
        if not item.topic_tag:
            continue
        stats = by_topic.setdefault(item.topic_tag, {"correct": 0, "total": 0, "questions": 0})
        stats["correct"] += item.correct_count
        stats["total"] += item.total
        stats["questions"] += 1

    weak = []
    for topic, stats in by_topic.items():
        accuracy = round(stats["correct"] / stats["total"] * 100) if stats["total"] else None
        if accuracy is None:
            continue
        if accuracy < settings.WEAK_TOPIC_ACCURACY_THRESHOLD:
            weak.append(
                WeakTopicOut(
                    topic=topic,
                    accuracy=accuracy,
                    question_count=stats["questions"],
                    attempt_count=attempt_count,
                )
            )
    weak.sort(key=lambda item: item.accuracy)
    return weak
