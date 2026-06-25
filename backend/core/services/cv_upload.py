"""Read plain text from uploaded CV files (mock-friendly; optional OCR for PDF)."""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO

_W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

# Max upload size for CV extraction (bytes)
CV_UPLOAD_MAX_BYTES = 5 * 1024 * 1024

ALLOWED_CV_EXTENSIONS = {".pdf", ".doc", ".docx", ".txt"}


def extract_text_from_cv_file(uploaded_file, *, use_ocr: bool = False) -> tuple[str, str, str]:
    """
    Returns (text, filename, extraction_method).
    extraction_method: text | scaffold | ocr_mock | ocr_pypdf
    """
    name = (getattr(uploaded_file, "name", None) or "cv.txt").strip()
    lower = name.lower()
    ext = "." + lower.rsplit(".", 1)[-1] if "." in lower else ""
    if ext and ext not in ALLOWED_CV_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}")

    raw = uploaded_file.read()
    if len(raw) > CV_UPLOAD_MAX_BYTES:
        raise ValueError("File exceeds 5 MB limit.")

    if lower.endswith(".txt"):
        text = raw.decode("utf-8", errors="replace").strip()
        if not text:
            raise ValueError("Text file is empty.")
        return text, name, "text"

    if lower.endswith(".pdf"):
        if use_ocr:
            return _extract_pdf_with_ocr(raw, name), name, "ocr_mock"
        text = _try_pypdf_extract(raw)
        if text.strip():
            return text.strip(), name, "pypdf"
        return _pdf_scaffold(name), name, "scaffold"

    if lower.endswith(".docx"):
        text = _try_docx_extract(raw)
        if text.strip():
            return text.strip(), name, "docx"
        return _docx_scaffold(name), name, "scaffold"

    if lower.endswith(".doc"):
        return _docx_scaffold(name), name, "scaffold"

    return _docx_scaffold(name), name, "scaffold"


def _try_docx_extract(raw: bytes) -> str:
    """Extract plain text from OOXML Word (.docx) using stdlib only."""
    try:
        with zipfile.ZipFile(BytesIO(raw)) as zf:
            xml_bytes = zf.read("word/document.xml")
        root = ET.fromstring(xml_bytes)
        paragraphs: list[str] = []
        for p in root.iter(f"{{{_W_NS}}}p"):
            parts: list[str] = []
            for node in p.iter(f"{{{_W_NS}}}t"):
                if node.text:
                    parts.append(node.text)
            if parts:
                paragraphs.append("".join(parts))
        return "\n".join(paragraphs)
    except Exception:
        return ""


def _try_pypdf_extract(raw: bytes) -> str:
    try:
        from io import BytesIO

        from pypdf import PdfReader

        reader = PdfReader(BytesIO(raw))
        parts = []
        for page in reader.pages:
            parts.append(page.extract_text() or "")
        return "\n".join(parts)
    except Exception:
        return ""


def _extract_pdf_with_ocr(raw: bytes, filename: str) -> str:
    """Mock OCR: try text layer first, else return structured scaffold labeled as OCR."""
    text = _try_pypdf_extract(raw)
    if len(text.strip()) > 80:
        return f"[OCR — capa de texto detectada]\n{text}"
    return _pdf_scaffold(filename, ocr=True)


def _pdf_scaffold(filename: str, *, ocr: bool = False) -> str:
    prefix = "[OCR simulado — PDF]\n" if ocr else "[Extracción simulada — PDF]\n"
    return (
        f"{prefix}Archivo: {filename}\n\n"
        "EDUCACIÓN\n"
        "Maestría en Comunicación Política — Universidad de Concepción — 2015-2017\n"
        "Licenciatura en Ciencia Política — Universidad de Chile — 2008-2012\n\n"
        "EXPERIENCIA EN CAMPAÑAS\n"
        "Campaña regional Biobío 2021 — Estrategia territorial y encuestas — 2021\n"
        "Contacto: María Soto — maria.soto@ejemplo.cl — +56 9 8765 4321\n"
        "Campaña municipal Concepción 2024 — Comunicación digital — 2024\n"
        "Contacto: Pedro Rivas — pedro.rivas@ejemplo.cl — +56 9 1234 5678\n"
    )


def _docx_scaffold(filename: str) -> str:
    return (
        f"[Extracción simulada — Word]\n"
        f"Archivo: {filename}\n\n"
        "EDUCACIÓN\n"
        "Doctorado en Ciencias Sociales — Universidad Católica de la Santísima Concepción — 2018-2022\n"
        "Ingeniería Comercial — Universidad del Desarrollo — 2005-2009\n\n"
        "EXPERIENCIA EN CAMPAÑAS\n"
        "Campaña presidencial 2017 — Análisis de datos y focus groups — 2016-2017\n"
        "Contacto: Ana Méndez — ana.mendez@ejemplo.cl — +56 9 5555 0101\n"
        "Campaña parlamentaria Región Metropolitana 2022 — Asesoría de mensaje — 2022\n"
        "Contacto: Luis Torres — luis.torres@ejemplo.cl — +56 9 4444 0202\n"
    )
