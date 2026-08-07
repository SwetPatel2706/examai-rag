# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File, Form
from typing import Optional
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.material_service import get_materials, get_material_by_id, update_material_metadata, serialize_material
from app.services.material_ingestion_service import upload_material, start_retry, mark_deleting
from app.services.ingestion.pipeline import IngestionPipeline
from app.utils.storage import StorageClient
from app.schemas.material import MaterialUpdateRequest, MaterialsListResponse, MaterialStatusResponse
from app.schemas.common import StandardResponse
from app.services.material_ingestion_service import MAX_BYTES

router = APIRouter(prefix="/api/materials", tags=["Materials"])

@router.post("", response_model=StandardResponse, status_code=202)
async def create_material(
    subject_id: UUID = Form(...), file: UploadFile = File(...),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # Bounded read: reject oversized files without materializing the full body.
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Material exceeds the 25 MiB size limit")
    material = await upload_material(db, current_user, subject_id, file.filename or "upload", data)
    return StandardResponse.ok(data=serialize_material(material).model_dump(mode="json"))

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
    items_data = [serialize_material(m) for m in items]
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
    response_data = serialize_material(material)
    return StandardResponse.ok(data=response_data.model_dump())

@router.get("/{material_id}/status", response_model=StandardResponse)
async def material_status(material_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    material = get_material_by_id(db, material_id, current_user)
    return StandardResponse.ok(data=MaterialStatusResponse.model_validate(material).model_dump(mode="json"))

@router.get("/{material_id}/download", response_model=StandardResponse)
async def material_download(material_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    material = get_material_by_id(db, material_id, current_user)
    if material.status == "deleting":
        raise HTTPException(status_code=409, detail="Material is being deleted")
    url = await StorageClient().signed_url(material.storage_path)
    return StandardResponse.ok(data={"url": url, "expires_in": 300})

@router.post("/{material_id}/retry", response_model=StandardResponse, status_code=202)
async def retry_material(material_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    material = get_material_by_id(db, material_id, current_user)
    version = start_retry(db, material, current_user)
    try:
        data = await StorageClient().download(material.storage_path)
        material = IngestionPipeline().process(db, material.id, data, version=version)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Material retry failed: {exc}") from exc
    return StandardResponse.ok(data=serialize_material(material).model_dump(mode="json"))

@router.delete("/{material_id}", response_model=StandardResponse)
async def delete_material(material_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    material = get_material_by_id(db, material_id, current_user)
    mark_deleting(db, material, current_user)
    try:
        await StorageClient().delete(material.storage_path)
        IngestionPipeline().qdrant.delete_material(material.id)
        db.delete(material)
        db.commit()
    except Exception as exc:
        # Keep the row in deleting state for an operator/retry job; never resurrect it.
        raise HTTPException(status_code=502, detail=f"Material cleanup incomplete: {exc}") from exc
    return StandardResponse.ok(data={"deleted": True})


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
    response_data = serialize_material(material)
    return StandardResponse.ok(data=response_data.model_dump())
