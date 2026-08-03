# Import all the models here so that Alembic or SQLAlchemy can detect them.
from app.db.session import Base
from app.models.user import User
from app.models.subject import Subject, SubjectTeacher, StudentSubject
from app.models.material import Material
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.models.flashcard import FlashcardDeck, Flashcard
