# Planner test account

Disposable local-dev account for exercising the planner scoring/selection
algorithm (`app/services/planner_scoring.py`). Not a real user — safe to
reset at any time.

- **Email:** `planner-test@dueboard.local`
- **Password:** `PlannerTest123!`

## Seed data

- Semester: Fall 2026
- Courses: Data Structures (CS 201), Linear Algebra (MATH 210), Databases (CS 310)
- 12 assignments spanning overdue, due-today, and upcoming (1-14 days out),
  mixed types (homework/project/exam) and effort tags (light/moderate/heavy),
  plus one `priority_override`, one explicit `estimated_minutes`, and one
  already-completed item (to confirm it's excluded from the plan).

## Resetting the data

Re-running the seed script deletes and recreates this user (and everything
under it), so it's safe to run again whenever you want a clean slate:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. python scripts/seed_planner_test_account.py
```
