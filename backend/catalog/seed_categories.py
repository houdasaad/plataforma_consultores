from catalog.models import Category

# Hierarchical MVP categories (parent slug -> children)
CATEGORY_TREE: dict[str, list[tuple[str, str]]] = {
    "estrategia-planificacion": [
        ("estrategia-general", "Diseño de estrategia general"),
        ("investigacion-datos", "Investigación y análisis de datos"),
        ("analisis-competencia", "Análisis de la competencia"),
        ("segmentacion-electorado", "Segmentación del electorado"),
    ],
    "comunicacion-marketing": [
        ("imagen-marca", "Diseño de imagen y marca"),
        ("media-training", "Media training"),
        ("produccion-audiovisual", "Producción audiovisual"),
        ("relaciones-publicas", "Relaciones públicas"),
    ],
    "estrategia-digital": [
        ("gestion-redes", "Gestión de plataformas digitales"),
        ("publicidad-segmentada", "Publicidad segmentada"),
        ("monitoreo-digital", "Monitoreo y escucha activa"),
    ],
    "territorio-movilizacion": [
        ("operacion-territorial", "Operación territorial"),
        ("gestion-voluntarios", "Gestión de voluntarios"),
        ("estructura-electoral", "Estructura electoral"),
    ],
    "legal-financiera": [
        ("cumplimiento-normativo", "Cumplimiento normativo"),
        ("recaudacion-fondos", "Recaudación de fondos"),
    ],
}

PARENTS = [
    ("estrategia-planificacion", "Estrategia y Planificación"),
    ("comunicacion-marketing", "Comunicación y Marketing Político"),
    ("estrategia-digital", "Estrategia Digital y Redes Sociales"),
    ("territorio-movilizacion", "Campaña de Territorio y Movilización"),
    ("legal-financiera", "Asesoría Legal, Financiera y Logística"),
]


def seed_political_categories() -> None:
    for slug, name in PARENTS:
        Category.objects.get_or_create(
            slug=slug,
            defaults={"name": name, "description": name, "parent": None},
        )
    for parent_slug, children in CATEGORY_TREE.items():
        parent = Category.objects.filter(slug=parent_slug).first()
        if not parent:
            continue
        for slug, name in children:
            Category.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "description": name, "parent": parent},
            )
