import uuid
import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, DateTime, ForeignKey
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import UUID
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.db.session import Base

class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # e.g., "pdf", "pptx", "docx"
    storage_path = Column(String, nullable=False)
    status = Column(String, default="processing", nullable=False)  # "processing", "ready", "failed"
    
    # Metadata editable by teacher
    display_name = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    
    uploaded_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    subject = relationship("Subject", backref="materials")
    teacher = relationship("User", backref="materials_uploaded")
