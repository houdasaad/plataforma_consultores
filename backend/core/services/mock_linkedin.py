"""
Mock LinkedIn profile import — extracts consultant profile fields from a public URL.
Replace with LinkedIn API or scraping integration in production.
"""

from __future__ import annotations

import hashlib
import re
from typing import Any
from urllib.parse import urlparse


def default_social_links() -> dict[str, str]:
    return {
        "linkedin": "",
        "twitter": "",
        "instagram": "",
        "facebook": "",
        "youtube": "",
        "website": "",
    }


def normalize_social_links(raw: dict | None) -> dict[str, str]:
    base = default_social_links()
    if not raw:
        return base
    for key in base:
        val = (raw.get(key) or "").strip()
        base[key] = val
    return base


def _slug_from_linkedin_url(url: str) -> str:
    parsed = urlparse(url.strip())
    path = (parsed.path or "").strip("/")
    if path.startswith("in/"):
        return path.split("/", 1)[1].split("/")[0]
    if path:
        return path.split("/")[0]
    return "consultor"


def extract_profile_from_linkedin_url(url: str) -> dict[str, Any]:
    """Return profile fields to merge into ConsultantProfile (mock)."""
    url = (url or "").strip()
    if not url:
        raise ValueError("LinkedIn URL is required.")
    if "linkedin.com" not in url.lower():
        raise ValueError("URL must be a LinkedIn profile link (linkedin.com/in/...).")

    slug = _slug_from_linkedin_url(url)
    seed = int(hashlib.sha256(slug.encode()).hexdigest()[:8], 16)
    names_pool = [
        ("Carolina", "Méndez Ríos"),
        ("Andrés", "Silva Lagos"),
        ("Valentina", "Torres Pino"),
        ("Felipe", "Aguilar Vera"),
    ]
    cities = [("Santiago", "Chile"), ("Buenos Aires", "Argentina"), ("Ciudad de México", "México")]
    titles = [
        "Consultor en estrategia electoral",
        "Asesor en comunicación política",
        "Especialista en campañas territoriales",
    ]
    first, last = names_pool[seed % len(names_pool)]
    city, country = cities[seed % len(cities)]
    title = titles[seed % len(titles)]

    display = f"{first} {last}"
    headline = f"{title} · Experiencia en campañas nacionales y locales"
    bio = (
        f"Perfil importado (simulación) desde LinkedIn. "
        f"{display} acompaña equipos de campaña en planificación, mensaje y territorialidad. "
        f"Más de {8 + seed % 10} años en consultoría política en {country}."
    )

    social = default_social_links()
    social["linkedin"] = url if url.startswith("http") else f"https://{url}"

    return {
        "display_name": display,
        "full_name": display,
        "professional_title": title,
        "headline": headline[:255],
        "bio": bio[:2000],
        "city": city,
        "country": country,
        "phone": f"+56 9 {7000000 + seed % 9999999}"[:16],
        "social_links": social,
        "academic_titles": [
            {
                "degree": "Maestría en Ciencias Políticas",
                "institution": "Universidad de Chile",
            }
        ],
        "mode": "mock_linkedin",
        "linkedin_slug": slug,
    }
