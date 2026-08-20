from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

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

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )
