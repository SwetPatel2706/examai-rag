from sqlalchemy.orm import Session
from sqlalchemy import or_, select
from fastapi import HTTPException, status
from uuid import UUID
import datetime
from datetime import timezone
from typing import Optional, Tuple, List

from app.models.user import User
from app.models.material import Material
from app.services.subject_service import check_subject_access, get_user_subjects
from app.schemas.material import MaterialUpdateRequest

class MaterialNotFoundError(Exception):
    pass

def get_materials(
    db: Session,
    user: User,
    subject_id: Optional[UUID] = None,
    teacher_id: Optional[UUID] = None,
    material_status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> Tuple[List[Material], int]:
    """
    Get materials with pagination, filtering, search, and access control.
    """
    # 1. Access Control: Determine which subjects the user has access to
    if subject_id:
        # User specified a subject. Check access first (raises 403 if unauthorized)
        check_subject_access(db, subject_id, user)
        allowed_subject_ids = [subject_id]
    else:
        # List all subjects accessible by user
        allowed_subjects = get_user_subjects(db, user)
        allowed_subject_ids = [s.id for s in allowed_subjects]

    if not allowed_subject_ids:
        return [], 0

    # 2. Build Query
    query = db.query(Material).filter(Material.subject_id.in_(allowed_subject_ids))

    if teacher_id:
        query = query.filter(Material.teacher_id == teacher_id)

    if material_status:
        query = query.filter(Material.status == material_status)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Material.filename.ilike(search_pattern),
                Material.display_name.ilike(search_pattern),
                Material.notes.ilike(search_pattern),
            )
        )

    # Total Count
    total = query.count()

    # Stable Sorting: uploaded_at descending, then id ascending
    query = query.order_by(Material.uploaded_at.desc(), Material.id.asc())

    # Pagination
    offset = (page - 1) * size
    items = query.offset(offset).limit(size).all()

    return items, total


def get_material_by_id(db: Session, material_id: UUID, user: User) -> Material:
    """Get material by ID and verify user has access to its subject."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    # Check if the user has access to the subject of this material
    check_subject_access(db, material.subject_id, user)
    return material


def update_material_metadata(
    db: Session,
    material_id: UUID,
    updates: MaterialUpdateRequest,
    user: User,
) -> Material:
    """Update material metadata. Only the owner (teacher) can edit."""
    material = get_material_by_id(db, material_id, user)

    # Only teachers who are the owner/creator can edit
    if user.role != "teacher" or material.teacher_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. You can only edit your own uploaded materials."
        )

    # Apply updates (display_name, notes) using exclude_unset to support explicit nulls
    update_data = updates.model_dump(exclude_unset=True)
    if "display_name" in update_data:
        material.display_name = update_data["display_name"]
    if "notes" in update_data:
        material.notes = update_data["notes"]

    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def update_material_status(
    db: Session,
    material_id: UUID,
    new_status: str,
) -> Material:
    """
    Update status of a material (internal service/ingestion method).
    Enforces valid state transitions:
    - processing -> ready
    - processing -> failed
    - failed cannot transition directly to ready
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise MaterialNotFoundError(f"Material {material_id} not found")

    # Validate status first
    if new_status not in ("processing", "ready", "failed", "deleting"):
        raise ValueError(f"Invalid status: {new_status}")

    current_status = material.status
    if new_status == current_status:
        return material

    if current_status == "deleting":
        raise ValueError("Cannot transition a deleting material to another status")

    # Validate state transition rules
    invalid_transitions = [
        ("ready", "processing"),
        ("ready", "failed"),
        ("failed", "ready"),
    ]
    if (current_status, new_status) in invalid_transitions:
        raise ValueError(f"Cannot transition material status directly from {current_status} to {new_status}")

    material.status = new_status
    if new_status in ("ready", "failed"):
        material.processed_at = datetime.datetime.now(timezone.utc)

    db.add(material)
    db.commit()
    db.refresh(material)
    return material
