# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Query, HTTPException, status
from typing import Optional
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.material_service import get_materials, get_material_by_id, update_material_metadata
from app.schemas.material import MaterialResponse, MaterialUpdateRequest, MaterialsListResponse
from app.schemas.common import StandardResponse

router = APIRouter(prefix="/api/materials", tags=["Materials"])

@router.get("", response_model=StandardResponse)
async def list_all_materials(
    subject_id: Optional[UUID] = Query(None),
    teacher_id: Optional[UUID] = Query(None),
    material_status: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List materials across subjects the user has access to, with search, pagination, and sorting."""
    items, total = get_materials(
        db=db,
        user=current_user,
        subject_id=subject_id,
        teacher_id=teacher_id,
        material_status=material_status,
        search=search,
        page=page,
        size=size
    )

    pages = (total + size - 1) // size
    items_data = [MaterialResponse.model_validate(m) for m in items]
    resp = MaterialsListResponse(
        items=items_data,
        total=total,
        page=page,
        pages=pages,
        size=size
    )
    return StandardResponse.ok(data=resp.model_dump(mode="json"))


@router.get("/{material_id}", response_model=StandardResponse)
async def get_material(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details of a specific material after verifying access permissions."""
    material = get_material_by_id(db, material_id, current_user)
    response_data = MaterialResponse.model_validate(material)
    return StandardResponse.ok(data=response_data.model_dump())


@router.patch("/{material_id}", response_model=StandardResponse)
async def update_material(
    material_id: UUID,
    updates: MaterialUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update metadata of a material (e.g. display name, notes).
    Only the uploading teacher can edit this.
    """
    material = update_material_metadata(db, material_id, updates, current_user)
    response_data = MaterialResponse.model_validate(material)
    return StandardResponse.ok(data=response_data.model_dump())
