from .pdf_parser import parse_pdf
from .pptx_parser import parse_pptx
from .docx_parser import parse_docx

PARSERS = {"pdf": parse_pdf, "pptx": parse_pptx, "docx": parse_docx}
