"""Explicit local/deployment command: provision and validate the one Qdrant collection."""
from qdrant_client import models
from app.services.ingestion.embedder import LocalEmbedder
from app.utils.qdrant_client import QdrantStore
from app.config import settings

# Fields that need payload indexes on Qdrant Cloud.
# Range filters (e.g. chunk_index >= N) require an integer index.
# Match filters (material_id, subject_id, teacher_id) require a keyword index.
_KEYWORD_INDEXES = ["material_id", "subject_id", "teacher_id"]
_INTEGER_INDEXES = ["chunk_index"]

def main() -> None:
    embedder = LocalEmbedder(settings.EMBEDDING_MODEL)
    dimension = embedder.dimension
    store = QdrantStore()
    store.ensure_collection(dimension)
    print(f"Validated Qdrant collection {settings.QDRANT_COLLECTION!r} with dimension {dimension}.")

    # Create payload indexes idempotently (Qdrant ignores re-creation of existing indexes).
    for field in _KEYWORD_INDEXES:
        store.client.create_payload_index(
            collection_name=store.collection,
            field_name=field,
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
        print(f"  Ensured keyword index on '{field}'.")

    for field in _INTEGER_INDEXES:
        store.client.create_payload_index(
            collection_name=store.collection,
            field_name=field,
            field_schema=models.PayloadSchemaType.INTEGER,
        )
        print(f"  Ensured integer index on '{field}'.")

    print("Done — all payload indexes are in place.")

if __name__ == "__main__":
    main()
