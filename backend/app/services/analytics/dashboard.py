"""Teacher + student dashboard read models.

All aggregation is done in SQL (no per-row Python loops over large sets) and
recent-activity flags reuse the documented at-risk policy.
"""
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from app.models.material import Material
from app.models.quiz import Quiz, QuizAttempt
from app.models.subject import Subject
from app.models.user import User
from app.schemas.analytics import (
    GradeBandOut,
    RecentActivityOut,
    StudentStatsOut,
    StudentSubjectOut,
    SubjectTeacherOut,
    TeacherDashboardStatsOut,
    TeacherSubjectOut,
)
from app.services.analytics.quiz_analytics import GRADE_BANDS, get_grade_distribution
from app.services.analytics.student_progress import at_risk_map
from app.services.material_service import serialize_material
from app.services.subject_service import get_user_subjects

_RECENT_ACTIVITY_LIMIT = 10

_BAND_CASE = case(
    *[
        (QuizAttempt.score >= low, band)
        for band, low, high in GRADE_BANDS
        if band != "F"
    ],
    else_="F",
)


def _empty_bands() -> list[GradeBandOut]:
    return get_grade_distribution([])


def get_teacher_dashboard_stats(db: Session, user: User) -> TeacherDashboardStatsOut:
    subject_ids = [subject.id for subject in get_user_subjects(db, user)]
    if not subject_ids:
        return TeacherDashboardStatsOut(
            active_students=0,
            subject_materials=0,
            quizzes_created=0,
            avg_section_score=None,
            grade_distribution=_empty_bands(),
            recent_activity=[],
        )

    active_students = (
        db.query(func.count(func.distinct(QuizAttempt.student_id)))
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.subject_id.in_(subject_ids))
        .scalar()
        or 0
    )
    subject_materials = (
        db.query(func.count(Material.id))
        .filter(Material.subject_id.in_(subject_ids), Material.status == "ready")
        .scalar()
        or 0
    )
    quizzes_created = (
        db.query(func.count(Quiz.id)).filter(Quiz.subject_id.in_(subject_ids)).scalar() or 0
    )
    avg_section_score = (
        db.query(func.avg(QuizAttempt.score))
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.subject_id.in_(subject_ids))
        .scalar()
    )

    band_rows = (
        db.query(_BAND_CASE.label("band"), func.count(QuizAttempt.id))
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.subject_id.in_(subject_ids))
        .group_by(_BAND_CASE)
        .all()
    )
    counts_by_band = dict(band_rows)
    total = sum(count for _, count in band_rows)
    grade_distribution = [
        GradeBandOut(
            band=band,
            min_score=low,
            max_score=high,
            count=counts_by_band.get(band, 0),
            pct=round(counts_by_band.get(band, 0) / total * 100) if total else 0,
        )
        for band, low, high in GRADE_BANDS
    ]

    recent = (
        db.query(QuizAttempt)
        .options(
            joinedload(QuizAttempt.student),
            joinedload(QuizAttempt.quiz).joinedload(Quiz.subject),
        )
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.subject_id.in_(subject_ids))
        .order_by(QuizAttempt.submitted_at.desc())
        .limit(_RECENT_ACTIVITY_LIMIT)
        .all()
    )
    at_risk_flags = at_risk_map(db, user, [attempt.student_id for attempt in recent])
    recent_activity = [
        RecentActivityOut(
            attempt_id=attempt.id,
            student_id=attempt.student_id,
            student_name=attempt.student.name if attempt.student else "Unknown",
            quiz_id=attempt.quiz_id,
            quiz_title=attempt.quiz.topic,
            subject_id=attempt.quiz.subject_id,
            subject_name=(
                attempt.quiz.subject.name if attempt.quiz.subject else None
            ),
            score=attempt.score,
            submitted_at=attempt.submitted_at,
            at_risk=at_risk_flags.get(attempt.student_id, False),
        )
        for attempt in recent
        if attempt.quiz is not None
    ]

    return TeacherDashboardStatsOut(
        active_students=active_students,
        subject_materials=subject_materials,
        quizzes_created=quizzes_created,
        avg_section_score=round(avg_section_score) if avg_section_score is not None else None,
        grade_distribution=grade_distribution,
        recent_activity=recent_activity,
    )


# ── Subject tabs / cards ──────────────────────────────────────────────────────

def teacher_subject_cards(db: Session, user: User) -> list[TeacherSubjectOut]:
    subject_ids = [subject.id for subject in get_user_subjects(db, user)]
    if not subject_ids:
        return []
    subjects = _load_subjects_with_teachers(db, subject_ids)
    return [
        TeacherSubjectOut(
            subject_id=subject.id,
            name=subject.name,
            teachers=[SubjectTeacherOut(id=teacher.id, name=teacher.name) for teacher in subject.teachers],
        )
        for subject in subjects
    ]


def student_subject_cards(db: Session, user: User) -> list[StudentSubjectOut]:
    subject_ids = [subject.id for subject in get_user_subjects(db, user)]
    if not subject_ids:
        return []
    subjects = _load_subjects_with_teachers(db, subject_ids)

    published_per_subject = dict(
        db.query(Quiz.subject_id, func.count(Quiz.id))
        .filter(Quiz.subject_id.in_(subject_ids), Quiz.status == "published")
        .group_by(Quiz.subject_id)
        .all()
    )
    attempted_per_subject = dict(
        db.query(Quiz.subject_id, func.count(func.distinct(QuizAttempt.quiz_id)))
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(
            QuizAttempt.student_id == user.id,
            Quiz.subject_id.in_(subject_ids),
            Quiz.status == "published",
        )
        .group_by(Quiz.subject_id)
        .all()
    )

    cards = []
    for subject in subjects:
        denominator = published_per_subject.get(subject.id, 0)
        progress = (
            round(attempted_per_subject.get(subject.id, 0) / denominator * 100)
            if denominator
            else None
        )
        cards.append(
            StudentSubjectOut(
                subject_id=subject.id,
                name=subject.name,
                teachers=[
                    SubjectTeacherOut(id=teacher.id, name=teacher.name)
                    for teacher in subject.teachers
                ],
                progress=progress,
            )
        )
    return cards


def _load_subjects_with_teachers(db: Session, subject_ids: list) -> list[Subject]:
    return (
        db.query(Subject)
        .options(joinedload(Subject.teachers))
        .filter(Subject.id.in_(subject_ids))
        .order_by(Subject.name.asc())
        .all()
    )


# ── Student dashboard ─────────────────────────────────────────────────────────

def get_student_stats(db: Session, user: User) -> StudentStatsOut:
    attempts = db.query(QuizAttempt).filter(QuizAttempt.student_id == user.id).all()
    quizzes_taken = len(attempts)
    avg_score = (
        round(sum(attempt.score for attempt in attempts) / quizzes_taken)
        if quizzes_taken
        else None
    )
    weak_topics_count = len(
        {weak["topic"] for attempt in attempts for weak in (attempt.weak_topics or [])}
    )

    subject_ids = [subject.id for subject in get_user_subjects(db, user)]
    if subject_ids:
        recent = (
            db.query(Material)
            .options(joinedload(Material.teacher))
            .filter(Material.subject_id.in_(subject_ids), Material.status == "ready")
            .order_by(Material.uploaded_at.desc(), Material.id.asc())
            .limit(5)
            .all()
        )
    else:
        recent = []
    return StudentStatsOut(
        quizzes_taken=quizzes_taken,
        weak_topics_count=weak_topics_count,
        avg_score=avg_score,
        recent_materials=[serialize_material(material) for material in recent],
    )
