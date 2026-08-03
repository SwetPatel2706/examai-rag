# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.subject_service import get_user_subjects, check_subject_access, get_subject_teachers
from app.services.material_service import get_materials
from app.schemas.subject import SubjectResponse, SubjectDetailResponse, TeacherRosterResponse
from app.schemas.material import MaterialResponse
from app.schemas.common import StandardResponse

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])

@router.get("", response_model=StandardResponse)
async def list_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all subjects accessible to the current user."""
    subjects = get_user_subjects(db, current_user)
    response_data = [SubjectResponse.model_validate(s) for s in subjects]
    return StandardResponse.ok(data=[s.model_dump() for s in response_data])


@router.get("/{subject_id}", response_model=StandardResponse)
async def get_subject_detail(
    subject_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get subject details, including the teacher roster, after checking membership."""
    subject = check_subject_access(db, subject_id, current_user)
    teachers = get_subject_teachers(db, subject_id)

    roster = [TeacherRosterResponse.model_validate(t) for t in teachers]
    response_data = SubjectDetailResponse(
        id=subject.id,
        name=subject.name,
        teachers=roster,
        created_at=subject.created_at
    )
    return StandardResponse.ok(data=response_data.model_dump())


@router.get("/{subject_id}/materials", response_model=StandardResponse)
async def list_subject_materials(
    subject_id: UUID,
    teacher_id: UUID = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all materials under a specific subject with filtering, search, and pagination."""
    items, total = get_materials(
        db=db,
        user=current_user,
        subject_id=subject_id,
        teacher_id=teacher_id,
        material_status=status,
        search=search,
        page=page,
        size=size
    )

    pages = (total + size - 1) // size
    items_data = [MaterialResponse.model_validate(m).model_dump() for m in items]
    return StandardResponse.ok(data={
        "items": items_data,
        "total": total,
        "page": page,
        "pages": pages,
        "size": size
    })
