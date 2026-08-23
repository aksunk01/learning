from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

class AssignmentCreate(BaseModel):
    title: str
    description: str | None = None
    assignment_type: str | None = None
    due_at: datetime | None = None
    points: float | None = None
    weight_percent: float | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        value = v.strip()

        if not value:
            raise ValueError("Title must not be blank or whitespace-only")
        
        return v
    
    @field_validator("points")
    @classmethod
    def points_must_not_be_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("Points must not be negative")
        return v
    
    @field_validator("weight_percent")
    @classmethod
    def weight_percent_must_be_between_0_and_100(cls, v: float | None) -> float | None:
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Weight percent must be between 0 and 100 inclusive")
        return v

    model_config = ConfigDict(
        from_attributes=True
    )


class AssignmentCompletionUpdate(BaseModel):
    is_completed: bool


class AssignmentResponse(BaseModel):
    id: UUID
    course_id: UUID
    material_id: UUID | None

    title: str
    description: str | None
    assignment_type: str | None

    due_at: datetime | None

    points: float | None
    weight_percent: float | None

    source_page: int | None
    source_slide: int | None
    source_section: str | None
    source_chunk_index: int | None

    extraction_metadata: dict | None
    
    is_completed: bool
    completed_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )
