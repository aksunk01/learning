from uuid import UUID
from datetime import datetime, timezone, time, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.user import User
from app.schemas.assignment import AssignmentResponse



EASTERN_TIME = ZoneInfo("America/New_York")

router = APIRouter(
    prefix="/courses/{course_id}/assignments",
    tags=["Assignments"]
)

all_assignments_router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"]
)

def query_upcoming_assignments(db: Session, user_id: UUID, limit: int | None = None) -> list[Assignment]:
    now = datetime.now(timezone.utc)

    query = (
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
    )

    if limit is not None:
        query = query.limit(limit)

    return query.all()

def query_overdue_assignments(db: Session, user_id: UUID)-> list[Assignment]:
    now = datetime.now(timezone.utc)

    return(
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id ==user_id,
            Assignment.due_at < now
        )
        .order_by(
            Assignment.due_at.desc()
        )
        .all()
    )

def query_next_exam(db: Session, user_id: UUID) -> Assignment | None:
    now = datetime.now(timezone.utc)

    return(
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now,
            Assignment.assignment_type == "exam"
        )
        .order_by(
            Assignment.due_at.asc()
        )
        .first()
    )

def query_next_project(db: Session, user_id: UUID) -> Assignment | None:
    now = datetime.now(timezone.utc)

    return(
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now,
            Assignment.assignment_type == "project"
        )
        .order_by(
            Assignment.due_at.asc()
        )
        .first()
    )

def query_assignments_in_range(db: Session, user_id: UUID, start_at: datetime | None = None, end_at: datetime | None = None, course_id: UUID | None = None) -> list[Assignment]:
    query = (
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id
        )
    )

    if course_id is not None:
        query = query.filter(
            Assignment.course_id == course_id
        )

    if start_at is not None:
        query = query.filter(
            Assignment.due_at >= start_at
        )

    if end_at is not None:
        query = query.filter(
            Assignment.due_at <= end_at
        )

    return(
        query
        .order_by(
            Assignment.due_at.asc().nullslast()
        )
        .all()

    )

def query_upcoming_assignment_count(db: Session, user_id: UUID) -> int:
    now = datetime.now(timezone.utc)

    return(
        db.query(func.count(Assignment.id))
        .join(
            Course,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now
        )
        .scalar()
    )

def query_upcoming_counts_by_course(db: Session, user_id: UUID):
    now = datetime.now(timezone.utc)

    return(
        db.query(
            Course.id.label("course_id"),
            Course.name.label("course_name"),
            Course.code.label("course_code"),
            func.count(Assignment.id).label("count")
        )
        .join(
            Assignment,
            Assignment.course_id == Course.id
        )
        .filter(
            Course.user_id == user_id,
            Assignment.due_at >= now
        )
        .group_by(
            Course.id,
            Course.name,
            Course.code
        )
        .order_by(
            Course.name.asc()
        )
        .all()
    )

@router.get("", response_model=list[AssignmentResponse])
def get_course_assignments(course_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = (
        db.query(Course)
        .filter(
            Course.id == course_id,
            Course.user_id == current_user.id
        )
        .first()
    )

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    assignments = (
        db.query(Assignment)
        .filter(
            Assignment.course_id == course_id
        )
        .order_by(
            Assignment.due_at.asc().nullslast()
        )
        .all()
    )

    return assignments



@all_assignments_router.get("", response_model=list[AssignmentResponse])
def get_all_assignments(course_id: UUID | None = None, start: date | None = None, end: date | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    start_at = None
    end_at = None

    if start is not None:
        start_local = datetime.combine(
            start,
            time.min,
            tzinfo=EASTERN_TIME
        )
        start_at = start_local.astimezone(timezone.utc)

    if end is not None:
        end_local = datetime.combine(
            end,
            time.max,
            tzinfo=EASTERN_TIME
        )
        end_at = end_local.astimezone(timezone.utc)

    return query_assignments_in_range(
        db = db,
        user_id=current_user.id,
        start_at=start_at,
        end_at=end_at,
        course_id=course_id
    )


@all_assignments_router.get("/upcoming", response_model=list[AssignmentResponse])
def get_upcoming_assignments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return query_upcoming_assignments(
        db = db,
        user_id=current_user.id
    )

@all_assignments_router.get("/overdue", response_model=list[AssignmentResponse])
def get_overdue_assignment(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return query_overdue_assignments(
        db=db,
        user_id=current_user.id
    )