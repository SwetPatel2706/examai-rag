import uuid
import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.session import Base

class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    source_material_ids = Column(JSON, nullable=True)  # List of material IDs used to generate this deck
    title = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    student = relationship("User", backref="flashcard_decks")
    subject = relationship("Subject", backref="flashcard_decks")

class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("flashcard_decks.id", ondelete="CASCADE"), nullable=False)
    front = Column(String, nullable=False)
    back = Column(String, nullable=False)
    mastery_state = Column(String, default="new", nullable=False)  # "new", "learning", "mastered"

    # Relationships
    deck = relationship("FlashcardDeck", backref="cards")
