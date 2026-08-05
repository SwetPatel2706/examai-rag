from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    subject_id: UUID
    selected_material_ids: list[UUID] = Field(min_length=1, max_length=50)
    question: str = Field(min_length=3, max_length=4000)

    @field_validator("question")
    @classmethod
    def question_must_contain_text(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("question must be at least 3 characters long after trimming")
        return value


class Citation(BaseModel):
    marker: int = Field(ge=1)
    teacher_name: str
    material_filename: str
    material_id: UUID
    source_locator: dict


class ChatResponse(BaseModel):
    answer_text: str
    citations: list[Citation]


class ChatLLMOutput(BaseModel):
    answer_text: str = Field(min_length=1, max_length=12000)
    source_markers: list[int] = Field(default_factory=list, max_length=20)

