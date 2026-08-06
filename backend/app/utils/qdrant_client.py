import uuid
from qdrant_client import QdrantClient, models
from app.config import settings

def point_id(material_id: uuid.UUID, chunk_index: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{material_id}:{chunk_index}"))

class QdrantStore:
    def __init__(self, client=None, collection: str | None = None):
        self.client = client or QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY,
                                             timeout=settings.QDRANT_TIMEOUT_SECONDS)
        self.collection = collection or settings.QDRANT_COLLECTION

    def ensure_collection(self, dimension: int) -> None:
        try:
            info = self.client.get_collection(self.collection)
            vectors = info.config.params.vectors
            size = next(iter(vectors.values())).size if isinstance(vectors, dict) else vectors.size
            if size != dimension:
                raise ValueError(f"Qdrant collection dimension {size} does not match embedding dimension {dimension}")
        except Exception as exc:
            if "doesn't exist" not in str(exc).lower() and "not found" not in str(exc).lower():
                raise
            self.client.create_collection(self.collection, vectors_config=models.VectorParams(size=dimension, distance=models.Distance.COSINE))

    def upsert(self, vectors: list[list[float]], payloads: list[dict], ids: list[str]) -> None:
        for start in range(0, len(ids), 100):
            end = start + 100
            self.client.upsert(self.collection, points=[models.PointStruct(id=ids[i], vector=vectors[i], payload=payloads[i]) for i in range(start, min(end, len(ids)))])

    def delete_material_tail(self, material_id: uuid.UUID, chunk_count: int) -> None:
        self.client.delete(self.collection, points_selector=models.FilterSelector(filter=models.Filter(must=[
            models.FieldCondition(key="material_id", match=models.MatchValue(value=str(material_id))),
            models.FieldCondition(key="chunk_index", range=models.Range(gte=chunk_count)),
        ])))

    def delete_material(self, material_id: uuid.UUID) -> None:
        self.client.delete(self.collection, points_selector=models.FilterSelector(filter=models.Filter(must=[models.FieldCondition(key="material_id", match=models.MatchValue(value=str(material_id)))])))

    def query(self, vector: list[float], subject_id: uuid.UUID, material_ids: list[uuid.UUID], limit: int = 5):
        """Metadata-filtered query used by Phase 3; authorization must precede this call."""
        return self.client.query_points(
            collection_name=self.collection,
            query=vector,
            query_filter=models.Filter(must=[
                models.FieldCondition(key="subject_id", match=models.MatchValue(value=str(subject_id))),
                models.FieldCondition(key="material_id", match=models.MatchAny(any=[str(value) for value in material_ids])),
            ]),
            limit=limit,
            with_payload=True,
        ).points
