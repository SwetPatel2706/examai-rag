import datetime
from typing import Literal
from uuid import UUID

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, Field, model_validator

QuizSource = Literal["manual", "ai_generated"]
QuizStatus = Literal["draft", "published"]
QuizDifficulty = Literal["easy", "medium", "hard"]

MIN_OPTIONS = 2
MAX_OPTIONS = 8


def validate_question_shape(options: list[str], correct_option: str) -> None:
    """Shared validation for manual input and AI structured output."""
    if len(options) < MIN_OPTIONS:
        raise ValueError(f"Each question must have at least {MIN_OPTIONS} options")
    if len(options) > MAX_OPTIONS:
        raise ValueError(f"Each question can have at most {MAX_OPTIONS} options")
    if any(not str(option).strip() for option in options):
        raise ValueError("Options cannot be blank")
    if len({str(option).strip() for option in options}) != len(options):
        raise ValueError("Options must be unique")
    if correct_option not in options:
        raise ValueError("correct_option must be one of the options")


class QuizQuestionInput(BaseModel):
    """A single question as supplied by a teacher (manual authoring or saving
    an AI draft). `correct_option` must equal exactly one of the options."""

    question_text: str = Field(min_length=3, max_length=2000)
    options: list[str] = Field(min_length=MIN_OPTIONS, max_length=MAX_OPTIONS)
    correct_option: str = Field(min_length=1, max_length=500)
    topic_tag: str | None = Field(default=None, max_length=200)
    difficulty: QuizDifficulty = "medium"

    @model_validator(mode="after")
    def validate_correct_option_in_options(self) -> "QuizQuestionInput":
        validate_question_shape(self.options, self.correct_option)
        return self


class QuizCreateRequest(BaseModel):
    subject_id: UUID
    topic: str = Field(min_length=1, max_length=200)
    source: QuizSource = "manual"
    time_limit_seconds: int | None = Field(default=None, ge=1, le=10800)
    questions: list[QuizQuestionInput] = Field(min_length=1, max_length=50)


class QuizUpdateRequest(BaseModel):
    topic: str | None = Field(default=None, min_length=1, max_length=200)
    time_limit_seconds: int | None = Field(default=None, ge=1, le=10800)
    questions: list[QuizQuestionInput] | None = Field(default=None, min_length=1, max_length=50)


class QuizGenerateRequest(BaseModel):
    subject_id: UUID
    material_ids: list[UUID] = Field(min_length=1, max_length=50)
    topic: str = Field(min_length=1, max_length=200)
    question_count: int = Field(default=10, ge=1, le=30)


# ── AI structured-output schema (defined first; it doubles as the prompt spec) ──

class QuizQuestionLLMItem(BaseModel):
    question_text: str = Field(min_length=3, max_length=2000)
    options: list[str] = Field(min_length=MIN_OPTIONS, max_length=MAX_OPTIONS)
    correct_option: str = Field(min_length=1, max_length=500)
    topic_tag: str | None = Field(default=None, max_length=200)
    difficulty: QuizDifficulty = "medium"

    @model_validator(mode="after")
    def validate_correct_option_in_options(self) -> "QuizQuestionLLMItem":
        validate_question_shape(self.options, self.correct_option)
        return self


class QuizQuestionLLMOutput(BaseModel):
    questions: list[QuizQuestionLLMItem] = Field(min_length=1, max_length=30)


# ── Response schemas ──────────────────────────────────────────────────────────

class QuizQuestionOut(BaseModel):
    """Teacher/internal serialisation — includes the correct option."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question_text: str
    options: list[str]
    correct_option: str
    topic_tag: str | None = None
    difficulty: str | None = None


class QuizQuestionStudentOut(BaseModel):
    """Student-facing serialisation — MUST NOT include `correct_option`.

    Used exclusively in student-facing quiz detail responses. The schema
    deliberately omits the field so a correct answer can never leak even if
    a future serializer starts from the ORM object."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question_text: str
    options: list[str]
    topic_tag: str | None = None
    difficulty: str | None = None


class QuizSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subject_id: UUID
    teacher_id: UUID
    teacher_name: str | None = None
    topic: str
    source: QuizSource
    status: QuizStatus
    time_limit_seconds: int | None = None
    question_count: int = 0
    created_at: datetime.datetime


class QuizTeacherDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subject_id: UUID
    teacher_id: UUID
    teacher_name: str | None = None
    topic: str
    source: QuizSource
    status: QuizStatus
    time_limit_seconds: int | None = None
    created_at: datetime.datetime
    questions: list[QuizQuestionOut]


class QuizStudentDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subject_id: UUID
    teacher_id: UUID
    teacher_name: str | None = None
    topic: str
    source: QuizSource
    status: QuizStatus
    time_limit_seconds: int | None = None
    created_at: datetime.datetime
    questions: list[QuizQuestionStudentOut]


class QuizDraftQuestionOut(BaseModel):
    """A generated draft question, returned to the teacher for review. Not
    persisted; `id` is intentionally absent."""

    question_text: str
    options: list[str]
    correct_option: str
    topic_tag: str | None = None
    difficulty: str | None = None


class QuizGenerateResponse(BaseModel):
    questions: list[QuizDraftQuestionOut]


# ── Attempts ──────────────────────────────────────────────────────────────────

class QuizAttemptCreateRequest(BaseModel):
    quiz_id: UUID
    answers: dict[UUID, str] = Field(default_factory=dict, max_length=100)


class WeakTopicOut(BaseModel):
    topic: str
    accuracy: int  # percentage


class QuizAttemptQuestionResult(BaseModel):
    question_id: UUID
    question_text: str
    options: list[str]
    correct_option: str
    selected_option: str | None = None
    is_correct: bool


class QuizAttemptResponse(BaseModel):
    id: UUID
    quiz_id: UUID
    student_id: UUID
    quiz_title: str
    subject_name: str | None = None
    answers: dict[str, str]
    score: int  # percentage, computed server-side
    correct_count: int
    total_questions: int
    weak_topics: list[WeakTopicOut] = Field(default_factory=list)
    submitted_at: datetime.datetime
    questions: list[QuizAttemptQuestionResult] = Field(default_factory=list)
