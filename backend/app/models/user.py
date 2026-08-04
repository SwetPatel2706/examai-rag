import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, DateTime, Uuid
# pyrefly: ignore [missing-import]
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid(as_uuid=True), primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False)  # "student" | "teacher"
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
