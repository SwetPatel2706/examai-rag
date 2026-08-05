from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.material import Material
from app.models.user import User
from app.services.ingestion.embedder import LocalEmbedder
from app.services.subject_service import check_subject_access
from app.utils.qdrant_client import QdrantStore


@dataclass(frozen=True)
class RetrievedChunk:
    number: int
    payload: dict
    score: float | None = None


def authorize_materials(db: Session, user: User, subject_id: UUID, material_ids: list[UUID]) -> list[UUID]:
    check_subject_access(db, subject_id, user)
    requested = list(dict.fromkeys(material_ids))
    ready = {
        material.id
        for material in db.query(Material)
        .filter(Material.id.in_(requested), Material.subject_id == subject_id, Material.status == "ready")
        .all()
    }
    if set(requested) != ready:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="One or more selected materials are not authorized, ready, or in this subject.",
        )
    return requested


class MaterialRetriever:
    def __init__(self, qdrant=None, embedder=None):
        self.qdrant = qdrant or QdrantStore()
        self.embedder = embedder or LocalEmbedder(settings.EMBEDDING_MODEL)

    def retrieve(self, question: str, db: Session, user: User, subject_id: UUID, material_ids: list[UUID]) -> list[RetrievedChunk]:
        authorized_ids = authorize_materials(db, user, subject_id, material_ids)
        query_vector = self.embedder.embed([question])[0]
        points = self.qdrant.query(query_vector, subject_id, authorized_ids, limit=settings.RAG_TOP_K)
        return [RetrievedChunk(i, point.payload or {}, getattr(point, "score", None)) for i, point in enumerate(points, 1)]

    def retrieve_for(self, question: str, db: Session, user: User, subject_id: UUID, material_ids: list[UUID]) -> list[RetrievedChunk]:
        return self.retrieve(question, db, user, subject_id, material_ids)


def build_context(chunks: list[RetrievedChunk], max_chars: int | None = None) -> str:
    if max_chars is None:
        max_chars = settings.RAG_MAX_CONTEXT_CHARS
    parts: list[str] = []
    used = 0
    for chunk in chunks:
        text = str(chunk.payload.get("chunk_text", "")).strip()
        if not text:
            continue
        item = f"[{chunk.number}] {text}"
        
        separator_len = 2 if parts else 0
        remaining = max_chars - used - separator_len
        
        if remaining <= 0:
            break
            
        parts.append(item[:remaining])
        used += separator_len + min(len(item), remaining)
    return "\n\n".join(parts)
