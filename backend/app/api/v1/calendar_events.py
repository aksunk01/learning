from datetime import date, datetime, time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.dependencies import get_db
from app.models.calendar_event import CalendarEvent, CalendarEventOverride
from app.models.course import Course
from app.models.user import User
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventOccurrenceUpdate,
    CalendarEventResponse,
    CalendarEventUpdate,
    RecurrenceRule,
)
from app.services.calendar_recurrence import occurrence_dates

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


def apply_recurrence(event: CalendarEvent, recurrence: RecurrenceRule | None) -> None:
    if recurrence is None:
        event.recurrence_frequency = None
        event.recurrence_interval = 1
        event.recurrence_days_of_week = None
        event.recurrence_end_date = None
        return

    event.recurrence_frequency = recurrence.frequency
    event.recurrence_interval = recurrence.interval
    event.recurrence_days_of_week = (
        recurrence.days_of_week if recurrence.frequency == "weekly" else None
    )
    event.recurrence_end_date = recurrence.end_date


def get_owned_event(event_id: UUID, db: Session, user_id: UUID) -> CalendarEvent:
    event = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user_id)
        .first()
    )

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar event not found")

    return event


def is_valid_occurrence(event: CalendarEvent, occurrence_date: date) -> bool:
    if not event.recurrence_frequency:
        return False

    dates = occurrence_dates(
        event.start_at.date(),
        event.recurrence_frequency,
        event.recurrence_interval,
        event.recurrence_days_of_week,
        event.recurrence_end_date,
        occurrence_date,
        occurrence_date,
    )
    return occurrence_date in dates


def serialize_event(event: CalendarEvent) -> CalendarEventResponse:
    """The series itself - as returned by create/get-by-id/series-update, or
    for a non-recurring event in the list endpoint."""
    return CalendarEventResponse(
        id=str(event.id),
        series_id=event.id,
        is_recurring=event.recurrence_frequency is not None,
        occurrence_date=None,
        title=event.title,
        description=event.description,
        location=event.location,
        start_at=event.start_at,
        end_at=event.end_at,
        all_day=event.all_day,
        color=event.color,
        course_id=event.course_id,
        recurrence=event.recurrence,
        user_id=event.user_id,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


def serialize_occurrence(
    event: CalendarEvent,
    occurrence_date: date,
    override: CalendarEventOverride | None,
) -> CalendarEventResponse:
    """One expanded occurrence of a recurring series, with any override
    fields applied on top of the series' defaults.

    Note: an override field is only treated as "set" when it's non-null, so
    there's no way to override course_id to explicitly "no course" on a
    single occurrence when the series has one - an accepted limitation
    rather than adding a separate per-field "is set" bitmask.
    """
    duration = (event.end_at - event.start_at) if event.end_at else None
    start_at = datetime.combine(occurrence_date, event.start_at.time())
    end_at = (start_at + duration) if duration else None

    title = event.title
    description = event.description
    location = event.location
    all_day = event.all_day
    color = event.color
    course_id = event.course_id

    if override is not None:
        title = override.title if override.title is not None else title
        description = override.description if override.description is not None else description
        location = override.location if override.location is not None else location
        all_day = override.all_day if override.all_day is not None else all_day
        color = override.color if override.color is not None else color
        course_id = override.course_id if override.course_id is not None else course_id
        start_at = override.start_at if override.start_at is not None else start_at
        end_at = override.end_at if override.end_at is not None else end_at

    return CalendarEventResponse(
        id=f"{event.id}::{occurrence_date.isoformat()}",
        series_id=event.id,
        is_recurring=True,
        occurrence_date=occurrence_date,
        title=title,
        description=description,
        location=location,
        start_at=start_at,
        end_at=end_at,
        all_day=all_day,
        color=color,
        course_id=course_id,
        recurrence=event.recurrence,
        user_id=event.user_id,
        created_at=event.created_at,
        updated_at=event.updated_at,
    )


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
    apply_recurrence(event, event_data.recurrence)

    db.add(event)
    db.commit()
    db.refresh(event)

    return serialize_event(event)


@router.get("", response_model=list[CalendarEventResponse])
def get_calendar_events(
    start: date | None = None,
    end: date | None = None,
    course_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(CalendarEvent).filter(CalendarEvent.user_id == current_user.id)

    if course_id is not None:
        query = query.filter(CalendarEvent.course_id == course_id)

    if start is None or end is None:
        # No bounded window to expand recurrences against - just return the
        # series rows as-is (used by callers that want the raw event list).
        if start is not None:
            query = query.filter(CalendarEvent.start_at >= datetime.combine(start, time.min))
        if end is not None:
            query = query.filter(CalendarEvent.start_at <= datetime.combine(end, time.max))
        return [serialize_event(event) for event in query.order_by(CalendarEvent.start_at.asc()).all()]

    # Bounded window: plain events by their own start_at, recurring series
    # expanded into occurrences that fall in [start, end].
    plain_events = query.filter(
        CalendarEvent.recurrence_frequency.is_(None),
        CalendarEvent.start_at >= datetime.combine(start, time.min),
        CalendarEvent.start_at <= datetime.combine(end, time.max),
    ).all()

    recurring_events = query.filter(
        CalendarEvent.recurrence_frequency.isnot(None),
        CalendarEvent.start_at <= datetime.combine(end, time.max),
    ).all()

    results = [serialize_event(event) for event in plain_events]

    if recurring_events:
        overrides_by_event = {}
        overrides = (
            db.query(CalendarEventOverride)
            .filter(
                CalendarEventOverride.event_id.in_([e.id for e in recurring_events]),
                CalendarEventOverride.occurrence_date >= start,
                CalendarEventOverride.occurrence_date <= end,
            )
            .all()
        )
        for override in overrides:
            overrides_by_event.setdefault(override.event_id, {})[override.occurrence_date] = override

        for event in recurring_events:
            event_overrides = overrides_by_event.get(event.id, {})
            for occ_date in occurrence_dates(
                event.start_at.date(),
                event.recurrence_frequency,
                event.recurrence_interval,
                event.recurrence_days_of_week,
                event.recurrence_end_date,
                start,
                end,
            ):
                override = event_overrides.get(occ_date)
                if override is not None and override.is_cancelled:
                    continue
                results.append(serialize_occurrence(event, occ_date, override))

    results.sort(key=lambda item: item.start_at)
    return results


@router.get("/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_owned_event(event_id, db, current_user.id)
    return serialize_event(event)


@router.patch("/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: UUID,
    event_data: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_owned_event(event_id, db, current_user.id)

    update_data = event_data.model_dump(exclude_unset=True)
    recurrence_set = "recurrence" in update_data
    recurrence_value = update_data.pop("recurrence", None)

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

    if recurrence_set:
        apply_recurrence(event, event_data.recurrence if recurrence_value is not None else None)

    db.commit()
    db.refresh(event)

    return serialize_event(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calendar_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = get_owned_event(event_id, db, current_user.id)

    db.delete(event)
    db.commit()


def get_override_or_404(
    event_id: UUID,
    occurrence_date: date,
    db: Session,
    current_user: User,
) -> tuple[CalendarEvent, CalendarEventOverride | None]:
    event = get_owned_event(event_id, db, current_user.id)

    if not is_valid_occurrence(event, occurrence_date):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This date is not an occurrence of this recurring event",
        )

    override = (
        db.query(CalendarEventOverride)
        .filter(
            CalendarEventOverride.event_id == event_id,
            CalendarEventOverride.occurrence_date == occurrence_date,
        )
        .first()
    )
    return event, override


@router.patch(
    "/{event_id}/occurrences/{occurrence_date}",
    response_model=CalendarEventResponse,
)
def update_calendar_event_occurrence(
    event_id: UUID,
    occurrence_date: date,
    occurrence_data: CalendarEventOccurrenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event, override = get_override_or_404(event_id, occurrence_date, db, current_user)

    update_data = occurrence_data.model_dump(exclude_unset=True)

    if "course_id" in update_data:
        validate_course_ownership(update_data["course_id"], db, current_user.id)

    if override is None:
        override = CalendarEventOverride(event_id=event_id, occurrence_date=occurrence_date)
        db.add(override)

    for field, value in update_data.items():
        setattr(override, field, value)

    db.commit()
    db.refresh(event)
    db.refresh(override)

    return serialize_occurrence(event, occurrence_date, override)


@router.delete(
    "/{event_id}/occurrences/{occurrence_date}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_calendar_event_occurrence(
    event_id: UUID,
    occurrence_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event, override = get_override_or_404(event_id, occurrence_date, db, current_user)

    if override is None:
        override = CalendarEventOverride(event_id=event_id, occurrence_date=occurrence_date)
        db.add(override)

    override.is_cancelled = True
    db.commit()
