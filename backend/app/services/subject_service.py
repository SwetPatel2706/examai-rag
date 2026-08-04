from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID
from typing import List

from app.models.user import User
from app.models.subject import Subject, SubjectTeacher, StudentSubject

def get_user_subjects(db: Session, user: User) -> List[Subject]:
    """Get all subjects accessible by the given user based on role."""
    if user.role == "teacher":
        return (
            db.query(Subject)
            .join(SubjectTeacher, Subject.id == SubjectTeacher.subject_id)
            .filter(SubjectTeacher.teacher_id == user.id)
            .all()
        )
    elif user.role == "student":
        return (
            db.query(Subject)
            .join(StudentSubject, Subject.id == StudentSubject.subject_id)
            .filter(StudentSubject.student_id == user.id)
            .all()
        )
    return []

def check_subject_access(db: Session, subject_id: UUID, user: User) -> Subject:
    """
    Check if the user has access to the subject.
    If not, raise HTTP 403 Forbidden.
    Returns the subject if access is authorized.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    # Membership is checked before existence so non-members receive 403 without probing existence.

    if user.role == "teacher":
        membership = (
            db.query(SubjectTeacher)
            .filter(
                SubjectTeacher.subject_id == subject_id,
                SubjectTeacher.teacher_id == user.id
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden. You are not a registered teacher for this subject."
            )
    elif user.role == "student":
        membership = (
            db.query(StudentSubject)
            .filter(
                StudentSubject.subject_id == subject_id,
                StudentSubject.student_id == user.id
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden. You are not enrolled in this subject."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Unknown role."
        )
    
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found"
        )
    return subject

def get_subject_teachers(db: Session, subject_id: UUID) -> List[User]:
    """Get the list of teachers for a subject."""
    return (
        db.query(User)
        .join(SubjectTeacher, User.id == SubjectTeacher.teacher_id)
        .filter(SubjectTeacher.subject_id == subject_id)
        .all()
    )
