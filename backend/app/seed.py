import uuid
import sys
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, Base, engine
from app.models.user import User
from app.models.subject import Subject, SubjectTeacher, StudentSubject
from app.models.material import Material
from app.auth.supabase_client import supabase_auth

def seed_data():
    db: Session = SessionLocal()
    try:
        print("Starting seeding process...")

        # 1. Create target users in Supabase Auth & Local DB
        users_to_seed = [
            {
                "email": "teacher1@examai.com",
                "password": "Password123!",
                "name": "Dr. Alice Smith",
                "role": "teacher"
            },
            {
                "email": "teacher2@examai.com",
                "password": "Password123!",
                "name": "Dr. Bob Jones",
                "role": "teacher"
            },
            {
                "email": "student1@examai.com",
                "password": "Password123!",
                "name": "Charlie Student",
                "role": "student"
            },
            {
                "email": "student2@examai.com",
                "password": "Password123!",
                "name": "Diana Student",
                "role": "student"
            }
        ]

        db_users = {}
        for u in users_to_seed:
            email_lower = u["email"].lower().strip()
            print(f"Provisioning {u['role']} user: {email_lower}")
            
            # Create user in Supabase Auth via admin API
            try:
                sb_user = supabase_auth.admin_create_user(email_lower, u["password"])
                sb_uid = uuid.UUID(sb_user["id"])
            except Exception as e:
                print(f"Error provisioning {email_lower} in Supabase: {e}")
                continue

            # Create or update profile in local DB
            db_user = db.query(User).filter(User.id == sb_uid).first()
            if not db_user:
                db_user = User(
                    id=sb_uid,
                    email=email_lower,
                    name=u["name"],
                    role=u["role"]
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)
                print(f"Created local DB profile for {email_lower}")
            else:
                db_user.name = u["name"]
                db_user.role = u["role"]
                db.commit()
                print(f"Updated existing local DB profile for {email_lower}")
            
            db_users[email_lower] = db_user

        # Verify we successfully created at least one user
        if not db_users:
            print("Failed to provision any users. Seeding aborted.")
            return

        # 2. Create Subjects
        print("Setting up subjects...")
        subjects_data = [
            "Software Engineering",
            "Advanced Database Systems"
        ]
        db_subjects = {}
        for sub_name in subjects_data:
            subject = db.query(Subject).filter(Subject.name == sub_name).first()
            if not subject:
                subject = Subject(name=sub_name)
                db.add(subject)
                db.commit()
                db.refresh(subject)
                print(f"Created subject: {sub_name}")
            db_subjects[sub_name] = subject

        # 3. Assign Teachers to Subjects
        se_subject = db_subjects["Software Engineering"]
        db_subject = db_subjects["Advanced Database Systems"]

        teachers_assignment = [
            (se_subject.id, db_users["teacher1@examai.com"].id),
            (se_subject.id, db_users["teacher2@examai.com"].id),
            (db_subject.id, db_users["teacher1@examai.com"].id)
        ]

        for s_id, t_id in teachers_assignment:
            exists = db.query(SubjectTeacher).filter_by(subject_id=s_id, teacher_id=t_id).first()
            if not exists:
                assignment = SubjectTeacher(subject_id=s_id, teacher_id=t_id)
                db.add(assignment)
                db.commit()
                print(f"Assigned teacher {t_id} to subject {s_id}")

        # 4. Enroll Students in Subjects
        enrollments = [
            (se_subject.id, db_users["student1@examai.com"].id),
            (se_subject.id, db_users["student2@examai.com"].id),
            (db_subject.id, db_users["student2@examai.com"].id)
        ]

        for s_id, st_id in enrollments:
            exists = db.query(StudentSubject).filter_by(subject_id=s_id, student_id=st_id).first()
            if not exists:
                enrollment = StudentSubject(subject_id=s_id, student_id=st_id)
                db.add(enrollment)
                db.commit()
                print(f"Enrolled student {st_id} in subject {s_id}")

        # 5. Create Empty Material Records
        materials_data = [
            {
                "subject_id": se_subject.id,
                "teacher_id": db_users["teacher1@examai.com"].id,
                "filename": "lecture1_intro.pdf",
                "file_type": "pdf",
                "storage_path": "materials/lecture1_intro.pdf",
                "status": "ready",
                "display_name": "Lecture 1: Intro to SE",
                "notes": "Introduces basic Software Engineering lifecycle concepts."
            },
            {
                "subject_id": se_subject.id,
                "teacher_id": db_users["teacher1@examai.com"].id,
                "filename": "lecture2_agile.pdf",
                "file_type": "pdf",
                "storage_path": "materials/lecture2_agile.pdf",
                "status": "processing",
                "display_name": "Lecture 2: Agile Processes",
                "notes": "Covers Scrum, Kanban, and Sprint Planning."
            },
            {
                "subject_id": se_subject.id,
                "teacher_id": db_users["teacher2@examai.com"].id,
                "filename": "lecture3_git.pdf",
                "file_type": "pdf",
                "storage_path": "materials/lecture3_git.pdf",
                "status": "failed",
                "display_name": "Lecture 3: Git & Version Control",
                "notes": "Covers branch management and conflict resolution."
            }
        ]

        for mat in materials_data:
            exists = db.query(Material).filter_by(
                subject_id=mat["subject_id"],
                teacher_id=mat["teacher_id"],
                filename=mat["filename"]
            ).first()
            if not exists:
                m = Material(**mat)
                db.add(m)
                db.commit()
                print(f"Created material metadata: {mat['filename']}")

        print("Seeding completed successfully.")

    except Exception as e:
        print(f"Fatal error during seeding: {e}", file=sys.stderr)
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
