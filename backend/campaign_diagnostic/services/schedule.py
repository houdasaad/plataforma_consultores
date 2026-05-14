from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Any


def build_base_cronograma(
    *,
    today: date,
    election_date: date,
    country_code: str,
    scope: str,
    district: str,
) -> dict[str, Any]:
    if election_date <= today:
        raise ValueError("election_date must be after today")

    total_days = (election_date - today).days
    phases_meta = [
        ("Diagnóstico y narrativa", 0.12),
        ("Estrategia y estructura", 0.18),
        ("Mensaje, creatividad y canales", 0.22),
        ("Territorio, alianzas y operación", 0.22),
        ("Cierre, movilización y vigilancia", 0.16),
        ("Contención y aprendizajes", 0.10),
    ]

    cursor = today
    phases: list[dict[str, Any]] = []
    for name, ratio in phases_meta:
        span = max(7, int(total_days * ratio))
        end = min(cursor + timedelta(days=span - 1), election_date)
        phases.append(
            {
                "name": name,
                "start": cursor.isoformat(),
                "end": end.isoformat(),
                "tasks": _default_tasks_for_phase(name, scope),
            }
        )
        cursor = end + timedelta(days=1)
        if cursor > election_date:
            break

    if phases:
        phases[-1]["end"] = election_date.isoformat()

    return {
        "generated_at": date.today().isoformat(),
        "country_code": country_code.upper(),
        "scope": scope,
        "district": district,
        "election_date": election_date.isoformat(),
        "start_date": today.isoformat(),
        "days_total": total_days,
        "phases": phases,
    }


def _default_tasks_for_phase(phase_name: str, scope: str) -> list[str]:
    base = {
        "Diagnóstico y narrativa": [
            "Mapa de actores y agenda pública",
            "Encuadre del problema y promesa de campaña",
        ],
        "Estrategia y estructura": [
            "Ruta electoral y metas por semana",
            "Roles: comando, comunicación, territorial",
        ],
        "Mensaje, creatividad y canales": [
            "Guion maestro y pruebas A/B de claims",
            "Calendario de contenidos y medios",
        ],
        "Territorio, alianzas y operación": [
            "Plan de visitas y activación de bases",
            "Acuerdos locales y agenda de micro-eventos",
        ],
        "Cierre, movilización y vigilancia": [
            "Plan GOTV y logística del día D",
            "Monitoreo de incidentes y respuesta rápida",
        ],
        "Contención y aprendizajes": [
            "Protocolo post-resultados y análisis de lecciones",
        ],
    }.get(phase_name, ["Tareas a detallar con el equipo"])
    if scope == "national":
        base = [*base, "Coordinación de macro-regiones y medios nacionales"]
    elif scope == "regional":
        base = [*base, "Alineación con cabeceras regionales y medios locales"]
    else:
        base = [*base, "Micro-zonificación y agenda de barrio"]
    return base


def merge_llm_into_cronograma(base: dict[str, Any], llm_json: dict[str, Any] | None) -> dict[str, Any]:
    if not llm_json or not isinstance(llm_json, dict):
        return base
    merged = dict(base)
    if isinstance(llm_json.get("phases"), list):
        merged["phases"] = llm_json["phases"]
    if llm_json.get("notes"):
        merged["llm_notes"] = llm_json["notes"]
    return merged


def llm_refine_cronograma(
    *,
    base_cronograma: dict[str, Any],
    context_chunks: list[str],
    country_code: str,
    scope: str,
    district: str,
    election_date: date,
) -> tuple[dict[str, Any] | None, str, str]:
    """
    Returns (parsed_json_or_none, narrative_text, mode).
    """
    from django.conf import settings

    key = getattr(settings, "OPENAI_API_KEY", "") or ""
    if not key:
        narrative = (
            "Modo sin LLM: se generó un cronograma base proporcional entre la fecha actual y la elección. "
            "Configura OPENAI_API_KEY para activar el refinamiento con modelo de lenguaje y recuperación semántica."
        )
        return None, narrative, "rules_fallback"

    try:
        from openai import OpenAI

        client = OpenAI(api_key=key)
        model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        system = (
            "You are an expert political campaign planner for Latin America. "
            "Return STRICT JSON only with keys: phases (array of {name,start,end,tasks:string[]}), notes (string). "
            "Dates must be ISO YYYY-MM-DD. Tasks in Spanish. Align phases to the provided date window."
        )
        user_payload = {
            "country": country_code,
            "scope": scope,
            "district": district,
            "election_date": election_date.isoformat(),
            "base_skeleton": base_cronograma,
            "retrieved_knowledge": context_chunks[:12],
        }
        completion = client.chat.completions.create(
            model=model,
            temperature=0.35,
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                },
            ],
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content or "{}"
        data = json.loads(raw)
        narrative = str(data.get("notes") or "Cronograma refinado por el modelo.")
        return data, narrative, "openai"
    except Exception as exc:
        return None, f"LLM error; using base schedule. Detail: {exc}", "rules_fallback"
