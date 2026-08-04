import datetime
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, List

class MaterialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subject_id: UUID
    teacher_id: UUID
    filename: str
    file_type: str
    status: str
    ingestion_version: int = 0
    display_name: Optional[str] = None
    notes: Optional[str] = None
    uploaded_at: datetime.datetime
    processed_at: Optional[datetime.datetime] = None

class MaterialStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    status: str
    ingestion_version: int
    processed_at: Optional[datetime.datetime] = None

class MaterialUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    notes: Optional[str] = None
    # status is intentionally omitted — client cannot drive status changes

class MaterialsListResponse(BaseModel):
    items: List[MaterialResponse]
    total: int
    page: int
    pages: int
    size: int
