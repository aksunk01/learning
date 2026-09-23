# Academic Assistant — Project Specification

## Overview

Academic Assistant is a personal academic management and AI assistant application.

The system allows a user to:

* manage courses
* upload course documents
* extract assignments and deadlines
* ask questions about course materials using RAG
* track upcoming work
* view academic schedules
* eventually access the same data through both web and iOS clients

This is primarily a single-user learning project, but authentication and ownership boundaries should remain correctly implemented.

---

## Primary Goals

The application should help answer questions such as:

* What assignments are coming up?
* What is overdue?
* What exams or projects are next?
* What do I have due this week?
* When does a class meet?
* Where does a class meet?
* What does the syllabus say about late work?
* What topics are covered in a specific lecture?
* What assignments belong to a given course?

The backend should be the single source of truth for both web and mobile clients.

---

## Architecture

### Backend

Backend directory:

`backend/`

Technology stack:

* FastAPI
* Python 3.12
* SQLAlchemy 2.0
* PostgreSQL
* pgvector
* Alembic
* JWT authentication
* Redis
* MinIO
* Google Gemini
* Docker Compose

The backend exposes REST APIs consumed by all clients.

---

### Web Client

Frontend directory:

`frontend/`

Technology stack:

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui

The frontend should consume the same FastAPI API used by the iOS application.

---

### iOS Client

A native iOS client is planned.

The iOS application should not require a separate backend.

It should consume the existing FastAPI REST API.

---

## Authentication

JWT authentication is implemented.

Current endpoints include:

* registration
* login
* current-user lookup

Authenticated resources are user-owned.

Ownership checks must prevent access to resources belonging to other users.

---

## Courses

Course CRUD is implemented.

Course fields include:

* `id`
* `user_id`
* `name`
* `code`
* `description`
* `semester`
* `schedule`

A course belongs to one user.

---

## Course Schedule

Course schedule information is stored directly on the Course model using a PostgreSQL JSONB column.

Field:

`schedule`

Example:

```json
{
  "timezone": "America/New_York",
  "meetings": [
    {
      "days": ["monday", "wednesday"],
      "start_time": "14:00",
      "end_time": "15:15",
      "location": "Duthie Center 101"
    },
    {
      "days": ["friday"],
      "start_time": "10:00",
      "end_time": "10:50",
      "location": "Engineering Garage"
    }
  ]
}
```

Design decisions:

* no separate CourseMeeting table for now
* multiple meeting patterns are supported
* schedule data naturally belongs to Course
* sophisticated SQL queries against meeting rows are not currently required
* `GET /courses` should be able to return enough information for basic calendar rendering

Class meeting times are stored as local wall-clock times.

Do not store UTC offsets on individual meetings.

The schedule-level timezone tells clients how to interpret the times.

Default expected timezone:

`America/New_York`

Nested Pydantic validation may be added later.

---

## Course Materials

Course material uploads are implemented.

Supported functionality includes:

* upload material
* store file metadata
* save files in MinIO
* retrieve course materials
* update metadata
* delete materials
* enforce course ownership

Typical uploaded materials include:

* syllabi
* lecture slides
* assignments
* notes
* PDFs
* DOCX files
* text files

---

## Document Processing

Document processing is implemented.

Pipeline includes:

1. upload file
2. store file in MinIO
3. parse document
4. extract document elements
5. chunk text
6. generate embeddings
7. store chunks in PostgreSQL
8. store embeddings using pgvector

Current parsing support includes document types such as:

* PDF
* DOCX
* TXT

Additional formats may be added later.

---

## Embeddings and RAG

Google Gemini is used for embeddings.

Document chunks are stored with pgvector embeddings.

RAG is already implemented.

The user can ask questions about:

* syllabi
* uploaded course documents
* lecture content
* policies
* assignments
* course information

Retrieval should remain scoped appropriately to the requested course or resource.

---

## Structured Assignment Extraction

Structured assignment extraction is implemented.

Assignments may be extracted from uploaded course materials such as syllabi.

Assignment information may include:

* title
* description
* assignment type
* due date
* points
* weight
* source material
* source page or section

Assignment endpoints are already implemented.

---

## Dashboard

Dashboard V1 is implemented.

Dashboard data currently includes:

* upcoming assignments
* overdue assignments
* next exam
* next project
* assignments due in the next 7 days
* overall counts
* upcoming assignment counts by course
* daily workload
* course summaries

Avoid duplicating dashboard functionality unnecessarily in future endpoints.

---

## Calendar

The application should support an academic calendar experience combining:

* recurring class meetings
* assignment due dates
* exams
* projects

Initial class schedule data can be retrieved from Course schedule JSONB.

Assignment dates should come from existing assignment endpoints.

A dedicated calendar endpoint should only be added if client-side composition becomes inconvenient or inefficient.

Do not add a calendar endpoint simply because a calendar UI exists.

---

## Planned Web Experience

Primary areas of the web application:

### Dashboard

Show:

* upcoming work
* overdue work
* next exam
* next project
* workload summary
* course summaries

### Calendar

Show:

* class meetings
* assignments by due date
* exams
* projects

Support calendar and list-style views where appropriate.

### Courses

Show all courses.

Course detail should include:

* course information
* meeting schedule
* assignments
* uploaded documents
* AI/RAG access related to that course

### Talk to AI

Allow the user to ask questions about academic content.

Queries may be scoped to:

* a course
* selected documents
* potentially all academic data

### Settings

Include normal account and application settings.

---

## API Principles

The FastAPI backend should support both Next.js and iOS.

API design principles:

* RESTful where practical
* JSON responses
* client-agnostic response structures
* consistent schemas
* correct HTTP status codes
* authenticated ownership checks
* avoid duplicate endpoints that return nearly identical data

Prefer extending existing resources over creating unnecessary new APIs.

---

## Database Principles

Use PostgreSQL as the source of truth.

Use:

* relational columns for structured frequently queried data
* JSONB for flexible nested structures where relational querying is not currently needed
* pgvector for semantic embeddings

Use Alembic for schema migrations.

Do not manually alter schema as the normal development workflow.

---

## Storage

MinIO is used for file storage.

PostgreSQL stores file metadata and references.

Do not store uploaded binary files directly in PostgreSQL.

---

## Redis

Redis is available for:

* caching
* task state
* background processing coordination

Do not introduce Redis usage unless it provides a concrete benefit.

---

## AI Usage

Google Gemini is used for AI-related functionality.

Current AI-related functionality includes:

* embeddings
* RAG
* structured extraction

AI responses should be grounded in available course data where appropriate.

Avoid using generative AI when deterministic database queries are more reliable.

For example:

* upcoming assignment counts should come from SQL
* due dates should come from structured assignment records
* document questions should use RAG

---

## Development Priorities

Current major priorities are:

1. complete Course schedule JSONB support
2. validate schedule CRUD through existing Course endpoints
3. determine whether a calendar aggregation endpoint is necessary
4. continue frontend development
5. connect frontend to backend APIs
6. eventually build native iOS client
7. improve academic intelligence features over time

---

## Non-Goals for Now

The following are not current priorities:

* multi-tenant SaaS architecture
* separate CourseMeeting database table
* complex recurrence engines
* Google Calendar synchronization
* Outlook Calendar synchronization
* automatic external LMS synchronization
* separate APIs for web and iOS
* microservices unless genuinely necessary

The architecture should remain simple enough for a single-user learning application while still following good engineering practices.

---

## Development Style

This project should be developed incrementally.

For substantial backend changes:

1. inspect the current implementation
2. make one logical change
3. run a focused validation
4. verify behavior
5. proceed to the next milestone

Prefer working code and understandable architecture over over-engineering.

