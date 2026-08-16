from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.user import User
from app.schemas.assignment import AssignmentResponse

router = APIRouter(
    prefix="/courses/{course_id}/assignments",
    tags=["Assignments"]
)

all_assignments_router = APIRouter(
    prefix="/assignments",
    tags=["Assignments"]
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
def get_all_assignments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assignments = (
        db.query(Assignment)
        .join(
            Course,
            Assignment.course_id == Course.id,
        )
        .filter(
            Course.user_id == current_user.id
        )
        .order_by(
            Assignment.due_at.asc().nullslast()
        )
        .all()
    )

    return assignments