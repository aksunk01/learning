from datetime import datetime

from pydantic import BaseModel, Field


class ExtractedAssignment(BaseModel):
    title: str
    description: str | None = None
    assignment_type: str | None = None

    
    due_date: str | None = None
    due_time: str | None = None

    points: float | None = None
    weight_percent: float | None = None

    raw_due_text: str | None = None

    source_ids: list[int] = Field(default_factory=list)

class AssignmentExtractionResult(BaseModel):
    assignments: list[ExtractedAssignment] = Field(default_factory=list)