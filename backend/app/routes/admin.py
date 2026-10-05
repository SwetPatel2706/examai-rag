"""Simplest admin endpoints: CRUD for teachers/students and subjects + membership.

All routes are gated on ``require_admin``. Users provisioned here get both a
Supabase Auth account (so they can log in immediately) and a local DB profile
sharing the same UUID — mirroring ``seed.py:provision_user``.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_admin
from app.auth.supabase_client import supabase_auth
from app.db.session import get_db
from app.models.subject import StudentSubject, Subject, SubjectTeacher
from app.models.user import User
from app.schemas.admin import (
    AdminMembershipCreate,
    AdminSubjectCreate,
    AdminSubjectUpdate,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
)
from app.schemas.common import StandardResponse
from app.schemas.subject import SubjectResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

MANAGEABLE_ROLES = ("teacher", "student")


# ── Users ────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=StandardResponse)
def list_users(
    role: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List teachers/students (never admins) with optional role + search filter."""
    if role is not None and role not in MANAGEABLE_ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "role must be 'teacher' or 'student'")
    query = db.query(User).filter(User.role.in_(MANAGEABLE_ROLES))
    if role:
        query = query.filter(User.role == role)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter((User.email.ilike(like)) | (User.name.ilike(like)))
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()
    items = [AdminUserResponse.model_validate(u).model_dump(mode="json") for u in users]
    pages = (total + size - 1) // size
    return StandardResponse.ok(data={"items": items, "total": total, "page": page, "pages": pages, "size": size})


@router.get("/users/{user_id}", response_model=StandardResponse)
def get_user(
    user_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in MANAGEABLE_ROLES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return StandardResponse.ok(data=AdminUserResponse.model_validate(user).model_dump(mode="json"))


@router.post("/users", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: AdminUserCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists")
    try:
        sb_user = await supabase_auth.admin_create_user(email, body.password)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
    except Exception as e:
        logger.warning("Supabase admin_create_user failed: %s %s", type(e).__name__, e)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Failed to create auth account") from e
    try:
        user_uuid = uuid.UUID(sb_user["id"])
    except (KeyError, ValueError, TypeError) as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Auth provider returned an invalid user id") from e
    user = User(id=user_uuid, email=email, name=body.name, role=body.role)
    db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        try:
            await supabase_auth.admin_delete_user(str(user_uuid))
        except Exception as cleanup_error:
            logger.warning(
                "Supabase admin_delete_user cleanup failed for %s: %s %s",
                user_uuid, type(cleanup_error).__name__, cleanup_error,
            )
        raise
    db.refresh(user)
    return StandardResponse.ok(data=AdminUserResponse.model_validate(user).model_dump(mode="json"))


@router.patch("/users/{user_id}", response_model=StandardResponse)
def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in MANAGEABLE_ROLES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if body.name is not None:
        user.name = body.name
    if body.role is not None and body.role != user.role:
        # A role change invalidates the previous role's memberships: a
        # teacher-turned-student must lose their subject assignments (and
        # vice versa), otherwise stale rows leak across role semantics.
        previous_role = user.role
        user.role = body.role
        if previous_role == "teacher":
            db.query(SubjectTeacher).filter_by(teacher_id=user_id).delete(synchronize_session=False)
        else:
            db.query(StudentSubject).filter_by(student_id=user_id).delete(synchronize_session=False)
    db.commit()
    db.refresh(user)
    return StandardResponse.ok(data=AdminUserResponse.model_validate(user).model_dump(mode="json"))


@router.delete("/users/{user_id}", response_model=StandardResponse)
async def delete_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Admins cannot delete their own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in MANAGEABLE_ROLES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    # Bulk delete: the User model declares no ORM relationships and every
    # FK to users.id is ON DELETE CASCADE, so dependent rows are handled by
    # the database. Session sync is disabled since the loaded instance is
    # not touched again in this request.
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()
    try:
        await supabase_auth.admin_delete_user(str(user_id))
    except Exception as e:
        # Local row is already gone; don't fail the request over the remote
        # cleanup, just log so an operator can reconcile in Supabase.
        logger.warning("Supabase admin_delete_user failed for %s: %s %s", user_id, type(e).__name__, e)
    return StandardResponse.ok(data={"message": "User deleted"})


# ── Subjects ─────────────────────────────────────────────────────────────────

@router.get("/subjects", response_model=StandardResponse)
def list_subjects(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List ALL subjects (unlike GET /api/subjects which is membership-filtered)."""
    subjects = db.query(Subject).order_by(Subject.name).all()
    data = [SubjectResponse.model_validate(s).model_dump(mode="json") for s in subjects]
    return StandardResponse.ok(data=data)


@router.post("/subjects", response_model=StandardResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    body: AdminSubjectCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = body.name.strip()
    if db.query(Subject).filter(Subject.name == name).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A subject with this name already exists")
    subject = Subject(name=name)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return StandardResponse.ok(data=SubjectResponse.model_validate(subject).model_dump(mode="json"))


@router.patch("/subjects/{subject_id}", response_model=StandardResponse)
def update_subject(
    subject_id: uuid.UUID,
    body: AdminSubjectUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    name = body.name.strip()
    dup = db.query(Subject).filter(Subject.name == name, Subject.id != subject_id).first()
    if dup:
        raise HTTPException(status.HTTP_409_CONFLICT, "A subject with this name already exists")
    subject.name = name
    db.commit()
    db.refresh(subject)
    return StandardResponse.ok(data=SubjectResponse.model_validate(subject).model_dump(mode="json"))


@router.delete("/subjects/{subject_id}", response_model=StandardResponse)
def delete_subject(
    subject_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    db.delete(subject)
    db.commit()
    return StandardResponse.ok(data={"message": "Subject deleted"})


# ── Membership ───────────────────────────────────────────────────────────────

def _get_subject_or_404(db: Session, subject_id: uuid.UUID) -> Subject:
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subject not found")
    return subject


def _get_managed_user_or_400(db: Session, user_id: uuid.UUID, expected_role: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != expected_role:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"User is not a {expected_role}",
        )
    return user


@router.post("/subjects/{subject_id}/teachers", response_model=StandardResponse)
def assign_teacher(
    subject_id: uuid.UUID,
    body: AdminMembershipCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _get_subject_or_404(db, subject_id)
    if not body.teacher_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "teacher_id is required")
    _get_managed_user_or_400(db, body.teacher_id, "teacher")
    exists = db.query(SubjectTeacher).filter_by(subject_id=subject_id, teacher_id=body.teacher_id).first()
    if not exists:
        db.add(SubjectTeacher(subject_id=subject_id, teacher_id=body.teacher_id))
        db.commit()
    return StandardResponse.ok(data={"message": "Teacher assigned"})


@router.delete("/subjects/{subject_id}/teachers/{teacher_id}", response_model=StandardResponse)
def unassign_teacher(
    subject_id: uuid.UUID,
    teacher_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _get_subject_or_404(db, subject_id)
    row = db.query(SubjectTeacher).filter_by(subject_id=subject_id, teacher_id=teacher_id).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    db.delete(row)
    db.commit()
    return StandardResponse.ok(data={"message": "Teacher unassigned"})


@router.post("/subjects/{subject_id}/students", response_model=StandardResponse)
def enroll_student(
    subject_id: uuid.UUID,
    body: AdminMembershipCreate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _get_subject_or_404(db, subject_id)
    if not body.student_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "student_id is required")
    _get_managed_user_or_400(db, body.student_id, "student")
    exists = db.query(StudentSubject).filter_by(subject_id=subject_id, student_id=body.student_id).first()
    if not exists:
        db.add(StudentSubject(subject_id=subject_id, student_id=body.student_id))
        db.commit()
    return StandardResponse.ok(data={"message": "Student enrolled"})


@router.delete("/subjects/{subject_id}/students/{student_id}", response_model=StandardResponse)
def unenroll_student(
    subject_id: uuid.UUID,
    student_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    _get_subject_or_404(db, subject_id)
    row = db.query(StudentSubject).filter_by(subject_id=subject_id, student_id=student_id).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Enrollment not found")
    db.delete(row)
    db.commit()
    return StandardResponse.ok(data={"message": "Student unenrolled"})


# ── Drill-down ───────────────────────────────────────────────────────────────

@router.get("/users/{user_id}/subjects", response_model=StandardResponse)
def get_user_subjects(
    user_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Subjects a teacher is assigned to / a student is enrolled in."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role not in MANAGEABLE_ROLES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.role == "teacher":
        subjects = (
            db.query(Subject)
            .join(SubjectTeacher, Subject.id == SubjectTeacher.subject_id)
            .filter(SubjectTeacher.teacher_id == user_id)
            .order_by(Subject.name)
            .all()
        )
    else:
        subjects = (
            db.query(Subject)
            .join(StudentSubject, Subject.id == StudentSubject.subject_id)
            .filter(StudentSubject.student_id == user_id)
            .order_by(Subject.name)
            .all()
        )
    data = [SubjectResponse.model_validate(s).model_dump(mode="json") for s in subjects]
    return StandardResponse.ok(data=data)


@router.get("/subjects/{subject_id}/members", response_model=StandardResponse)
def get_subject_members(
    subject_id: uuid.UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Teachers assigned to and students enrolled in a subject."""
    _get_subject_or_404(db, subject_id)
    teachers = (
        db.query(User)
        .join(SubjectTeacher, User.id == SubjectTeacher.teacher_id)
        .filter(SubjectTeacher.subject_id == subject_id)
        .order_by(User.name)
        .all()
    )
    students = (
        db.query(User)
        .join(StudentSubject, User.id == StudentSubject.student_id)
        .filter(StudentSubject.subject_id == subject_id)
        .order_by(User.name)
        .all()
    )
    return StandardResponse.ok(data={
        "teachers": [AdminUserResponse.model_validate(t).model_dump(mode="json") for t in teachers],
        "students": [AdminUserResponse.model_validate(s).model_dump(mode="json") for s in students],
    })
