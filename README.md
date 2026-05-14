# Plataforma MVP — consultoría política

Monorepo con **backend Django + DRF + JWT + PostgreSQL** y **frontend React + Vite + Material UI**.

## Requisitos

- Python 3.12+ (recomendado; en Windows sin Postgres el backend usa SQLite por defecto)
- Node.js 20+
- Docker Desktop (opcional, para Postgres + Mailpit + backend en contenedor)

## Arranque rápido (local)

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
.\.venv\Scripts\python manage.py migrate
.\.venv\Scripts\python manage.py seed_demo
.\.venv\Scripts\python manage.py runserver
```

- API: `http://127.0.0.1:8000/api/v1/`
- OpenAPI UI: `http://127.0.0.1:8000/api/docs/`
- Admin: `http://127.0.0.1:8000/admin/` (usuario sembrado `admin@example.com` / `adminadmin12` salvo que definas `SEED_ADMIN_*`)

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

El proxy de Vite reenvía `/api` al backend en `127.0.0.1:8000`.

## Docker Compose (Postgres + Mailpit)

```powershell
docker compose up --build
```

Variables útiles: ver [.env.example](.env.example).

## Cuentas de demostración (`seed_demo`)

- Admin: `admin@example.com` / `adminadmin12`
- Candidato: `candidate@example.com` / `candidate12`
- Consultores: `consultant1@example.com`, `consultant2@example.com` / `consultant12`

## Diagnóstico de campaña (rol candidato)

Ruta UI: `/candidato/diagnostico` (sesión con rol **candidate**). La ruta antigua `/diagnostico-campaña` redirige allí.

API:

- `POST /api/v1/campaign-diagnostic/analyze/` cuerpo JSON: `country_code`, `scope` (`national`|`regional`|`local`), `election_date`, `district` (obligatorio si `local`)
- `GET /api/v1/campaign-diagnostic/runs/` historial del usuario
- `GET /api/v1/campaign-diagnostic/runs/<id>/`

Endpoints requieren rol **candidate** (misma política que el panel de candidato). en el backend se usan **embeddings** (`text-embedding-3-small`, dimensión configurable) para rankear fragmentos en `KnowledgeDocument` y un **LLM** (`gpt-4o-mini` por defecto) para devolver JSON de fases refinadas. Sin clave: cronograma proporcional **hoy → elección** + recuperación por **palabras clave** sobre la misma base sembrada (`seed_demo`).


Integración **mock** (`POST /api/v1/payments/mock-checkout/`). Los modelos guardan `provider` y `external_id` para sustituir por una pasarela real.

## Tests / CI

```powershell
cd backend
.\.venv\Scripts\python -m pytest
```

```powershell
cd frontend
npm run build
```
