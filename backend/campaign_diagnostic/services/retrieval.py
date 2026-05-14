import math
import re
from typing import Any

from django.conf import settings
from django.db.models import Q

from campaign_diagnostic.models import KnowledgeDocument


def _l2_norm(vec: list[float]) -> float:
    return math.sqrt(sum(x * x for x in vec)) or 1.0


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (_l2_norm(a) * _l2_norm(b))


def keyword_score(query: str, text: str) -> float:
    tokens = [w for w in re.split(r"\W+", query.lower()) if len(w) > 3]
    if not tokens:
        tokens = ["campaña", "elección", "comunicación", "territorio", "voto"]
    text_l = text.lower()
    return float(sum(1 for w in set(tokens) if w in text_l))


def embed_text_openai(text: str) -> list[float] | None:
    key = getattr(settings, "OPENAI_API_KEY", "") or ""
    if not key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=key)
        model = getattr(settings, "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        dims = int(getattr(settings, "OPENAI_EMBEDDING_DIMENSIONS", 512))
        res = client.embeddings.create(model=model, input=text[:8000], dimensions=dims)
        return list(res.data[0].embedding)
    except Exception:
        return None


def retrieve_documents(
    *,
    country_code: str,
    scope: str,
    district: str,
    query: str,
    limit: int = 8,
) -> list[tuple[KnowledgeDocument, float, str]]:
    qs = KnowledgeDocument.objects.filter(country_code__iexact=country_code)
    if scope == "local" and district.strip():
        d = district.strip()
        qs = qs.filter(Q(district__iexact=d) | Q(district=""))
    elif scope == "regional":
        qs = qs.filter(Q(scope__in=["", "regional", "national"]) | Q(scope="local"))
    else:
        qs = qs.filter(Q(scope__in=["", "national", "regional", "local"]))

    docs = list(qs[:250])
    query_emb = embed_text_openai(query)

    scored: list[tuple[KnowledgeDocument, float, str]] = []
    for doc in docs:
        if query_emb and doc.embedding and isinstance(doc.embedding, list):
            try:
                emb = [float(x) for x in doc.embedding]
                s = cosine_similarity(query_emb, emb)
            except (TypeError, ValueError):
                s = keyword_score(query, f"{doc.title}\n{doc.body}")
                scored.append((doc, s, "keyword"))
            else:
                scored.append((doc, float(s), "vector"))
        else:
            s = keyword_score(query, f"{doc.title}\n{doc.body}")
            scored.append((doc, float(s), "keyword"))

    scored.sort(key=lambda x: -x[1])
    return scored[:limit]
