from io import BytesIO

def parse_pdf(data: bytes) -> list[dict]:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("PDF ingestion requires the pypdf dependency") from exc
    pages = PdfReader(BytesIO(data)).pages
    return [{"text": page.extract_text() or "", "metadata": {"source_locator": {"type": "page", "value": i + 1}}}
            for i, page in enumerate(pages)]
