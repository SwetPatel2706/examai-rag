import datetime
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.material import Material
from app.models.user import User
from app.services.subject_service import check_subject_access
from app.services.ingestion.pipeline import IngestionPipeline
from app.utils.storage import StorageClient, safe_storage_path

ALLOWED_TYPES = {"pdf": "application/pdf", "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
MAX_BYTES = 25 * 1024 * 1024

async def upload_material(db: Session, user: User, subject_id: UUID, filename: str, data: bytes, *, storage=None, pipeline=None) -> Material:
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload materials")
    check_subject_access(db, subject_id, user)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type. Use PDF, PPTX, or DOCX.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Material exceeds the 25 MiB size limit")
    material = Material(subject_id=subject_id, teacher_id=user.id, filename=filename, file_type=extension,
                        storage_path="pending", status="processing", ingestion_version=1)
    db.add(material)
    db.commit()
    db.refresh(material)
    material.storage_path = safe_storage_path(material.id, filename)
    db.commit()
    try:
        storage_client = storage or StorageClient()
        await storage_client.upload(material.storage_path, data, ALLOWED_TYPES[extension])
        (pipeline or IngestionPipeline()).process(db, material.id, data, version=material.ingestion_version)
        return db.query(Material).filter(Material.id == material.id).first()
    except Exception as exc:
        # Best-effort cleanup of a source object when a later stage fails.
        try:
            if "storage_client" in locals():
                await storage_client.delete(material.storage_path)
        except Exception:
            pass
        current = db.query(Material).filter(Material.id == material.id).first()
        if current and current.status != "deleting":
            current.status = "failed"
            db.commit()
        raise HTTPException(status_code=502, detail=f"Material ingestion failed: {exc}") from exc

def start_retry(db: Session, material: Material, user: User) -> int:
    if user.role != "teacher" or material.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Only the owning teacher can retry ingestion")
    if material.status != "failed":
        raise HTTPException(status_code=409, detail="Only failed materials can be retried")
    material.ingestion_version += 1
    material.status = "processing"
    material.processed_at = None
    db.commit()
    return material.ingestion_version

def mark_deleting(db: Session, material: Material, user: User) -> int:
    if user.role != "teacher" or material.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="Only the owning teacher can delete this material")
    material.ingestion_version += 1
    material.status = "deleting"
    db.commit()
    return material.ingestion_version
