from io import BytesIO
from pathlib import Path

from docx import Document
from pypdf import PdfReader


def extract_resume_data(filename: str, content: bytes) -> dict[str, str] | None:
    """Extract the resume text used to ground interview questions."""
    extension = Path(filename).suffix.lower()

    if extension == ".txt":
        text = content.decode("utf-8", errors="replace")
    elif extension == ".pdf":
        text = "\n".join(
            page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages
        )
    elif extension == ".docx":
        text = "\n".join(
            paragraph.text for paragraph in Document(BytesIO(content)).paragraphs
        )
    else:
        return None

    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    return {"resume_text": text} if text else None