"""Cross-quiz student progress — roster, aggregates, at-risk flag, drill-down.

Teacher-facing only. Every queried subject must be one the teacher teaches
(`subject_teachers`); unauthorized access returns 403, not 404.

Documented at-risk policy:
  - A student is `assessed` once they have at least one attempt in scope.
  - `at_risk = assessed AND (avg_score < AT_RISK_MIN_AVG_SCORE OR
    completion_pct < AT_RISK_MIN_COMPLETION_PCT)`.
  - Students with no attempts are never flagged at risk.
Completion ratio is `attempted_published_quizzes / published_quizzes_in_scope`.
"""
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.quiz import Quiz, QuizAttempt
from app.models.subject import StudentSubject, Subject
from app.models.user import User
from app.schemas.analytics import (
    QuizHistoryOut,
    StudentProgressDetailOut,
    StudentProgressRosterOut,
    StudentProgressRowOut,
)
from app.services.subject_service import get_user_subjects


def _at_risk(assessed: bool, avg_score: int | None, completion_pct: int) -> bool:
    """Documented, testable at-risk policy (see module docstring)."""
    if not assessed or avg_score is None:
        return False
    return (
        avg_score < settings.AT_RISK_MIN_AVG_SCORE
        or completion_pct < settings.AT_RISK_MIN_COMPLETION_PCT
    )


def _published_per_subject(db: Session, subject_ids: list[UUID]) -> dict[UUID, int]:
    rows = (
        db.query(Quiz.subject_id, func.count(Quiz.id))
        .filter(Quiz.subject_id.in_(subject_ids), Quiz.status == "published")
        .group_by(Quiz.subject_id)
        .all()
    )
    return dict(rows)


def _attempt_aggregates(
    db: Session, subject_ids: list[UUID], student_ids: list[UUID] | None = None
) -> dict[UUID, dict]:
    """Per-student aggregate attempts in scope via a single grouped query."""
    query = (
        db.query(
            QuizAttempt.student_id,
            func.count(QuizAttempt.id),
            func.count(func.distinct(QuizAttempt.quiz_id)),
            func.avg(QuizAttempt.score),
            func.max(QuizAttempt.submitted_at),
        )
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.subject_id.in_(subject_ids), Quiz.status == "published")
    )
    if student_ids:
        query = query.filter(QuizAttempt.student_id.in_(student_ids))
    rows = query.group_by(QuizAttempt.student_id).all()

    aggregates = {}
    for student_id, attempt_count, quiz_count, avg_score, last_active in rows:
        aggregates[student_id] = {
            "attempt_count": attempt_count,
            "quiz_count": quiz_count,
            "avg_score": round(avg_score) if avg_score is not None else None,
            "last_active": last_active,
        }
    return aggregates


def _published_in_subjects(published_per_subject: dict[UUID, int], subject_ids: list[UUID]) -> int:
    return sum(published_per_subject.get(subject_id, 0) for subject_id in subject_ids)


def at_risk_map(db: Session, teacher: User, student_ids: list[UUID]) -> dict[UUID, bool]:
    """At-risk flags for the given students across the teacher's taught subjects.

    Uses the exact roster policy so dashboard recent-activity flags stay
    consistent with the Student Progress roster. Bounded by the number of
    students passed in (no N+1)."""
    if not student_ids:
        return {}
    taught_ids = [subject.id for subject in get_user_subjects(db, teacher)]
    if not taught_ids:
        return {student_id: False for student_id in student_ids}

    published = _published_per_subject(db, taught_ids)
    aggregates = _attempt_aggregates(db, taught_ids, student_ids)

    enrollments = (
        db.query(StudentSubject.student_id, StudentSubject.subject_id)
        .filter(
            StudentSubject.student_id.in_(student_ids),
            StudentSubject.subject_id.in_(taught_ids),
        )
        .all()
    )
    student_scope: dict[UUID, set[UUID]] = {}
    for student_id, subject_id in enrollments:
        student_scope.setdefault(student_id, set()).add(subject_id)

    result = {}
    for student_id in student_ids:
        agg = aggregates.get(student_id, {})
        assessed = agg.get("attempt_count", 0) > 0
        denom = _published_in_subjects(published, sorted(student_scope.get(student_id, set())))
        completion_pct = round(agg.get("quiz_count", 0) / denom * 100) if denom else 0
        result[student_id] = _at_risk(assessed, agg.get("avg_score"), completion_pct)
    return result


def get_student_progress_roster(
    db: Session, user: User, subject_id: UUID | None = None
) -> StudentProgressRosterOut:
    taught_subjects = get_user_subjects(db, user)
    scope_ids = [subject.id for subject in taught_subjects]
    subject_names = {subject.id: subject.name for subject in taught_subjects}

    subject_name = None
    if subject_id is not None:
        if subject_id not in scope_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden. You are not a registered teacher for this subject.",
            )
        scope_ids = [subject_id]
        subject_name = subject_names.get(subject_id)

    if not scope_ids:
        return StudentProgressRosterOut(
            subject_id=subject_id, subject_name=subject_name, students=[]
        )

    published_per_subject = _published_per_subject(db, scope_ids)

    # Enrolled students per subject in scope, name joined.
    enrollments = (
        db.query(StudentSubject.subject_id, User.id, User.name)
        .join(User, User.id == StudentSubject.student_id)
        .filter(StudentSubject.subject_id.in_(scope_ids))
        .order_by(User.name.asc())
        .all()
    )

    student_names: dict[UUID, str] = {}
    student_subjects: dict[UUID, set[UUID]] = {}
    for subj_id, student_id, student_name in enrollments:
        student_names[student_id] = student_name
        student_subjects.setdefault(student_id, set()).add(subj_id)

    aggregates = _attempt_aggregates(db, scope_ids)

    rows = []
    for student_id, name in student_names.items():
        agg = aggregates.get(student_id, {})
        assessed = agg.get("attempt_count", 0) > 0
        student_scope_ids = sorted(student_subjects[student_id])
        denom = _published_in_subjects(published_per_subject, student_scope_ids)
        completion_pct = round(agg.get("quiz_count", 0) / denom * 100) if denom else 0
        avg_score = agg.get("avg_score")
        rows.append(
            StudentProgressRowOut(
                student_id=student_id,
                name=name,
                subjects=[subject_names[sid] for sid in student_scope_ids],
                avg_score=avg_score,
                completion_pct=completion_pct,
                last_active=agg.get("last_active"),
                at_risk=_at_risk(assessed, avg_score, completion_pct),
                assessed=assessed,
            )
        )
    rows.sort(key=lambda row: row.name)
    return StudentProgressRosterOut(
        subject_id=subject_id, subject_name=subject_name, students=rows
    )


def get_student_progress_detail(db: Session, user: User, student_id: UUID) -> StudentProgressDetailOut:
    """Drill-down for one student across all subjects the teacher teaches that
    the student is enrolled in. A teacher cannot see a student who is enrolled
    in none of their subjects (403, not 404 — no existence leak)."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    taught_subjects = get_user_subjects(db, user)
    taught_ids = [subject.id for subject in taught_subjects]
    subject_names = {subject.id: subject.name for subject in taught_subjects}
    if not taught_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You are not a registered teacher for any subject this student is enrolled in.",
        )

    enrolled = (
        db.query(StudentSubject.subject_id)
        .filter(
            StudentSubject.student_id == student_id,
            StudentSubject.subject_id.in_(taught_ids),
        )
        .all()
    )
    scope_ids = [row.subject_id for row in enrolled]
    if not scope_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You are not a registered teacher for any subject this student is enrolled in.",
        )

    published_per_subject = _published_per_subject(db, scope_ids)
    aggregates = _attempt_aggregates(db, scope_ids, [student_id]).get(student_id, {})
    assessed = aggregates.get("attempt_count", 0) > 0
    denom = _published_in_subjects(published_per_subject, scope_ids)
    completion_pct = round(aggregates.get("quiz_count", 0) / denom * 100) if denom else 0
    avg_score = aggregates.get("avg_score")

    history_rows = (
        db.query(QuizAttempt, Quiz, Subject)
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .join(Subject, Subject.id == Quiz.subject_id)
        .filter(
            QuizAttempt.student_id == student_id,
            Quiz.subject_id.in_(scope_ids),
        )
        .order_by(QuizAttempt.submitted_at.desc())
        .all()
    )
    quiz_history = [
        QuizHistoryOut(
            quiz_id=quiz.id,
            quiz_title=quiz.topic,
            subject_id=quiz.subject_id,
            subject_name=subject.name if subject else None,
            score=attempt.score,
            submitted_at=attempt.submitted_at,
        )
        for attempt, quiz, subject in history_rows
    ]

    return StudentProgressDetailOut(
        student_id=student_id,
        name=student.name,
        subjects=[subject_names[sid] for sid in scope_ids],
        avg_score=avg_score,
        completion_pct=completion_pct,
        last_active=aggregates.get("last_active"),
        at_risk=_at_risk(assessed, avg_score, completion_pct),
        assessed=assessed,
        quiz_history=quiz_history,
    )
