"""Explicit local/deployment command: provision and validate the one Qdrant collection."""
from app.services.ingestion.embedder import LocalEmbedder
from app.utils.qdrant_client import QdrantStore
from app.config import settings

def main() -> None:
    embedder = LocalEmbedder(settings.EMBEDDING_MODEL)
    dimension = embedder.dimension
    QdrantStore().ensure_collection(dimension)
    print(f"Validated Qdrant collection {settings.QDRANT_COLLECTION!r} with dimension {dimension}.")

if __name__ == "__main__":
    main()
