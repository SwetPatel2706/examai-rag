from app.schemas.chat import Citation
from app.services.rag.retriever import RetrievedChunk


def resolve_citations(markers: list[int], chunks: list[RetrievedChunk]) -> list[Citation]:
    by_number = {chunk.number: chunk for chunk in chunks}
    citations = []
    for marker in dict.fromkeys(markers):
        chunk = by_number.get(marker)
        if not chunk:
            continue
        payload = chunk.payload
        try:
            citations.append(Citation(
                marker=marker,
                teacher_name=str(payload["teacher_name"]),
                material_filename=str(payload["filename"]),
                material_id=payload["material_id"],
                source_locator=payload["source_locator"],
            ))
        except (KeyError, TypeError, ValueError):
            # A malformed payload must never become an uncited attribution.
            continue
    return citations

