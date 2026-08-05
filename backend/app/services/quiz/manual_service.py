from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.quiz import Quiz, QuizAttempt, QuizQuestion
from app.models.user import User
from app.schemas.quiz import QuizCreateRequest, QuizUpdateRequest
from app.services.subject_service import check_subject_access, get_user_subjects

_IMMUTABLE_MESSAGE = (
    "This quiz is immutable because students have already submitted attempts. "
    "Publish corrections are out of scope in this phase."
)


def _get_quiz(db: Session, quiz_id: UUID) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


def has_attempts(db: Session, quiz_id: UUID) -> bool:
    return db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).first() is not None


def _require_author(db: Session, user: User, quiz_id: UUID) -> Quiz:
    """Return the quiz after verifying the user is a teacher of its subject
    AND the authoring teacher (mirrors the material owner-only edit rule)."""
    quiz = _get_quiz(db, quiz_id)
    check_subject_access(db, quiz.subject_id, user)
    if user.id != quiz.teacher_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You can only edit your own quizzes.",
        )
    return quiz


def _require_editable(db: Session, quiz: Quiz) -> None:
    """Published quizzes are immutable once any attempt exists (HTTP 409)."""
    if has_attempts(db, quiz.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_IMMUTABLE_MESSAGE)


# ── Listing / retrieval ───────────────────────────────────────────────────────

def list_teacher_quizzes(db: Session, user: User) -> list[Quiz]:
    subject_ids = [s.id for s in get_user_subjects(db, user)]
    if not subject_ids:
        return []
    return (
        db.query(Quiz)
        .filter(Quiz.subject_id.in_(subject_ids))
        .order_by(Quiz.created_at.desc())
        .all()
    )


def list_student_quizzes(db: Session, user: User) -> list[Quiz]:
    subject_ids = [s.id for s in get_user_subjects(db, user)]
    if not subject_ids:
        return []
    return (
        db.query(Quiz)
        .filter(Quiz.subject_id.in_(subject_ids), Quiz.status == "published")
        .order_by(Quiz.created_at.desc())
        .all()
    )


def get_teacher_quiz(db: Session, user: User, quiz_id: UUID) -> Quiz:
    """A teacher can view any quiz in a subject they teach (including drafts
    and co-teachers' quizzes); edits remain author-only."""
    quiz = _get_quiz(db, quiz_id)
    check_subject_access(db, quiz.subject_id, user)
    return quiz


def get_student_quiz(db: Session, user: User, quiz_id: UUID) -> Quiz:
    """A student sees only published quizzes in subjects they are enrolled in.
    Drafts are hidden with 404 (after the 403 membership gate)."""
    quiz = _get_quiz(db, quiz_id)
    check_subject_access(db, quiz.subject_id, user)
    if quiz.status != "published":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    return quiz


# ── Teacher mutation flows ────────────────────────────────────────────────────

def create_draft(db: Session, user: User, request: QuizCreateRequest) -> Quiz:
    check_subject_access(db, request.subject_id, user)
    quiz = Quiz(
        subject_id=request.subject_id,
        teacher_id=user.id,
        topic=request.topic,
        source=request.source,
        status="draft",
        time_limit_seconds=request.time_limit_seconds,
    )
    quiz.questions = [QuizQuestion(**question.model_dump()) for question in request.questions]
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


def update_draft(db: Session, user: User, quiz_id: UUID, request: QuizUpdateRequest) -> Quiz:
    quiz = _require_author(db, user, quiz_id)
    _require_editable(db, quiz)
    update_data = request.model_dump(exclude_unset=True)
    if "topic" in update_data:
        quiz.topic = update_data["topic"]
    if "time_limit_seconds" in update_data:
        quiz.time_limit_seconds = update_data["time_limit_seconds"]
    if "questions" in update_data:
        quiz.questions.clear()
        quiz.questions = [QuizQuestion(**question.model_dump()) for question in request.questions]
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz


def delete_quiz(db: Session, user: User, quiz_id: UUID) -> None:
    quiz = _require_author(db, user, quiz_id)
    _require_editable(db, quiz)
    db.delete(quiz)
    db.commit()


def publish_quiz(db: Session, user: User, quiz_id: UUID) -> Quiz:
    quiz = _require_author(db, user, quiz_id)
    if quiz.status == "published":
        return quiz  # idempotent publish (client retries)
    if not quiz.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot publish a quiz with no questions.",
        )
    quiz.status = "published"
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz
