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
    score: float
    estimated_minutes: int
    reason: str


class TodayPlanResponse(BaseModel):
    focus_now: list[PlannerItemResponse] = Field(default_factory=list)
    up_next: list[PlannerItemResponse] = Field(default_factory=list)
