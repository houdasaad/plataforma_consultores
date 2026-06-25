"""
Mock AI services for profile verification, CV extraction, and content moderation.
Replace with real LLM / verification APIs when OPENAI_API_KEY or vendors are configured.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any


def _stable_score(seed: str, lo: float = 0.55, hi: float = 0.98) -> float:
    h = int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16)
    return round(lo + (h % 1000) / 1000 * (hi - lo), 2)


def verify_consultant_profile(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Mock identity / profile checks. Flags incongruencies for manual review.
    """
    email = (payload.get("email") or "").strip().lower()
    full_name = (payload.get("full_name") or "").strip()
    doc = (payload.get("identity_document") or "").strip()
    country = (payload.get("country") or "").strip()
    city = (payload.get("city") or "").strip()
    titles = payload.get("academic_titles") or []

    flags: list[dict[str, str]] = []
    if not full_name or len(full_name.split()) < 2:
        flags.append({"code": "name_incomplete", "message": "Nombre completo debe incluir al menos nombre y apellido."})
    if doc and len(re.sub(r"\D", "", doc)) < 6:
        flags.append({"code": "doc_short", "message": "Documento de identidad parece incompleto."})
    if email and full_name:
        local = email.split("@")[0].replace(".", " ").replace("_", " ")
        if full_name.split()[0].lower() not in local and local not in full_name.lower():
            flags.append(
                {
                    "code": "email_name_mismatch",
                    "message": "El correo no coincide claramente con el nombre (revisión manual sugerida).",
                }
            )
    for t in titles:
        uni = (t.get("institution") or t.get("university") or "").strip()
        if uni and uni.lower() in ("universidad inventada", "fake university"):
            flags.append({"code": "university_unknown", "message": f"Institución no verificada: {uni}"})

    base = _stable_score(f"{email}|{doc}|{full_name}")
    penalty = min(0.35, len(flags) * 0.12)
    score = max(0.0, round(base - penalty, 2))
    needs_manual = score < 0.72 or any(f["code"] in ("email_name_mismatch", "university_unknown") for f in flags)

    return {
        "score": score,
        "flags": flags,
        "needs_manual_review": needs_manual,
        "mode": "mock",
        "checks": {
            "university_lookup": "mock_ok" if not any(f["code"] == "university_unknown" for f in flags) else "mock_fail",
            "identity_consistency": "mock_ok" if score >= 0.72 else "mock_review",
        },
    }


def extract_cv_from_text(text: str, filename: str = "", *, extraction_method: str = "mock") -> dict[str, Any]:
    """Mock CV parsing; returns legacy draft fields plus structured education/campaigns."""
    from core.services.cv_profile import merge_cv_profile_from_draft, parse_structured_from_text

    structured = parse_structured_from_text(text)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip() and not ln.startswith("[")]
    headline = lines[0][:200] if lines else "Perfil profesional"
    return {
        "headline": headline,
        "summary": " ".join(lines[1:4])[:500] if len(lines) > 1 else "",
        "raw_text": text[:8000],
        "education": structured["education"],
        "campaign_experience": structured["campaign_experience"],
        "experiences": structured["campaign_experience"],
        "skills": ["Comunicación", "Estrategia", "Territorio"][:3],
        "mode": "mock",
        "extraction_method": extraction_method,
        "source_filename": filename,
        "cv_profile": structured,
    }


def review_service_publication(name: str, description: str) -> dict[str, Any]:
    """Mock moderation + spelling suggestions for consultant services."""
    issues = []
    suggestions = []
    combined = f"{name} {description}".lower()
    banned = ["ilegal", "fraude", "compra votos"]
    for w in banned:
        if w in combined:
            issues.append(f"Contenido no permitido detectado: «{w}».")
    if "encuesta" in combined and "tipo" not in combined:
        suggestions.append("Si ofrece encuestas, precise tipo, tamaño de muestra y sectores.")
    if len(description) < 40:
        suggestions.append("Amplíe la descripción del servicio para mayor claridad.")
    approved = len(issues) == 0
    return {
        "approved": approved,
        "issues": issues,
        "suggestions": suggestions,
        "orthography_hints": ["Revise tildes en «política» y «consultoría»."] if "politica" in combined else [],
        "mode": "mock",
    }


def review_marketplace_requirement(title: str, description: str, category_slug: str = "") -> dict[str, Any]:
    """Mock review for candidate reverse-auction posts."""
    issues = []
    suggestions = []
    text = f"{title} {description}".lower()
    if "encuesta" in text:
        suggestions.append("Especifique tipo de encuesta, número de casos y sectores objetivo.")
    if len(description) < 60:
        suggestions.append("Describa plazos, presupuesto esperado y entregables.")
    if category_slug == "legal-financiera" and "normativa" not in text:
        suggestions.append("Para asesoría legal, indique jurisdicción y tipo de trámite electoral.")
    approved = "spam" not in text and "ilegal" not in text
    if not approved:
        issues.append("Contenido marcado como inapropiado.")
    return {
        "approved": approved,
        "issues": issues,
        "suggestions": suggestions,
        "mode": "mock",
    }


def assist_marketplace_draft(prompt: str) -> dict[str, Any]:
    """Mock assistant to expand a marketplace requirement."""
    return {
        "suggested_title": (prompt[:80] + " — asesoría") if prompt else "Requerimiento de campaña",
        "suggested_description": (
            f"Necesitamos apoyo en: {prompt}. "
            "Incluir alcance, plazo máximo y presupuesto de referencia en USD."
        ),
        "mode": "mock",
    }
