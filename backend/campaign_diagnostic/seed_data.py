from campaign_diagnostic.models import KnowledgeDocument


def seed_campaign_knowledge_documents() -> int:
    """
    Seed vector-store compatible text chunks (embeddings optional).
    """
    chunks: list[dict] = []

    def add(country: str, scope: str, district: str, title: str, body: str):
        chunks.append(
            {
                "country_code": country,
                "scope": scope,
                "district": district,
                "title": title,
                "body": body,
            }
        )

    for cc, name in [("MX", "México"), ("AR", "Argentina"), ("CL", "Chile"), ("CO", "Colombia"), ("PE", "Perú"), ("UY", "Uruguay")]:
        add(
            cc,
            "national",
            "",
            f"Marco electoral nacional — {name}",
            (
                f"Resumen de calendario electoral típico en {name}: preparación de frentes, registro de candidaturas, "
                "financiamiento y rendición de cuentas, debates, propaganda y fiscalización. "
                "La narrativa nacional debe alinear mensaje macro con realidades regionales y riesgos reputacionales."
            ),
        )
        add(
            cc,
            "regional",
            "",
            f"Campaña regional — {name}",
            (
                "En competencias regionales, el mapa de poder local (gobernadores, intendencias, alcaldías) condiciona "
                "alianzas y agenda mediática. Se recomienda plan de visitas densas, coordinación con líderes intermedios "
                "y contenidos segmentados por sub-región."
            ),
        )
        add(
            cc,
            "local",
            "Distrito modelo",
            f"Campaña local — distrito y barrio ({name})",
            (
                "Micro-zonificación: mesas, transporte, testigos de casilla, logística de mitines barriales y "
                "activación puerta a puerta. El mensaje debe ser concreto (servicios, seguridad, empleo) y verificable."
            ),
        )

    add(
        "MX",
        "local",
        "CDMX",
        "CDMX — agenda y medios",
        (
            "En capitales, la saturación de medios exige creatividad y datos para segmentar. Coordinar agenda pública, "
            "ruedas de prensa temáticas y respuesta en tiempo real a crisis."
        ),
    )

    created = 0
    for row in chunks:
        _, was_created = KnowledgeDocument.objects.update_or_create(
            country_code=row["country_code"],
            title=row["title"],
            defaults={
                "scope": row["scope"],
                "district": row["district"],
                "body": row["body"],
                "source": "seed",
            },
        )
        if was_created:
            created += 1
    return created
