from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


def _validate_positive_minutes(v: int) -> int:
    if v <= 0:
        raise ValueError("Estimated minutes must be positive")
    return v


class AssignmentSubtaskCreate(BaseModel):
    title: str
    estimated_minutes: int
    scheduled_date: date | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        value = v.strip()
        if not value:
            raise ValueError("Title must not be blank or whitespace-only")
        return value

    @field_validator("estimated_minutes")
    @classmethod
    def estimated_minutes_must_be_positive(cls, v: int) -> int:
        return _validate_positive_minutes(v)


class AssignmentSubtaskUpdate(BaseModel):
    title: str | None = None
    estimated_minutes: int | None = None
    order_index: int | None = None
    scheduled_date: date | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str | None) -> str | None:
        if v is not None:
            value = v.strip()
            if not value:
                raise ValueError("Title must not be blank or whitespace-only")
            return value
        return v

    @field_validator("estimated_minutes")
    @classmethod
    def estimated_minutes_must_be_positive(cls, v: int | None) -> int | None:
        if v is not None:
            return _validate_positive_minutes(v)
        return v


class SubtaskCompletionUpdate(BaseModel):
    is_completed: bool
    actual_minutes: int | None = None

    @field_validator("actual_minutes")
    @classmethod
    def actual_minutes_must_be_positive(cls, v: int | None) -> int | None:
        if v is not None:
            return _validate_positive_minutes(v)
        return v


class AssignmentSubtaskResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    title: str
    estimated_minutes: int
    order_index: int
    scheduled_date: date | None
    is_completed: bool
    completed_at: datetime | None
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class AcceptSubtasksRequest(BaseModel):
    subtasks: list[AssignmentSubtaskCreate]
