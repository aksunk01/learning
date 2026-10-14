from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PlannerItemResponse(BaseModel):
    assignment_id: UUID
    course_id: UUID
    course_name: str
    title: str
    assignment_type: str | None = None
    due_at: datetime | None = None
    is_overdue: bool
    reason: str


class TodayPlanResponse(BaseModel):
    items: list[PlannerItemResponse] = Field(default_factory=list)
    # True when nothing homework/project is due today, so the list below is
    # the "next up" fallback (one homework, one project, one exam) instead
    # of an actual due-today list.
    is_fallback: bool
