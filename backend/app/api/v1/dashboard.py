from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from collections import Counter
from zoneinfo import ZoneInfo

from app.api.auth import get_current_user
from app.api.v1.assignments import query_overdue_assignments, query_upcoming_assignments, query_next_exam, query_next_project, query_assignments_in_range, query_upcoming_assignment_count, query_upcoming_counts_by_course
from app.db.dependencies import get_db
from app.models.user import User
from app.models.assignment import Assignment
from app.models.course import Course
from app.schemas.dashboard import DashboardResponse


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


EASTERN_TIME = ZoneInfo("America/New_York")

def build_daily_workload(assignments):
    counts = Counter(
        assignment.due_at.astimezone(EASTERN_TIME).date()
        for assignment in assignments
        if assignment.due_at is not None
    )

    return [
        {
            "date": day,
            "count": count
        }

        for day, count in sorted(counts.items())
    ]

def build_course_summaries(db: Session, user_id: UUID):
    now = datetime.now(timezone.utc)

    courses = (
        db.query(Course)
        .filter(
            Course.user_id == user_id
        )
        .order_by(
            Course.name.asc()
        )
        .all()
    )

    upcoming_assignments = (
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now
        )
        .order_by(
            Assignment.due_at.asc()
        )
        .all()
    )

    assignments_by_course = {}

    for assignment in upcoming_assignments:
        assignments_by_course.setdefault(
            assignment.course_id,
            []
        ).append(assignment)

    

    summaries = []

    for course in courses:
        course_assignments = assignments_by_course.get(
            course.id,
            []
        )

        summaries.append({
            "course_id": course.id,
            "course_name": course.name,
            "course_code": course.code,
            "semester": course.semester,
            "upcoming_count": len(course_assignments),
            "next_assignment": (
                course_assignments[0]
                if course_assignments
                else None
            )
        })

    return summaries


@router.get("", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    seven_days_from_now = now + timedelta(days=7)

    upcoming = query_upcoming_assignments(
        db=db,
        user_id=current_user.id,
        limit=5,
    )

    overdue = query_overdue_assignments(
        db=db,
        user_id=current_user.id,
    )

    due_next_7_days = query_assignments_in_range(
        db=db,
        user_id=current_user.id,
        start_at=now,
        end_at=seven_days_from_now,
    )

    upcoming_by_course = query_upcoming_counts_by_course(
        db = db,
        user_id = current_user.id
    )

    workload_next_7_days = build_daily_workload(due_next_7_days)

    course_summaries = build_course_summaries(db=db, user_id=current_user.id)

    return {
        "upcoming": upcoming,
        "overdue": overdue,
        "next_exam": query_next_exam(
            db=db,
            user_id=current_user.id,
        ),
        "next_project": query_next_project(
            db=db,
            user_id=current_user.id,
        ),
        "due_next_7_days": due_next_7_days,
        "counts": {
            "upcoming": query_upcoming_assignment_count(
                db=db,
                user_id=current_user.id
            ),
            "overdue": len(overdue),
            "due_next_7_days": len(due_next_7_days),
        },
        "upcoming_by_course": upcoming_by_course,
        "workload_next_7_days": workload_next_7_days,
        "course_summaries": course_summaries,

    }