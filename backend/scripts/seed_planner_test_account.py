"""Seed a disposable test account with courses/assignments for exercising the
new planner scoring/selection algorithm (see services/planner_scoring.py).

Idempotent: deletes and recreates the test user (and everything cascading
from it) on every run, so re-running this script resets the test data rather
than piling up duplicates.

Usage (from backend/, with the venv active and Postgres reachable):
    PYTHONPATH=. python scripts/seed_planner_test_account.py
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.security import password_hash
from app.db.database import SessionLocal
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.semester import Semester
from app.models.user import User

EASTERN_TIME = ZoneInfo("America/New_York")

TEST_EMAIL = "planner-test@dueboard.local"
TEST_PASSWORD = "PlannerTest123!"


def today_at(days_offset: int, hour: int = 23, minute: int = 59) -> datetime:
    now = datetime.now(EASTERN_TIME).replace(tzinfo=None)
    return (now + timedelta(days=days_offset)).replace(hour=hour, minute=minute, second=0, microsecond=0)


def main():
    db = SessionLocal()

    try:
        existing = db.query(User).filter(User.email == TEST_EMAIL).first()
        if existing is not None:
            db.delete(existing)
            db.commit()

        user = User(
            email=TEST_EMAIL,
            hashed_password=password_hash(TEST_PASSWORD),
            display_name="Planner Test",
        )
        db.add(user)
        db.flush()

        semester = Semester(
            user_id=user.id,
            name="Fall 2026",
            start_date=today_at(-60).date(),
            end_date=today_at(30).date(),
        )
        db.add(semester)
        db.flush()

        courses = {
            "data_structures": Course(
                user_id=user.id,
                semester_id=semester.id,
                name="Data Structures",
                code="CS 201",
            ),
            "linear_algebra": Course(
                user_id=user.id,
                semester_id=semester.id,
                name="Linear Algebra",
                code="MATH 210",
            ),
            "databases": Course(
                user_id=user.id,
                semester_id=semester.id,
                name="Databases",
                code="CS 310",
            ),
        }
        db.add_all(courses.values())
        db.flush()

        assignments = [
            # Overdue - should surface at/near the top regardless of type/effort.
            Assignment(
                course_id=courses["data_structures"].id,
                title="Linked List Problem Set",
                assignment_type="homework",
                effort="light",
                weight_percent=5,
                due_at=today_at(-2),
            ),
            Assignment(
                course_id=courses["databases"].id,
                title="ER Diagram Project Checkpoint",
                assignment_type="project",
                effort="heavy",
                weight_percent=15,
                due_at=today_at(-1),
            ),

            # Due today - two heavy items on the same day, to exercise the
            # one-heavy-item-per-day cap in Focus Now selection.
            Assignment(
                course_id=courses["linear_algebra"].id,
                title="Eigenvalues Problem Set",
                assignment_type="homework",
                effort="moderate",
                weight_percent=8,
                due_at=today_at(0),
            ),
            Assignment(
                course_id=courses["data_structures"].id,
                title="Red-Black Tree Implementation",
                assignment_type="project",
                effort="heavy",
                weight_percent=20,
                due_at=today_at(0),
            ),

            # Due soon (1-4 days out) - a mix of types/efforts for ranking.
            Assignment(
                course_id=courses["databases"].id,
                title="SQL Join Practice",
                assignment_type="homework",
                effort="light",
                weight_percent=5,
                due_at=today_at(1),
            ),
            Assignment(
                course_id=courses["linear_algebra"].id,
                title="Midterm Exam",
                assignment_type="exam",
                effort="heavy",
                weight_percent=25,
                due_at=today_at(4, hour=10, minute=0),
            ),
            Assignment(
                course_id=courses["data_structures"].id,
                title="Graph Traversal Project",
                assignment_type="project",
                effort="moderate",
                weight_percent=15,
                due_at=today_at(3),
            ),

            # Further out - should score low enough to land in Up Next.
            Assignment(
                course_id=courses["databases"].id,
                title="Normalization Exam",
                assignment_type="exam",
                effort="heavy",
                weight_percent=20,
                due_at=today_at(10, hour=10, minute=0),
            ),
            Assignment(
                course_id=courses["linear_algebra"].id,
                title="Vector Spaces Reading Response",
                assignment_type="homework",
                effort="light",
                weight_percent=3,
                due_at=today_at(14),
            ),

            # A manual priority override - should jump straight to the top
            # of Focus Now regardless of the computed formula.
            Assignment(
                course_id=courses["data_structures"].id,
                title="Extra Credit Writeup",
                assignment_type="homework",
                effort="moderate",
                weight_percent=2,
                due_at=today_at(5),
                priority_override=50.0,
            ),

            # An explicit estimated_minutes, overriding the effort->minutes
            # fallback table used for capacity accounting.
            Assignment(
                course_id=courses["databases"].id,
                title="Index Tuning Lab",
                assignment_type="homework",
                effort="moderate",
                weight_percent=6,
                due_at=today_at(2),
                estimated_minutes=200,
            ),

            # Already completed - should never appear anywhere in the plan.
            Assignment(
                course_id=courses["linear_algebra"].id,
                title="Matrix Basics Quiz",
                assignment_type="homework",
                effort="light",
                weight_percent=5,
                due_at=today_at(-5),
                is_completed=True,
            ),
        ]
        db.add_all(assignments)
        db.commit()

        print(f"Seeded test account: {TEST_EMAIL} / {TEST_PASSWORD}")
        print(f"  semester: {semester.name}")
        print(f"  courses: {', '.join(c.name for c in courses.values())}")
        print(f"  assignments: {len(assignments)} ({sum(1 for a in assignments if a.is_completed)} completed, excluded from planner)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
