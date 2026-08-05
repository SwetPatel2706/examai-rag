"""Phase 5 analytics read-model schemas.

These are the stable contracts the Phase 6 frontend integration will consume.
All percentages are integers in 0–100 (round half up from server computation).
Grade bands are canonical A(90–100)/B(80–89)/C(70–79)/D(60–69)/F(<60); the
frontend maps these to its own UI groupings.
"""
import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.material import MaterialResponse

GradeBandName = Literal["A", "B", "C", "D", "F"]


class GradeBandOut(BaseModel):
    band: GradeBandName
    min_score: int
    max_score: int
    count: int
    pct: int  # share of attempts in this band, 0–100


class QuestionAccuracyOut(BaseModel):
    question_id: UUID
    question_text: str
    topic_tag: str | None = None
    accuracy: int | None = None  # None when there are no attempts (undefined)
    correct_count: int
    total: int  # attempt count used as the denominator


class WeakTopicOut(BaseModel):
    topic: str
    accuracy: int  # class-level accuracy across attempts for this topic
    question_count: int  # questions carrying this topic_tag
    attempt_count: int


class QuizAnalyticsOut(BaseModel):
    quiz_id: UUID
    quiz_topic: str
    subject_id: UUID
    subject_name: str | None = None
    class_size: int  # enrolled students (denominator for completion)
    attempt_count: int
    completion_pct: int
    avg_score: int | None = None  # None when attempt_count == 0
    grade_distribution: list[GradeBandOut]
    question_accuracy: list[QuestionAccuracyOut]
    weak_topics: list[WeakTopicOut]
    empty: bool  # True when attempt_count == 0 (explicit empty state)


# ── Student progress (teacher-facing) ─────────────────────────────────────────

class StudentProgressRowOut(BaseModel):
    student_id: UUID
    name: str
    subjects: list[str]  # subject names in the queried scope
    avg_score: int | None = None
    completion_pct: int
    last_active: datetime.datetime | None = None
    at_risk: bool
    assessed: bool  # True when the student has at least one attempt in scope


class StudentProgressRosterOut(BaseModel):
    subject_id: UUID | None = None
    subject_name: str | None = None
    students: list[StudentProgressRowOut]


class QuizHistoryOut(BaseModel):
    quiz_id: UUID
    quiz_title: str
    subject_id: UUID
    subject_name: str | None = None
    score: int
    submitted_at: datetime.datetime


class StudentProgressDetailOut(BaseModel):
    student_id: UUID
    name: str
    subjects: list[str]
    avg_score: int | None = None
    completion_pct: int
    last_active: datetime.datetime | None = None
    at_risk: bool
    assessed: bool
    quiz_history: list[QuizHistoryOut]


# ── Teacher dashboard ─────────────────────────────────────────────────────────

class RecentActivityOut(BaseModel):
    attempt_id: UUID
    student_id: UUID
    student_name: str
    quiz_id: UUID
    quiz_title: str
    subject_id: UUID
    subject_name: str | None = None
    score: int
    submitted_at: datetime.datetime
    at_risk: bool


class TeacherDashboardStatsOut(BaseModel):
    active_students: int  # distinct students with an attempt in taught subjects
    subject_materials: int  # ready materials in taught subjects
    quizzes_created: int  # all quizzes (draft + published) in taught subjects
    avg_section_score: int | None = None
    grade_distribution: list[GradeBandOut]
    recent_activity: list[RecentActivityOut]


# ── Student dashboard / subject cards ─────────────────────────────────────────

class SubjectTeacherOut(BaseModel):
    id: UUID
    name: str


class StudentSubjectOut(BaseModel):
    """Accessible subject card for a student (multi-teacher aware)."""

    subject_id: UUID
    name: str
    teachers: list[SubjectTeacherOut]
    progress: int | None = None  # completion across published quizzes, None if none published


class TeacherSubjectOut(BaseModel):
    """Subject tab card for a teacher."""

    subject_id: UUID
    name: str
    teachers: list[SubjectTeacherOut]


class StudentStatsOut(BaseModel):
    quizzes_taken: int
    weak_topics_count: int  # distinct weak-topic names across attempts
    avg_score: int | None = None
    recent_materials: list[MaterialResponse]
