from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FlashcardGenerationRequest(BaseModel):
    subject_id: UUID
    material_ids: list[UUID] = Field(min_length=1, max_length=50)
    title: str | None = Field(default=None, max_length=160)
    card_count: int = Field(default=10, ge=1, le=30)


class FlashcardLLMItem(BaseModel):
    front: str = Field(min_length=1, max_length=500)
    back: str = Field(min_length=1, max_length=2000)


class FlashcardLLMOutput(BaseModel):
    cards: list[FlashcardLLMItem] = Field(min_length=1, max_length=30)


class FlashcardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    deck_id: UUID
    front: str
    back: str
    mastery_state: str


class FlashcardDeckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    student_id: UUID
    subject_id: UUID
    source_material_ids: list[UUID]
    title: str
    created_at: datetime
    cards: list[FlashcardResponse] = Field(default_factory=list)


class FlashcardMasteryUpdate(BaseModel):
    mastery_state: str

    @field_validator("mastery_state")
    @classmethod
    def valid_mastery_state(cls, value: str) -> str:
        if value not in {"new", "learning", "mastered"}:
            raise ValueError("mastery_state must be new, learning, or mastered")
        return value

