# pyrefly: ignore [missing-import]
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.auth.dependencies import require_teacher
from app.db.session import get_db
from app.schemas.common import StandardResponse
from app.services.analytics.dashboard import get_teacher_dashboard_stats
from app.services.analytics.quiz_analytics import get_quiz_analytics
from app.services.analytics.student_progress import (
    get_student_progress_detail,
    get_student_progress_roster,
)

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/analytics", response_model=StandardResponse)
def analytics(
    response: Response,
    quiz_id: UUID = Query(...),
    current_user=Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Per-quiz class-wide analytics. The requesting teacher must teach the
    quiz's subject; unauthorized teachers receive 403."""
    response.headers["Cache-Control"] = "no-store"
    data = get_quiz_analytics(db, current_user, quiz_id)
    return StandardResponse.ok(data=data.model_dump(mode="json"))


@router.get("/student-progress", response_model=StandardResponse)
def student_progress_roster(
    response: Response,
    subject_id: Optional[UUID] = Query(None),
    current_user=Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Cross-quiz per-student roster. Optional subject filter; the teacher
    must teach the filtered subject (403 otherwise)."""
    response.headers["Cache-Control"] = "no-store"
    data = get_student_progress_roster(db, current_user, subject_id)
    return StandardResponse.ok(data=data.model_dump(mode="json"))


@router.get("/student-progress/{student_id}", response_model=StandardResponse)
def student_progress_detail(
    response: Response,
    student_id: UUID,
    current_user=Depends(require_teacher),
    db: Session = Depends(get_db),
):
    """Drill-down for one student across subjects the teacher teaches that the
    student is enrolled in."""
    response.headers["Cache-Control"] = "no-store"
    data = get_student_progress_detail(db, current_user, student_id)
    return StandardResponse.ok(data=data.model_dump(mode="json"))


@router.get("/teacher/dashboard-stats", response_model=StandardResponse)
def teacher_dashboard_stats(
    response: Response,
    current_user=Depends(require_teacher),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"
    data = get_teacher_dashboard_stats(db, current_user)
    return StandardResponse.ok(data=data.model_dump(mode="json"))
