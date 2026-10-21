import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.course import validate_hex_color

DayOfWeek = Literal[
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]


class RecurrenceRule(BaseModel):
    frequency: Literal["daily", "weekly", "monthly"]
    interval: int = Field(default=1, ge=1, le=52)
    days_of_week: list[DayOfWeek] = []
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_days_of_week(self) -> "RecurrenceRule":
        if self.frequency == "weekly":
            if not self.days_of_week:
                raise ValueError("Select at least one day of the week for a weekly recurrence")
        elif self.days_of_week:
            raise ValueError("days_of_week only applies to a weekly recurrence")

        return self


class CalendarEventBase(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    start_at: datetime
    end_at: datetime | None = None
    all_day: bool = False
    color: str | None = None
    course_id: uuid.UUID | None = None
    recurrence: RecurrenceRule | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Title must not be blank or whitespace-only")
        return stripped

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_hex_color(value)

    @model_validator(mode="after")
    def validate_time_range(self) -> "CalendarEventBase":
        if self.end_at and self.end_at < self.start_at:
            raise ValueError("end_at must be on or after start_at")
        return self


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    all_day: bool | None = None
    color: str | None = None
    course_id: uuid.UUID | None = None
    recurrence: RecurrenceRule | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Title must not be blank or whitespace-only")
        return stripped

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_hex_color(value)


# Edits (or cancels) a single occurrence of a recurring series without
# touching the series itself - no `recurrence` field, since recurrence is a
# series-level concept.
class CalendarEventOccurrenceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    all_day: bool | None = None
    color: str | None = None
    course_id: uuid.UUID | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Title must not be blank or whitespace-only")
        return stripped

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_hex_color(value)


class CalendarEventResponse(CalendarEventBase):
    model_config = ConfigDict(from_attributes=True)
    # Opaque UI key: the series' UUID for a plain event or an unexpanded
    # series record, or "<series_id>::<occurrence_date>" for an expanded
    # occurrence. Never parsed by clients - use `series_id`/`occurrence_date`
    # to address series- or occurrence-level endpoints.
    id: str
    series_id: uuid.UUID
    is_recurring: bool = False
    occurrence_date: date | None = None
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
