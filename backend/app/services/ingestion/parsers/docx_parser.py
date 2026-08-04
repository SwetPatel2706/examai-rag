from io import BytesIO

def parse_docx(data: bytes) -> list[dict]:
    try:
        from docx import Document
    except ImportError as exc:
        raise RuntimeError("DOCX ingestion requires the python-docx dependency") from exc
    document = Document(BytesIO(data))
    return [{"text": paragraph.text.strip(), "metadata": {"source_locator": {"type": "paragraph", "value": i + 1}}}
            for i, paragraph in enumerate(document.paragraphs) if paragraph.text.strip()]
