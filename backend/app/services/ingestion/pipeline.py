import logging
import threading
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import update
from app.config import settings
from app.models.material import Material
from app.services.ingestion.parsers import PARSERS
from app.services.ingestion.chunker import chunk_documents
from app.services.ingestion.embedder import LocalEmbedder
from app.utils.qdrant_client import QdrantStore, point_id

logger = logging.getLogger(__name__)
_MATERIAL_LOCKS: dict[UUID, threading.RLock] = {}
_LOCKS_GUARD = threading.Lock()

def _material_lock(material_id: UUID) -> threading.RLock:
    with _LOCKS_GUARD:
        return _MATERIAL_LOCKS.setdefault(material_id, threading.RLock())

class IngestionPipeline:
    def __init__(self, qdrant=None, embedder=None):
        self.qdrant = qdrant or QdrantStore()
        self.embedder = embedder or LocalEmbedder(settings.EMBEDDING_MODEL)

    def _guard(self, db: Session, material_id: UUID, version: int) -> Material:
        material = db.query(Material).filter(Material.id == material_id).first()
        if not material or material.status == "deleting" or material.ingestion_version != version:
            raise RuntimeError("Ingestion worker is stale or material is deleting")
        return material

    def process(self, db: Session, material_id: UUID, data: bytes, *, version: int) -> Material:
        material = self._guard(db, material_id, version)
        stage = "parser"
        try:
            documents = PARSERS[material.file_type](data)
            chunks = chunk_documents(documents, file_type=material.file_type)
            if not chunks:
                raise ValueError("The uploaded file contains no extractable text")
            self._guard(db, material_id, version)
            stage = "embedding"
            vectors = self.embedder.embed([chunk.text for chunk in chunks])
            self.qdrant.ensure_collection(len(vectors[0]))
            payloads = [{"material_id": str(material.id), "teacher_id": str(material.teacher_id),
                         "teacher_name": material.teacher.name, "subject_id": str(material.subject_id),
                         "filename": material.filename, "chunk_text": chunk.text,
                         "chunk_index": chunk.index, "source_locator": chunk.metadata["source_locator"]} for chunk in chunks]
            ids = [point_id(material.id, chunk.index) for chunk in chunks]
            stage = "qdrant"
            # Serialize the guarded external write per material. This closes
            # the delete/retry race in a worker process; the second guard
            # prevents a superseded version from being marked ready.
            with _material_lock(material_id):
                self._guard(db, material_id, version)
                self.qdrant.delete_material_tail(material.id, len(chunks))
                self._guard(db, material_id, version)
                self.qdrant.upsert(vectors, payloads, ids)
                material = self._guard(db, material_id, version)
            material.status = "ready"
            import datetime
            material.processed_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit(); db.refresh(material)
            return material
        except Exception:
            logger.exception("Material ingestion failed", extra={"material_id": str(material_id), "stage": stage, "version": version})
            current = db.query(Material).filter(Material.id == material_id).first()
            if current and current.status != "deleting" and current.ingestion_version == version:
                current.status = "failed"
                db.commit()
            raise
