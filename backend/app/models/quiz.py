import uuid
import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON, UniqueConstraint
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship, backref
from app.db.session import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String, nullable=False)
    source = Column(String, nullable=False)  # "manual" | "ai_generated"
    status = Column(String, default="draft", nullable=False)  # "draft" | "published"
    time_limit_seconds = Column(Integer, nullable=True)  # optional per-quiz time limit
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    # Relationships
    subject = relationship("Subject", backref="quizzes")
    teacher = relationship("User", backref="quizzes_created")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(String, nullable=False)
    options = Column(JSON, nullable=False)  # JSON list of options
    correct_option = Column(String, nullable=False)
    topic_tag = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)

    quiz = relationship("Quiz", backref=backref("questions", cascade="all, delete-orphan"))

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    answers = Column(JSON, nullable=False)  # JSON mapping question_id -> selected option
    score = Column(Integer, nullable=False)  # percentage 0-100, computed server-side
    weak_topics = Column(JSON, nullable=True)  # [{topic, accuracy}]
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    # One attempt per student per quiz — this constraint is load-bearing for
    # duplicate-submission idempotency (a retried insert conflicts and the
    # service maps it back to the existing attempt).
    __table_args__ = (
        UniqueConstraint("quiz_id", "student_id", name="uq_quiz_attempt_student"),
    )

    quiz = relationship("Quiz", backref=backref("attempts", cascade="all, delete-orphan"))
    student = relationship("User", backref="quiz_attempts")
