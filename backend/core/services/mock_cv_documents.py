"""
Generate downloadable mock CV samples (Word .docx and PDF with extractable text).
"""

from __future__ import annotations

import zipfile
from io import BytesIO


MOCK_DOCX_BODY = """CV DEMO — Consultor político (muestra)

EDUCACIÓN
Maestría en Gestión Pública — Universidad de Concepción — 2014-2016
Licenciatura en Sociología — Universidad de Chile — 2007-2011

EXPERIENCIA EN CAMPAÑAS
Campaña Gobernador Biobío 2020 — Plan territorial y encuestas — 2020
Contacto: Carmen Díaz — carmen.diaz@ejemplo.cl — +56 9 7777 1111
Campaña Alcaldía Los Ángeles 2024 — Comunicación y redes — 2024
Contacto: Jorge Muñoz — jorge.munoz@ejemplo.cl — +56 9 6666 2222
"""

MOCK_PDF_TEXT = MOCK_DOCX_BODY.replace("DOCX", "PDF")


def _escape_xml(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_mock_docx_bytes() -> bytes:
    """Minimal OOXML Word document (no external deps)."""
    paragraphs = "".join(
        f'<w:p><w:r><w:t xml:space="preserve">{_escape_xml(line)}</w:t></w:r></w:p>'
        for line in MOCK_DOCX_BODY.split("\n")
    )
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{paragraphs}<w:sectPr/></w:body></w:document>"
    )
    content_types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)
    return buf.getvalue()


def build_mock_pdf_bytes() -> bytes:
    """Minimal PDF with text layer (readable by pypdf if installed)."""
    lines = MOCK_PDF_TEXT.split("\n")
    content_lines = ["BT", "/F1 11 Tf", "50 750 Td"]
    y = 750
    for line in lines[:28]:
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_lines.append(f"({safe}) Tj")
        y -= 16
        content_lines.append(f"0 -16 Td")
    stream = "\n".join(content_lines) + "\nET"
    stream_bytes = stream.encode("latin-1", errors="replace")

    objects = []
    objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
    objects.append(b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n")
    objects.append(
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n"
    )
    objects.append(
        f"4 0 obj<< /Length {len(stream_bytes)} >>stream\n".encode()
        + stream_bytes
        + b"\nendstream\nendobj\n"
    )
    objects.append(b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n")

    out = BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for obj in objects:
        offsets.append(out.tell())
        out.write(obj)
    xref_start = out.tell()
    out.write(f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n".encode())
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(
        f"trailer<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode()
    )
    return out.getvalue()
