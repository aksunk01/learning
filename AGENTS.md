# AGENTS.md

## Repository Overview

This repository is a monorepo for the Academic Assistant project.

Git repository root:

`~/repos/learning`

Major directories:

* `backend/` — FastAPI backend
* `frontend/` — Next.js frontend
* `worker/` — background processing services
* `shared/` — shared resources or definitions
* `docker/` — Docker-related files
* `docs/` — project documentation
* `scripts/` — utility scripts
* `tests/` — repository-level tests

All paths referenced during development should be interpreted relative to the Git repository root.

For backend work, paths should normally begin with:

`backend/`

For frontend work, paths should normally begin with:

`frontend/`

Do not create new root-level directories such as:

* `app/`
* `src/`
* `models/`
* `schemas/`

unless explicitly instructed.

Before creating a new file, verify that the intended parent directory exists and belongs to the correct application.

---

## Development Philosophy

This is a learning project.

Prefer incremental, understandable changes over large refactors.

When implementing a feature:

1. Inspect the existing implementation first.
2. Make the smallest change necessary.
3. Preserve the current project structure and conventions.
4. Avoid unrelated refactors.
5. Run a focused validation or test after the change.
6. Report exactly what changed and what was tested.

Do not assume a test passed.

If a test fails, report the failure and stop before making unrelated changes.

---

## Scope Control

Follow the requested task exactly.

Do not expand the task into adjacent features unless explicitly instructed.

Examples:

If asked to add a database field:

* do not automatically create new endpoints
* do not redesign schemas
* do not add background jobs
* do not add frontend code
* do not add migrations unless requested

If asked to update backend code:

* do not modify frontend files unless explicitly instructed

If asked to update frontend code:

* do not modify backend behavior unless explicitly instructed

---

## Git Safety

Do not create files at unexpected paths.

Before creating a file, verify whether that file already exists elsewhere in the repository.

If a requested file is expected to exist but does not exist at the resolved path, stop and report the discrepancy instead of creating a replacement.

Do not:

* run `git reset --hard`
* delete branches
* force push
* rewrite Git history

unless explicitly instructed.

Do not commit automatically unless the user explicitly asks for commits.

When finished, report:

* files modified
* files created
* files deleted
* tests or commands executed
* errors encountered

---

## Backend

Backend root:

`backend/`

Technology stack:

* Python 3.12
* FastAPI
* SQLAlchemy 2.0
* PostgreSQL
* pgvector
* Alembic
* Redis
* MinIO
* Google Gemini
* JWT authentication
* Docker Compose

Backend development command:

```bash
cd ~/repos/learning
source backend/.venv/bin/activate
PYTHONPATH=backend uvicorn backend.app.main:app --reload --port 8000
```

When commands must be executed from inside `backend/`, use:

```bash
cd ~/repos/learning/backend
source .venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --reload --port 8000
```

Preserve existing SQLAlchemy 2.0 typed model conventions using:

```python
Mapped
mapped_column
```

Preserve existing Pydantic v2 conventions.

Use Alembic for schema changes.

Do not directly modify the production database schema outside migrations unless explicitly instructed.

---

## Authentication and Ownership

JWT authentication is already implemented.

Use the existing:

`get_current_user`

dependency for authenticated endpoints.

Preserve user ownership boundaries.

A user must not be able to access or modify another user's:

* courses
* course materials
* assignments
* documents
* extracted data

Do not weaken existing authorization checks.

---

## Course Data

Courses currently include:

* id
* user_id
* name
* code
* description
* semester
* schedule

Course schedule information is stored directly on the Course using PostgreSQL JSONB.

Do not create a separate CourseMeeting table unless explicitly requested.

Schedule example:

```json
{
  "timezone": "America/New_York",
  "meetings": [
    {
      "days": ["monday", "wednesday"],
      "start_time": "14:00",
      "end_time": "15:15",
      "location": "Duthie Center 101"
    }
  ]
}
```

Meeting times represent local wall-clock times.

Do not convert class meeting times to UTC when storing them.

The schedule-level timezone determines how the client interprets the meeting times.

---

## Document Processing and RAG

The backend already supports:

* course material uploads
* MinIO storage
* document parsing
* document chunking
* Gemini embeddings
* pgvector
* RAG over course documents
* structured assignment extraction

Do not rebuild existing RAG infrastructure unless explicitly requested.

Prefer extending existing services instead of creating parallel implementations.

---

## API Design

The FastAPI backend serves both:

* Next.js web application
* native iOS application

Keep API responses client-agnostic.

Avoid adding backend behavior that only works for one frontend unless there is a strong reason.

Prefer REST endpoints and reusable response schemas.

---

## Frontend

Frontend root:

`frontend/`

Primary technologies:

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui

Prefer shadcn/ui components where appropriate.

Keep frontend API access separated from UI components.

Do not hardcode backend data when an API integration exists unless the task is specifically UI-only prototyping.

---

## Code Quality

Prefer:

* clear naming
* small functions
* explicit types
* existing project patterns
* focused changes

Avoid:

* unnecessary abstractions
* premature optimization
* duplicate services
* giant functions
* broad refactors unrelated to the task

Add comments only when they explain non-obvious behavior.

Do not comment obvious code.

---

## Validation

After backend changes, prefer focused checks such as:

```bash
PYTHONPATH=backend python -c "..."
```

or, from the backend directory:

```bash
PYTHONPATH=. python -c "..."
```

Run relevant tests when available.

Do not claim success without showing the actual command result.

