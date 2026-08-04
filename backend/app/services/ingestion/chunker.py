from dataclasses import dataclass

@dataclass
class Chunk:
    text: str
    metadata: dict
    index: int

def chunk_documents(documents: list[dict], *, file_type: str, pdf_window: int = 400, overlap: int = 50) -> list[Chunk]:
    """Create stable chunks while retaining the first source locator in each chunk."""
    chunks: list[Chunk] = []
    if file_type == "pptx":
        # Two slides with one-slide overlap gives the model slide context.
        step = 1
        window = 2
        for start in range(0, len(documents), step):
            selected = documents[start:start + window]
            if not selected:
                break
            chunks.append(Chunk("\n\n".join(d["text"] for d in selected), selected[0]["metadata"], len(chunks)))
            if start + window >= len(documents):
                break
        return chunks
    words_per_chunk = pdf_window
    step = max(1, words_per_chunk - overlap)
    for document in documents:
        words = document["text"].split()
        if not words:
            continue
        for start in range(0, len(words), step):
            text = " ".join(words[start:start + words_per_chunk])
            if text:
                chunks.append(Chunk(text, document["metadata"], len(chunks)))
            if start + words_per_chunk >= len(words):
                break
    return chunks
