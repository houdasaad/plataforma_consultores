"""
Structured consultant CV profile (education + campaign experience).
"""

from __future__ import annotations

import re
import secrets
from typing import Any


def empty_cv_profile() -> dict[str, Any]:
    return {"education": [], "campaign_experience": []}


def generate_cv_snapshot_code() -> str:
    return f"CV-{secrets.token_hex(3).upper()}"


def merge_cv_profile_from_draft(draft: dict[str, Any] | None) -> dict[str, Any]:
    """Map legacy cv_draft / extraction output into structured profile."""
    base = empty_cv_profile()
    if not draft:
        return base

    for edu in draft.get("education") or []:
        if isinstance(edu, dict):
            base["education"].append(_normalize_education_row(edu))
        elif isinstance(edu, str) and edu.strip():
            base["education"].append(
                {"type": edu.strip(), "university": "", "year_start": "", "year_end": ""}
            )

    for exp in draft.get("campaign_experience") or draft.get("experiences") or []:
        if isinstance(exp, dict):
            base["campaign_experience"].append(_normalize_campaign_row(exp))

    raw = draft.get("raw_text") or draft.get("summary") or ""
    if raw:
        parsed = parse_structured_from_text(str(raw))
        base["education"].extend(parsed["education"])
        base["campaign_experience"].extend(parsed["campaign_experience"])

    return _dedupe_profile(base)


def parse_structured_from_text(text: str) -> dict[str, Any]:
    """Heuristic parser for CV plain text (Word/PDF/OCR)."""
    profile = empty_cv_profile()
    lines = [
        ln.strip()
        for ln in text.splitlines()
        if ln.strip() and not ln.startswith("[") and not ln.lower().startswith("archivo:")
    ]

    in_education = False
    in_campaigns = False

    for ln in lines:
        low = ln.lower()
        if re.match(r"(?i)^educaci[oó]n\s*:?\s*$", ln):
            in_education = True
            in_campaigns = False
            continue
        if re.match(r"(?i)^(experiencia en campa[ñn]as|campa[ñn]as)\s*:?\s*$", ln):
            in_education = False
            in_campaigns = True
            continue
        if re.match(r"(?i)^cv demo", ln):
            continue

        if low.startswith("contacto:"):
            if profile["campaign_experience"]:
                _apply_contact_line(profile["campaign_experience"][-1], ln)
            continue

        if in_education or _looks_like_education(ln):
            row = _parse_education_line(ln)
            if row:
                profile["education"].append(row)
            in_education = in_education or bool(row)
            continue

        if in_campaigns or _looks_like_campaign(ln):
            row = _parse_campaign_line(ln)
            if row:
                profile["campaign_experience"].append(row)
            continue

    return _dedupe_profile(profile)


def _normalize_education_row(edu: dict) -> dict[str, str]:
    return {
        "type": str(edu.get("type") or edu.get("degree") or "Título")[:120],
        "university": str(edu.get("university") or edu.get("institution") or "")[:200],
        "year_start": str(edu.get("year_start") or edu.get("years") or "")[:4],
        "year_end": str(edu.get("year_end") or "")[:4],
    }


def _normalize_campaign_row(exp: dict) -> dict[str, str]:
    return {
        "campaign": str(
            exp.get("campaign") or exp.get("role") or exp.get("organization") or ""
        )[:200],
        "service": str(exp.get("service") or "")[:200],
        "year": str(exp.get("year") or exp.get("years") or "")[:4],
        "contact_name": str(exp.get("contact_name") or "")[:120],
        "contact_email": str(exp.get("contact_email") or "")[:254],
        "contact_phone": str(exp.get("contact_phone") or "")[:40],
    }


def _looks_like_education(line: str) -> bool:
    low = line.lower()
    keys = (
        "licenciatura",
        "maestría",
        "maestria",
        "master",
        "doctorado",
        "ingeniería",
        "ingenieria",
        "postítulo",
        "postitulo",
    )
    return any(k in low for k in keys) or "universidad" in low


def _looks_like_campaign(line: str) -> bool:
    low = line.lower()
    return "campaña" in low or "campana" in low


def _split_dash_parts(line: str) -> list[str]:
    return [p.strip() for p in re.split(r"\s[—–-]\s", line) if p.strip()]


def _parse_education_line(line: str) -> dict[str, str] | None:
    if len(line) < 8:
        return None
    parts = _split_dash_parts(line)
    years = re.findall(r"(20\d{2})", line)
    if len(parts) >= 3:
        return {
            "type": parts[0][:120],
            "university": parts[1][:200],
            "year_start": years[0] if years else "",
            "year_end": years[-1] if len(years) > 1 else "",
        }
    if len(parts) == 2:
        return {
            "type": parts[0][:120],
            "university": parts[1][:200],
            "year_start": years[0] if years else "",
            "year_end": years[-1] if len(years) > 1 else "",
        }
    return {
        "type": line[:120],
        "university": _extract_university(line),
        "year_start": years[0] if years else "",
        "year_end": years[-1] if len(years) > 1 else "",
    }


def _parse_campaign_line(line: str) -> dict[str, str] | None:
    if len(line) < 8 or line.lower().startswith("contacto"):
        return None
    parts = _split_dash_parts(line)
    years = re.findall(r"(20\d{2})", line)
    campaign = parts[0][:200] if parts else line[:200]
    service = parts[1][:200] if len(parts) > 1 else ""
    year = years[0] if years else (years[-1] if years else "")
    return {
        "campaign": campaign,
        "service": service,
        "year": year[:4],
        "contact_name": "",
        "contact_email": "",
        "contact_phone": "",
    }


def _apply_contact_line(row: dict[str, str], line: str) -> None:
    body = re.sub(r"(?i)^contacto:\s*", "", line).strip()
    parts = _split_dash_parts(body) if "—" in body or "–" in body else [body]
    if not parts:
        return
    row["contact_name"] = parts[0][:120]
    for part in parts[1:]:
        email_m = re.search(r"[\w.+-]+@[\w-]+\.\w+", part)
        phone_m = re.search(r"\+?\d[\d\s-]{7,}", part)
        if email_m:
            row["contact_email"] = email_m.group(0)
        if phone_m:
            row["contact_phone"] = phone_m.group(0).strip()


def _extract_university(line: str) -> str:
    m = re.search(r"(Universidad[^\n,|—–-]*)", line, re.I)
    return m.group(1).strip() if m else ""


def _dedupe_profile(profile: dict[str, Any]) -> dict[str, Any]:
    seen_edu: set[tuple[str, str]] = set()
    edu_out = []
    for row in profile.get("education") or []:
        key = (row.get("type", ""), row.get("university", ""))
        if key in seen_edu:
            continue
        seen_edu.add(key)
        edu_out.append(row)

    seen_camp: set[str] = set()
    camp_out = []
    for row in profile.get("campaign_experience") or []:
        camp = row.get("campaign", "")
        if not camp or camp.lower().startswith("experiencia en campaña"):
            continue
        if camp in seen_camp:
            continue
        seen_camp.add(camp)
        camp_out.append(row)

    return {"education": edu_out, "campaign_experience": camp_out}
