from uuid import UUID

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_student, require_teacher
from app.db.session import get_db
from app.models.quiz import Quiz
from app.models.user import User
from app.schemas.common import StandardResponse
from app.schemas.quiz import (
    QuizAttemptCreateRequest,
    QuizAttemptResponse,
    QuizCreateRequest,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizQuestionOut,
    QuizQuestionStudentOut,
    QuizStudentDetailOut,
    QuizSummaryOut,
    QuizTeacherDetailOut,
    QuizUpdateRequest,
)
from app.services.quiz.ai_generate_service import AIQuizGenerateService
from app.services.quiz.grading_service import (
    get_own_attempt,
    serialize_attempt,
    submit_attempt,
)
from app.services.quiz.manual_service import (
    create_draft,
    delete_quiz,
    get_student_quiz,
    get_teacher_quiz,
    list_student_quizzes,
    list_teacher_quizzes,
    publish_quiz,
    update_draft,
)

router = APIRouter(prefix="/api", tags=["Quizzes"])


# ── Serialization helpers ─────────────────────────────────────────────────────

def _summary_out(quiz: Quiz) -> QuizSummaryOut:
    return QuizSummaryOut(
        id=quiz.id,
        subject_id=quiz.subject_id,
        teacher_id=quiz.teacher_id,
        teacher_name=quiz.teacher.name if quiz.teacher else None,
        topic=quiz.topic,
        source=quiz.source,
        status=quiz.status,
        time_limit_seconds=quiz.time_limit_seconds,
        question_count=len(quiz.questions),
        created_at=quiz.created_at,
    )


def _teacher_detail_out(quiz: Quiz) -> QuizTeacherDetailOut:
    return QuizTeacherDetailOut(
        id=quiz.id,
        subject_id=quiz.subject_id,
        teacher_id=quiz.teacher_id,
        teacher_name=quiz.teacher.name if quiz.teacher else None,
        topic=quiz.topic,
        source=quiz.source,
        status=quiz.status,
        time_limit_seconds=quiz.time_limit_seconds,
        created_at=quiz.created_at,
        questions=[QuizQuestionOut.model_validate(q) for q in quiz.questions],
    )


def _student_detail_out(quiz: Quiz) -> QuizStudentDetailOut:
    """Student-facing detail. Uses QuizQuestionStudentOut exclusively so
    `correct_option` is never serialised."""
    return QuizStudentDetailOut(
        id=quiz.id,
        subject_id=quiz.subject_id,
        teacher_id=quiz.teacher_id,
        teacher_name=quiz.teacher.name if quiz.teacher else None,
        topic=quiz.topic,
        source=quiz.source,
        status=quiz.status,
        time_limit_seconds=quiz.time_limit_seconds,
        created_at=quiz.created_at,
        questions=[QuizQuestionStudentOut.model_validate(q) for q in quiz.questions],
    )


def _attempt_out(attempt) -> QuizAttemptResponse:
    return serialize_attempt(attempt)


# ── Quiz list / detail (role-aware) ───────────────────────────────────────────

@router.get("/quizzes", response_model=StandardResponse)
def list_quizzes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher: all quizzes (draft + published) in subjects they teach.
    Student: published quizzes only, in enrolled subjects."""
    if current_user.role == "teacher":
        quizzes = list_teacher_quizzes(db, current_user)
    elif current_user.role == "student":
        quizzes = list_student_quizzes(db, current_user)
    else:
        raise HTTPException(status_code=403, detail="Unknown role")
    return StandardResponse.ok(data=[_summary_out(q).model_dump(mode="json") for q in quizzes])


@router.get("/quizzes/{quiz_id}", response_model=StandardResponse)
def get_quiz(
    quiz_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Teacher detail includes correct_option; student detail never does."""
    if current_user.role == "teacher":
        quiz = get_teacher_quiz(db, current_user, quiz_id)
        data = _teacher_detail_out(quiz)
    elif current_user.role == "student":
        quiz = get_student_quiz(db, current_user, quiz_id)
        data = _student_detail_out(quiz)
    else:
        raise HTTPException(status_code=403, detail="Unknown role")
    return StandardResponse.ok(data=data.model_dump(mode="json"))


# ── Teacher authoring ─────────────────────────────────────────────────────────

@router.post("/quizzes", response_model=StandardResponse, status_code=201)
def create_quiz(
    request: QuizCreateRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    quiz = create_draft(db, current_user, request)
    return StandardResponse.ok(data=_teacher_detail_out(quiz).model_dump(mode="json"))


@router.patch("/quizzes/{quiz_id}", response_model=StandardResponse)
def update_quiz(
    quiz_id: UUID,
    request: QuizUpdateRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    quiz = update_draft(db, current_user, quiz_id, request)
    return StandardResponse.ok(data=_teacher_detail_out(quiz).model_dump(mode="json"))


@router.delete("/quizzes/{quiz_id}", response_model=StandardResponse)
def remove_quiz(
    quiz_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    delete_quiz(db, current_user, quiz_id)
    return StandardResponse.ok(data={"deleted": True})


@router.post("/quizzes/{quiz_id}/publish", response_model=StandardResponse)
def publish_quiz_route(
    quiz_id: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    quiz = publish_quiz(db, current_user, quiz_id)
    return StandardResponse.ok(data=_teacher_detail_out(quiz).model_dump(mode="json"))


@router.post("/quiz/generate", response_model=StandardResponse)
def generate_quiz_draft(
    request: QuizGenerateRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Generate a draft question set from ready materials for review. Nothing
    is inserted — the teacher must save it as a quiz before publishing."""
    questions = AIQuizGenerateService().generate_draft(db, current_user, request)
    response = QuizGenerateResponse(questions=questions)
    return StandardResponse.ok(data=response.model_dump(mode="json"))


# ── Student attempts ──────────────────────────────────────────────────────────

@router.post("/quiz-attempts", response_model=StandardResponse)
def create_attempt(
    request: QuizAttemptCreateRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    """Submit answers. Idempotent: retries return the existing attempt (200)
    with the same result rather than creating a duplicate row."""
    attempt = submit_attempt(
        db,
        current_user,
        request.quiz_id,
        {str(question_id): option for question_id, option in request.answers.items()},
    )
    return StandardResponse.ok(data=_attempt_out(attempt).model_dump(mode="json"))


@router.get("/quiz-attempts/{attempt_id}", response_model=StandardResponse)
def get_attempt(
    attempt_id: UUID,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    attempt = get_own_attempt(db, current_user, attempt_id)
    return StandardResponse.ok(data=_attempt_out(attempt).model_dump(mode="json"))
