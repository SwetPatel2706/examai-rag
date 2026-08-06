import argparse
import asyncio
import datetime
import random
import sys
import uuid
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.user import User
from app.models.subject import Subject, SubjectTeacher, StudentSubject
from app.models.material import Material
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.models.flashcard import FlashcardDeck, Flashcard
from app.auth.supabase_client import supabase_auth
from app.seed_data import (
    TEACHERS,
    STUDENTS,
    SUBJECTS,
    SUBJECT_TEACHERS,
    SUBJECT_ENROLLMENTS,
    MATERIALS,
    QUIZZES,
    FLASHCARD_DECKS,
)

PASSWORD = "Password123!"


# ── Helpers ───────────────────────────────────────────────────────────────────

async def provision_user(db: Session, email: str, name: str, role: str, password: str) -> User:
    """Create the Supabase Auth user if needed, then create/update the local
    profile. Returns the local DB user (the auth and DB records share the id)."""
    email_lower = email.lower().strip()
    sb_user = await supabase_auth._admin_get_user_by_email(email_lower)
    if not sb_user:
        sb_user = await supabase_auth.admin_create_user(email_lower, password)
    sb_uid = uuid.UUID(sb_user["id"])
    db_user = db.query(User).filter(User.id == sb_uid).first()
    if not db_user:
        db_user = User(id=sb_uid, email=email_lower, name=name, role=role)
        db.add(db_user)
        print(f"Created local DB profile for {email_lower} ({role})")
    else:
        db_user.name = name
        db_user.role = role
        print(f"Updated existing local DB profile for {email_lower} ({role})")
    return db_user


def get_or_create_subject(db: Session, name: str) -> Subject:
    subject = db.query(Subject).filter(Subject.name == name).first()
    if not subject:
        subject = Subject(name=name)
        db.add(subject)
        db.commit()
        db.refresh(subject)
        print(f"Created subject: {name}")
    return subject


def compute_weak_topics(question_map: dict[str, QuizQuestion], answers: dict[str, str]) -> list[dict]:
    """Mirror grading_service.compute_weak_topics: any tagged topic answered
    with less than 100% accuracy is a weak topic."""
    by_topic: dict[str, dict] = {}
    for question_id, question in question_map.items():
        if not question.topic_tag:
            continue
        if question_id in answers:
            stats = by_topic.setdefault(question.topic_tag, {"correct": 0, "total": 0})
            stats["total"] += 1
            if answers[question_id] == question.correct_option:
                stats["correct"] += 1
    weak_topics = []
    for topic, stats in by_topic.items():
        accuracy = round(stats["correct"] / stats["total"] * 100)
        if accuracy < 100:
            weak_topics.append({"topic": topic, "accuracy": accuracy})
    return weak_topics


def seed_rag_content(db: Session, materials_by_filename: dict[str, tuple[Material, dict]]) -> None:
    """Embed synthetic material content into Qdrant so Chat answers and
    Flashcard generation resolve real, citable chunks. Only embeds materials
    whose dataset status is ``ready`` (failed/processing rows are skipped)."""
    from app.config import settings
    from app.services.ingestion.chunker import chunk_documents
    from app.services.ingestion.embedder import LocalEmbedder
    from app.utils.qdrant_client import QdrantStore, point_id

    embedder = LocalEmbedder(settings.EMBEDDING_MODEL)
    qdrant = QdrantStore()
    embedded = 0
    total_chunks = 0
    for filename, (material, mat_data) in materials_by_filename.items():
        if mat_data["status"] != "ready" or not mat_data["content"]:
            continue
        documents = [
            {"text": paragraph, "metadata": {"source_locator": {"type": "page", "value": i + 1}}}
            for i, paragraph in enumerate(mat_data["content"])
        ]
        chunks = chunk_documents(documents, file_type="pdf")
        vectors = embedder.embed([chunk.text for chunk in chunks])
        qdrant.ensure_collection(len(vectors[0]))
        payloads = [
            {
                "material_id": str(material.id),
                "teacher_id": str(material.teacher_id),
                "teacher_name": material.teacher.name,
                "subject_id": str(material.subject_id),
                "filename": material.filename,
                "chunk_text": chunk.text,
                "chunk_index": chunk.index,
                "source_locator": chunk.metadata["source_locator"],
            }
            for chunk in chunks
        ]
        ids = [point_id(material.id, chunk.index) for chunk in chunks]
        # Replacing (not appending) keeps re-runs idempotent.
        qdrant.delete_material(material.id)
        qdrant.upsert(vectors, payloads, ids)
        material.status = "ready"
        material.processed_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        embedded += 1
        total_chunks += len(chunks)
        print(f"  Embedded {len(chunks)} chunk(s) for {filename}")
    print(f"RAG content embedded for {embedded} material(s), {total_chunks} chunk(s) total.")


# ── Main seed flow ────────────────────────────────────────────────────────────

async def seed_data(with_rag: bool = False):
    db: Session = SessionLocal()
    try:
        print("Starting seeding process...")
        now = datetime.datetime.now(datetime.timezone.utc)

        # 1. Provision all users (teachers + students) in Supabase Auth + local DB.
        users = {}
        for u in TEACHERS + STUDENTS:
            user = await provision_user(db, u["email"], u["name"], u.get("role", "student"), u.get("password", PASSWORD))
            users[u["email"]] = user
        db.commit()

        # 2. Subjects.
        subjects = {name: get_or_create_subject(db, name) for name in SUBJECTS}

        # 3. Teacher assignments (two co-teachers per subject).
        for name, teacher_emails in SUBJECT_TEACHERS.items():
            subject = subjects[name]
            for email in teacher_emails:
                teacher = users[email]
                exists = db.query(SubjectTeacher).filter_by(subject_id=subject.id, teacher_id=teacher.id).first()
                if not exists:
                    db.add(SubjectTeacher(subject_id=subject.id, teacher_id=teacher.id))
        db.commit()
        print("Teacher assignments ready.")

        # 4. Student enrollments.
        for name, student_emails in SUBJECT_ENROLLMENTS.items():
            subject = subjects[name]
            for email in student_emails:
                student = users[email]
                exists = db.query(StudentSubject).filter_by(subject_id=subject.id, student_id=student.id).first()
                if not exists:
                    db.add(StudentSubject(subject_id=subject.id, student_id=student.id))
        db.commit()
        print("Student enrollments ready.")

        # 5. Materials (metadata rows; content only matters for --with-rag).
        materials_by_filename: dict[str, tuple[Material, dict]] = {}
        for i, mat in enumerate(MATERIALS):
            subject = subjects[mat["subject"]]
            teacher = users[mat["teacher"]]
            material = db.query(Material).filter_by(
                subject_id=subject.id, teacher_id=teacher.id, filename=mat["filename"]
            ).first()
            if not material:
                material = Material(
                    subject_id=subject.id,
                    teacher_id=teacher.id,
                    filename=mat["filename"],
                    file_type=mat["file_type"],
                    storage_path=f"materials/{mat['filename']}",
                    status=mat["status"],
                    ingestion_version=0,
                    display_name=mat["display_name"],
                    notes=mat["notes"],
                    uploaded_at=now - datetime.timedelta(days=30 + i * 2),
                )
                db.add(material)
                db.commit()
                db.refresh(material)
                print(f"Created material metadata: {mat['filename']} ({mat['status']})")
            else:
                material.display_name = mat["display_name"]
                material.notes = mat["notes"]
            materials_by_filename[mat["filename"]] = (material, mat)
        db.commit()

        # 6. Quizzes (shared, teacher-authored).
        quizzes_by_subject = {name: [] for name in SUBJECTS}
        for i, quiz_data in enumerate(QUIZZES):
            subject = subjects[quiz_data["subject"]]
            teacher = users[quiz_data["teacher"]]
            quiz = db.query(Quiz).filter_by(
                subject_id=subject.id, teacher_id=teacher.id, topic=quiz_data["topic"]
            ).first()
            if not quiz:
                quiz = Quiz(
                    subject_id=subject.id,
                    teacher_id=teacher.id,
                    topic=quiz_data["topic"],
                    source=quiz_data["source"],
                    status=quiz_data["status"],
                    time_limit_seconds=quiz_data["time_limit_seconds"],
                    created_at=now - datetime.timedelta(days=21 - min(18, i * 2)),
                )
                quiz.questions = [QuizQuestion(**q) for q in quiz_data["questions"]]
                db.add(quiz)
                db.commit()
                db.refresh(quiz)
                print(f"Created quiz: {quiz_data['topic']} ({quiz_data['status']}, {len(quiz.questions)} questions)")
            elif quiz_data["status"] == "published" and quiz.status == "draft":
                quiz.status = "published"
                db.commit()
            quizzes_by_subject[quiz_data["subject"]].append(quiz)
        db.commit()

        # 7. Quiz attempts (realistic, deterministic, idempotent).
        # Each (quiz, student) pair draws from its own deterministic RNG keyed by
        # the pair, so re-runs never shift a shared stream and never add rows for
        # pairs that already have an attempt. Participation/ability are per
        # student (drawn once from a fixed-seed RNG), which keeps the dataset
        # coherent across quizzes.
        rng = random.Random(42)
        enrolled_students = {name: [users[email] for email in emails] for name, emails in SUBJECT_ENROLLMENTS.items()}
        abilities = {u.id: rng.uniform(0.45, 0.98) for u in users.values() if u.role == "student"}
        participation = {u.id: rng.uniform(0.6, 1.0) for u in users.values() if u.role == "student"}

        attempts_created = 0
        for subject_name, quiz_list in quizzes_by_subject.items():
            students = enrolled_students[subject_name]
            for quiz in quiz_list:
                if quiz.status != "published":
                    continue
                question_map = {str(q.id): q for q in quiz.questions}
                for student in students:
                    pair_rng = random.Random(f"{quiz.id}:{student.id}")
                    if pair_rng.random() > participation[student.id]:
                        continue
                    existing = db.query(QuizAttempt).filter_by(quiz_id=quiz.id, student_id=student.id).first()
                    if existing:
                        continue
                    answers = {}
                    for qid, question in question_map.items():
                        if pair_rng.random() < abilities[student.id]:
                            answers[qid] = question.correct_option
                        else:
                            wrong = [o for o in question.options if o != question.correct_option]
                            answers[qid] = pair_rng.choice(wrong)
                    total = len(question_map)
                    correct = sum(1 for qid, question in question_map.items() if answers[qid] == question.correct_option)
                    score = round(correct / total * 100) if total else 0
                    attempt = QuizAttempt(
                        quiz_id=quiz.id,
                        student_id=student.id,
                        answers=answers,
                        score=score,
                        weak_topics=compute_weak_topics(question_map, answers),
                        submitted_at=now - datetime.timedelta(days=pair_rng.uniform(0, 21), hours=pair_rng.uniform(0, 24)),
                    )
                    db.add(attempt)
                    attempts_created += 1
        db.commit()
        print(f"Seeded {attempts_created} quiz attempt(s).")

        # 8. Flashcard decks (student-generated, personal).
        decks_created = 0
        for deck_data in FLASHCARD_DECKS:
            student = users[deck_data["student"]]
            subject = subjects[deck_data["subject"]]
            deck = db.query(FlashcardDeck).filter_by(student_id=student.id, title=deck_data["title"]).first()
            if deck:
                continue
            source_ids = [
                str(materials_by_filename[filename][0].id)
                for filename in deck_data["source_material_filenames"]
                if filename in materials_by_filename
            ]
            deck = FlashcardDeck(
                student_id=student.id,
                subject_id=subject.id,
                source_material_ids=source_ids,
                title=deck_data["title"],
                created_at=now - datetime.timedelta(days=deck_data["days_ago"]),
            )
            deck.cards = [
                Flashcard(front=c["front"], back=c["back"], mastery_state=c["mastery_state"])
                for c in deck_data["cards"]
            ]
            db.add(deck)
            decks_created += 1
        db.commit()
        print(f"Seeded {decks_created} flashcard deck(s).")

        # 9. Optional RAG content.
        if with_rag:
            seed_rag_content(db, materials_by_filename)

        summary = {
            "users": db.query(User).count(),
            "subjects": db.query(Subject).count(),
            "materials": db.query(Material).count(),
            "quizzes": db.query(Quiz).count(),
            "attempts": db.query(QuizAttempt).count(),
            "decks": db.query(FlashcardDeck).count(),
            "flashcards": db.query(Flashcard).count(),
        }
        print(f"Seeding completed. Summary: {summary}")

    except Exception as e:
        print(f"Fatal error during seeding: {e}", file=sys.stderr)
        if db:
            db.rollback()
        raise e
    finally:
        db.close()
        if supabase_auth.client:
            await supabase_auth.client.aclose()


def main():
    parser = argparse.ArgumentParser(description="Seed ExamAI demo data (users, subjects, materials, quizzes, attempts, decks).")
    parser.add_argument(
        "--with-rag",
        action="store_true",
        help="Also embed synthetic material content into Qdrant so Chat answers and Flashcard generation work end-to-end.",
    )
    args = parser.parse_args()
    asyncio.run(seed_data(with_rag=args.with_rag))


if __name__ == "__main__":
    main()
