from datetime import date, datetime, time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.calendar_event import CalendarEvent
from app.models.course import Course
from app.models.user import User
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
)

router = APIRouter(
    prefix="/calendar-events",
    tags=["Calendar Events"],
)


def validate_course_ownership(course_id: UUID | None, db: Session, user_id: UUID) -> None:
    if course_id is None:
        return

    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()

    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")


@router.post(
    "",
    response_model=CalendarEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_calendar_event(
    event_data: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_course_ownership(event_data.course_id, db, current_user.id)

    event = CalendarEvent(
        title=event_data.title,
        description=event_data.description,
        location=event_data.location,
        start_at=event_data.start_at,
        end_at=event_data.end_at,
        all_day=event_data.all_day,
        color=event_data.color,
        course_id=event_data.course_id,
        user_id=current_user.id,
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


@router.get("", response_model=list[CalendarEventResponse])
def get_calendar_events(
    start: date | None = None,
    end: date | None = None,
    course_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)

    if start is not None:
        query = query.filter(CalendarEvent.start_at >= datetime.combine(start, time.min))

    if end is not None:
        query = query.filter(CalendarEvent.start_at <= datetime.combine(end, time.max))

    if course_id is not None:
        query = query.filter(CalendarEvent.course_id == course_id)

    return query.order_by(CalendarEvent.start_at.asc()).all()


@router.get("/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")

    return event


@router.patch("/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: UUID,
    event_data: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")

    update_data = event_data.model_dump(exclude_unset=True)

    if "course_id" in update_data:
        validate_course_ownership(update_data["course_id"], db, current_user.id)

    end_at = update_data.get("end_at", event.end_at)
    start_at = update_data.get("start_at", event.start_at)
    if end_at and end_at < start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_at must be on or after start_at",
        )

    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == current_user.id)
        .first()
    )

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")

    db.delete(event)
    db.commit()
