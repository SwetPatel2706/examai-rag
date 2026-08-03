import uuid
import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.session import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String, nullable=False)
    source = Column(String, nullable=False)  # "manual" | "ai_generated"
    status = Column(String, default="draft", nullable=False)  # "draft" | "published"
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)

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

    quiz = relationship("Quiz", backref="questions")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    quiz_id = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    answers = Column(JSON, nullable=False)  # JSON answers dict/list
    score = Column(Integer, nullable=False)
    weak_topics = Column(JSON, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)

    quiz = relationship("Quiz", backref="attempts")
    student = relationship("User", backref="quiz_attempts")
