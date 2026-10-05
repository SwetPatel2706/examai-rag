import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

ManageableRole = Literal["teacher", "student"]


class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=200)
    role: ManageableRole
    password: str = Field(min_length=8, max_length=128)


class AdminUserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    role: Optional[ManageableRole] = None


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: str
    name: str
    created_at: datetime.datetime


class AdminSubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class AdminSubjectUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class AdminMembershipCreate(BaseModel):
    teacher_id: Optional[UUID] = None
    student_id: Optional[UUID] = None
