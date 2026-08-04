import datetime
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import List

class SubjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    created_at: datetime.datetime

class TeacherRosterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str

class SubjectDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    teachers: List[TeacherRosterResponse]
    created_at: datetime.datetime
