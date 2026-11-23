# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

AGENTS.md (imported above) is the primary rulebook for this repo: scope control, Git safety, backend/frontend conventions, auth/ownership rules, and the Course schedule JSONB design. Read it in full. This file adds concrete commands and cross-file architecture notes that AGENTS.md doesn't cover.

## Commands

### Local dev (full stack)

```bash
scripts/dev-up.sh    # docker compose up (postgres/redis/minio) + alembic upgrade + uvicorn --reload + next dev
scripts/dev-down.sh  # stop backend/frontend processes + docker compose down
```

Requires a `.env` at the repo root (see `.env.docker.example`). Logs land in `.dev/backend.log` and `.dev/frontend.log`.

### Backend (from repo root)

```bash
source backend/.venv/bin/activate
PYTHONPATH=backend uvicorn backend.app.main:app --reload --port 8000
```

### Backend (from `backend/`)

```bash
source .venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
alembic upgrade head                 # apply migrations
alembic revision --autogenerate -m "..."   # create a migration after model changes
PYTHONPATH=. python -c "..."         # focused ad-hoc validation
ruff check .                         # lint (no custom ruff config; defaults)
```

There is no automated backend test suite yet — `backend/test/test_document_processing/` only holds sample fixture files (PDF/DOCX/PPTX/etc.) for manually exercising the document-parsing pipeline, not pytest tests.

### Frontend (from `frontend/`)

```bash
npm run dev      # next dev, :3000
npm run build
npm run start
npm run lint      # eslint
```

### Production stack

```bash
scripts/start.sh   # docker compose -f docker-compose.prod.yml up --build, waits for health, verifies alembic head, checks Tailscale
scripts/stop.sh    # docker compose -f docker-compose.prod.yml down (keeps volumes)
scripts/bounce.sh  # stop.sh -> git pull -> start.sh
```

Production containers serve the backend and frontend over Tailscale (sidecars `tailscale-backend` / `tailscale-frontend`); the backend's `docker-entrypoint.sh` runs `alembic upgrade head` before starting uvicorn on every boot.

## Architecture

Three pieces: `backend/` (FastAPI, source of truth for both the Next.js web app and a planned iOS client), `frontend/` (Next.js app router, JS not TS despite AGENTS.md calling for TypeScript), and `docker-compose.yml` infra (Postgres+pgvector, Redis, MinIO).

### Backend request flow

`app/main.py` wires routers from `app/api/` (auth, health) and `app/api/v1/` (courses, semesters, course_materials, assistant, conversations, assignments, dashboard, planner, grading, calendar_events) onto a single FastAPI app. Routers depend on `app/db/dependencies.py` for DB sessions and current-user auth, call into `app/services/`, and read/write `app/models/` (SQLAlchemy 2.0 `Mapped`/`mapped_column`) through Pydantic schemas in `app/schemas/`.

### Document pipeline and RAG

Upload → parse → chunk → embed → retrieve, split across:
- `app/services/document_processing/` — `material_service.py` (MinIO storage + material metadata) and `parsers/` (`pdf.py`, `docx.py`, `pptx.py`, `txt.py` behind `parsers/base.py`) produce text, which `chunking.py` splits into chunks.
- `app/services/embedding.py` generates embeddings for chunks (stored via `app/models/document_chunk.py`, pgvector column) and `app/services/retrieval.py` (`RetrievalService`) does similarity search scoped to a course/resource.
- `app/services/rag.py` (`RAGService`) is the question-answering entry point: it classifies whether a question is task/schedule-related vs. course-content (`_detect_task_query`) and routes accordingly — course-content questions use retrieved chunks, task questions use structured assignment data instead of embeddings (see "Deterministic vs. generative" below).
- `backend/scripts/reembed_chunks.py` re-embeds existing chunks in place (e.g. after switching embedding models).

### Two separate LLM backends — know which one a change touches

- **Google Gemini** (`app/services/gemini_client_pool.py`, `app/core/config.py: GOOGLE_API_KEY`/`GOOGLE_API_KEY_FALLBACKS`) is used for non-RAG generative features: assignment extraction (`services/assignment_extraction.py`), grading extraction (`services/grading_extraction.py`), planner suggestions (`services/planner_ai.py`). `GeminiClientPool.run()` transparently rotates through fallback API keys on 429/quota-exhausted and re-raises other errors — don't bypass it with a raw `genai.Client()` for these features.
- **Self-hosted Ollama** (`OLLAMA_BASE_URL`, reachable over Tailscale MagicDNS in prod) is used for RAG: embeddings (`OLLAMA_EMBEDDING_MODEL`) and material Q&A generation (`OLLAMA_GENERATION_MODEL`), plus a separate `OLLAMA_CLASSIFIER_MODEL` for the task-vs-content routing above and an optional `OLLAMA_TASK_MODEL` for planning answers.

### Deterministic vs. generative split

Per PROJECT_SPEC.md, prefer SQL/structured data over generative AI wherever a deterministic answer exists: dashboard counts and workload (`services/planner_engine.py`, `api/v1/dashboard.py`) come from assignment queries, not an LLM; due dates come from `Assignment` records; only open-ended document questions go through RAG. Keep this split when adding features — don't move something that's currently a DB query onto an LLM call.

### Grading and planner

- `services/grading_extraction.py` + `grading_processing.py` extract grading-category weights from uploaded syllabi into `app/models/grading_category.py`; `services/grade_calculation.py` computes grade standing from assignment scores.
- `services/planner_engine.py` builds the deterministic daily to-do list (`build_daily_todolist`) from overdue/upcoming assignments; `services/planner_ai.py` (Gemini) turns that plus grade standing and effort tiers into prioritized suggestions, tunable per-user via `app/models/planner_preference.py`.
- `services/calendar_recurrence.py` expands a course's JSONB `schedule` meeting patterns into concrete occurrence dates for calendar rendering (see AGENTS.md's Course Data / schedule JSONB section for the schema shape and the "store local wall-clock time, not UTC" rule).

### Frontend

Next.js app router under `frontend/src/app/` (dashboard, courses, calendar, assignments, assistant, account, auth, login), components under `frontend/src/components/` (grouped by feature: dashboard, courses, calendar, assignments, planner, documents, semesters, navigation, plus shared `ui/` shadcn components). All backend calls go through `frontend/src/lib/*-api.js` modules (one per resource: `courses-api.js`, `assignments-api.js`, `dashboard-api.js`, `grading-api.js`, `planner-api.js`, `calendar-events-api.js`, `assistant-api.js`, `conversations-api.js`, `auth-api.js`, `semesters-api.js`, `course-materials-api.js`), all built on the shared `api-helpers.js`. Keep this separation: UI components should not call `fetch`/the backend directly.

Note: `frontend/node_modules/next` auto-generates and re-adds a block at the top of `frontend/AGENTS.md` on every `next dev` run — if diffing that file, expect this churn and don't try to remove it permanently.
