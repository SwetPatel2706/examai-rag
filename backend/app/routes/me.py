# pyrefly: ignore [missing-import]
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.auth.dependencies import require_student, require_teacher
from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.schemas.material import MaterialsListResponse
from app.services.analytics.dashboard import (
    get_student_stats,
    student_subject_cards,
    teacher_subject_cards,
)
from app.services.material_service import get_materials, serialize_material
from app.services.quiz.grading_service import list_own_attempts, serialize_attempt

router = APIRouter(prefix="/api", tags=["Me"])


@router.get("/teachers/me/subjects", response_model=StandardResponse)
def teachers_me_subjects(
    response: Response,
    current_user=Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Subjects the teacher teaches (subject tabs)."""
    response.headers["Cache-Control"] = "no-store"
    data = [card.model_dump(mode="json") for card in teacher_subject_cards(db, current_user)]
    return StandardResponse.ok(data=data)


@router.get("/students/me/stats", response_model=StandardResponse)
def students_me_stats(
    response: Response,
    current_user=Depends(require_student),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    data = get_student_stats(db, current_user)
    return StandardResponse.ok(data=data.model_dump(mode="json"))


@router.get("/students/me/subjects", response_model=StandardResponse)
def students_me_subjects(
    response: Response,
    current_user=Depends(require_student),
    db: Session = Depends(get_db),
):
    """Accessible subject cards for a student (teachers + progress)."""
    response.headers["Cache-Control"] = "no-store"
    data = [card.model_dump(mode="json") for card in student_subject_cards(db, current_user)]
    return StandardResponse.ok(data=data)


@router.get("/students/me/attempts", response_model=StandardResponse)
def students_me_attempts(
    response: Response,
    quiz_id: Optional[UUID] = Query(None, description="Filter to one quiz"),
    current_user=Depends(require_student),
    db: Session = Depends(get_db),
):
    """The student's own quiz attempts (newest first), so the frontend can
    render per-quiz status/score and deep-link into results."""
    response.headers["Cache-Control"] = "no-store"
    attempts = list_own_attempts(db, current_user, quiz_id)
    data = [serialize_attempt(attempt).model_dump(mode="json") for attempt in attempts]
    return StandardResponse.ok(data=data)


@router.get("/students/me/materials", response_model=StandardResponse)
def students_me_materials(
    response: Response,
    subject_id: Optional[UUID] = Query(None, description="Course / subject filter"),
    teacher_id: Optional[UUID] = Query(None, description="Owner teacher filter"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user=Depends(require_student),
    db: Session = Depends(get_db),
):
    """Paginated/filterable materials across the student's enrolled subjects,
    with owner attribution. Never returns unrelated students' data."""
    response.headers["Cache-Control"] = "no-store"
    items, total = get_materials(
        db=db,
        user=current_user,
        subject_id=subject_id,
        teacher_id=teacher_id,
        material_status="ready",
        search=search,
        page=page,
        size=size,
    )
    pages = (total + size - 1) // size
    resp = MaterialsListResponse(
        items=[serialize_material(material) for material in items],
        total=total,
        page=page,
        pages=pages,
        size=size,
    )
    return StandardResponse.ok(data=resp.model_dump(mode="json"))
