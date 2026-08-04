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

# Fixed-size striped locks — bounds memory to exactly _NUM_STRIPES RLock
# objects regardless of how many distinct material UUIDs are processed.
_NUM_STRIPES = 64
_STRIPES = [threading.RLock() for _ in range(_NUM_STRIPES)]

def _material_lock(material_id: UUID) -> threading.RLock:
    return _STRIPES[hash(material_id) % _NUM_STRIPES]


def _supports_for_update(db: Session) -> bool:
    """Return False for SQLite (used in tests) which lacks SELECT FOR UPDATE."""
    dialect = db.bind.dialect.name if db.bind else ""
    return dialect != "sqlite"


class IngestionPipeline:
    def __init__(self, qdrant=None, embedder=None):
        self.qdrant = qdrant or QdrantStore()
        self.embedder = embedder or LocalEmbedder(settings.EMBEDDING_MODEL)

    def _guard(self, db: Session, material_id: UUID, version: int) -> Material:
        """Check that the material still exists, is not being deleted, and
        matches the expected ingestion version.  Uses SELECT … FOR UPDATE
        on Postgres to take a row-level lock, preventing concurrent
        deletion from committing until this transaction completes."""
        query = db.query(Material).filter(Material.id == material_id)
        if _supports_for_update(db):
            query = query.with_for_update()
        material = query.first()
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
            # Conditional UPDATE: only set ready if the version still matches
            # and the row has not been moved to deleting in the meantime.
            # This prevents stale workers from resurrecting a deleted row.
            import datetime
            rows = db.execute(
                update(Material)
                .where(
                    Material.id == material_id,
                    Material.ingestion_version == version,
                    Material.status != "deleting",
                )
                .values(
                    status="ready",
                    processed_at=datetime.datetime.now(datetime.timezone.utc),
                )
            )
            db.commit()
            if rows.rowcount == 0:
                raise RuntimeError("Ingestion worker is stale or material is deleting")
            db.refresh(material)
            return material
        except Exception:
            logger.exception("Material ingestion failed", extra={"material_id": str(material_id), "stage": stage, "version": version})
            # Conditional failure update — only mark failed if version still
            # matches and the row hasn't been moved to deleting.
            db.execute(
                update(Material)
                .where(
                    Material.id == material_id,
                    Material.ingestion_version == version,
                    Material.status != "deleting",
                )
                .values(status="failed")
            )
            db.commit()
            raise
